import { createHash, randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

const bridgeUrl = new URL(
  process.env.KCLOUD_SSH_BRIDGE_URL ||
    "wss://kcloud-contabo-ssh-relay.khouston.workers.dev",
);
const encodedSshKey = process.env.CONTABO_SSH_PRIVATE_KEY_B64?.replace(/\s+/g, "");
const bridgeProtocol =
  process.env.KCLOUD_SSH_BRIDGE_PROTOCOL ||
  (encodedSshKey
    ? `kcloud-${createHash("sha256").update(encodedSshKey).digest("hex")}`
    : "");

if (bridgeUrl.protocol !== "wss:" || !bridgeProtocol) {
  process.stderr.write(
    "KCLOUD SSH bridge is missing a valid URL or Contabo key-derived protocol.\n",
  );
  process.exit(20);
}

let transport;
let frameBuffer = Buffer.alloc(0);
let finished = false;
let connected = false;
const debug = process.env.KCLOUD_SSH_BRIDGE_DEBUG === "1";

function debugLog(message) {
  if (debug) process.stderr.write(`[kcloud-bridge] ${message}\n`);
}

function finish(code, message) {
  if (finished) return;
  finished = true;
  process.stdin.pause();
  if (message) process.stderr.write(`${message}\n`);
  process.exitCode = code;
}

function waitForConnection(socket, eventName) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      socket.off(eventName, onReady);
      reject(error);
    };
    const onReady = () => {
      socket.off("error", onError);
      resolve();
    };
    socket.once("error", onError);
    socket.once(eventName, onReady);
  });
}

function readHttpHeaders(socket) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const boundary = buffer.indexOf("\r\n\r\n");
      if (boundary === -1) return;
      cleanup();
      resolve({
        headers: buffer.subarray(0, boundary + 4).toString("latin1"),
        remainder: buffer.subarray(boundary + 4),
      });
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

async function openProxySocket(proxyUrl) {
  const proxyPort = Number(proxyUrl.port || (proxyUrl.protocol === "https:" ? 443 : 80));
  const socket =
    proxyUrl.protocol === "https:"
      ? tls.connect({ host: proxyUrl.hostname, port: proxyPort, servername: proxyUrl.hostname })
      : net.connect({ host: proxyUrl.hostname, port: proxyPort });
  await waitForConnection(socket, proxyUrl.protocol === "https:" ? "secureConnect" : "connect");

  const authorization =
    proxyUrl.username || proxyUrl.password
      ? `Proxy-Authorization: Basic ${Buffer.from(
          `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`,
        ).toString("base64")}\r\n`
      : "";
  socket.write(
    `CONNECT ${bridgeUrl.hostname}:443 HTTP/1.1\r\n` +
      `Host: ${bridgeUrl.hostname}:443\r\n` +
      authorization +
      "Connection: keep-alive\r\n\r\n",
  );

  const response = await readHttpHeaders(socket);
  if (!/^HTTP\/1\.[01] 200\b/m.test(response.headers)) {
    socket.destroy();
    throw new Error("KCLOUD proxy CONNECT was rejected");
  }

  return socket;
}

async function openTlsTransport() {
  const proxyValue =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyValue) {
    const socket = tls.connect({ host: bridgeUrl.hostname, port: 443, servername: bridgeUrl.hostname });
    await waitForConnection(socket, "secureConnect");
    return socket;
  }

  const proxySocket = await openProxySocket(new URL(proxyValue));
  const socket = tls.connect({ socket: proxySocket, servername: bridgeUrl.hostname });
  await waitForConnection(socket, "secureConnect");
  return socket;
}

function encodeFrame(payload, opcode = 0x2) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const mask = randomBytes(4);
  let header;

  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, 0x80 | data.length]);
  } else if (data.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  const masked = Buffer.allocUnsafe(data.length);
  for (let index = 0; index < data.length; index += 1) {
    masked[index] = data[index] ^ mask[index % 4];
  }
  return Buffer.concat([header, mask, masked]);
}

function sendFrame(payload, opcode = 0x2) {
  if (!transport || transport.destroyed) return false;
  debugLog(`sending opcode=${opcode} bytes=${payload.length}`);
  return transport.write(encodeFrame(payload, opcode));
}

function consumeFrames(chunk) {
  frameBuffer = Buffer.concat([frameBuffer, chunk]);

  while (frameBuffer.length >= 2) {
    const opcode = frameBuffer[0] & 0x0f;
    const masked = Boolean(frameBuffer[1] & 0x80);
    let payloadLength = frameBuffer[1] & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
      if (frameBuffer.length < 4) return;
      payloadLength = frameBuffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      if (frameBuffer.length < 10) return;
      const largeLength = frameBuffer.readBigUInt64BE(2);
      if (largeLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("KCLOUD SSH bridge frame is too large");
      }
      payloadLength = Number(largeLength);
      offset = 10;
    }

    const maskOffset = offset;
    if (masked) offset += 4;
    if (frameBuffer.length < offset + payloadLength) return;

    const payload = Buffer.from(frameBuffer.subarray(offset, offset + payloadLength));
    if (masked) {
      const mask = frameBuffer.subarray(maskOffset, maskOffset + 4);
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }
    frameBuffer = frameBuffer.subarray(offset + payloadLength);
    debugLog(`received opcode=${opcode} bytes=${payload.length}`);

    if (opcode === 0x1 || opcode === 0x2 || opcode === 0x0) {
      process.stdout.write(payload);
    } else if (opcode === 0x8) {
      sendFrame(payload, 0x8);
      transport.end();
      finish(0);
      return;
    } else if (opcode === 0x9) {
      sendFrame(payload, 0x0a);
    }
  }
}

async function connectBridge() {
  transport = await openTlsTransport();
  transport.setNoDelay(true);

  const websocketKey = randomBytes(16).toString("base64");
  const requestPath = `${bridgeUrl.pathname || "/"}${bridgeUrl.search}`;
  transport.write(
    `GET ${requestPath} HTTP/1.1\r\n` +
      `Host: ${bridgeUrl.host}\r\n` +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Key: ${websocketKey}\r\n` +
      "Sec-WebSocket-Version: 13\r\n" +
      `Sec-WebSocket-Protocol: ${bridgeProtocol}\r\n\r\n`,
  );

  const response = await readHttpHeaders(transport);
  const expectedAccept = createHash("sha1")
    .update(`${websocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  if (
    !/^HTTP\/1\.[01] 101\b/m.test(response.headers) ||
    !response.headers.toLowerCase().includes(`sec-websocket-accept: ${expectedAccept.toLowerCase()}`)
  ) {
    throw new Error("KCLOUD SSH bridge WebSocket upgrade failed");
  }

  connected = true;
  debugLog("websocket connected");
  transport.on("data", consumeFrames);
  transport.on("drain", () => process.stdin.resume());
  transport.on("end", () => finish(connected ? 0 : 30));
  transport.on("error", () => finish(30, "KCLOUD SSH bridge transport failed."));
  if (response.remainder.length) consumeFrames(response.remainder);

  process.stdin.on("data", (chunk) => {
    debugLog(`stdin bytes=${chunk.length}`);
    if (!sendFrame(chunk)) process.stdin.pause();
  });
  process.stdin.on("end", () => {
    sendFrame(Buffer.alloc(0), 0x8);
    transport.end();
  });
  process.stdin.resume();
}

connectBridge().catch(() => finish(30, "KCLOUD SSH bridge connection failed."));

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    sendFrame(Buffer.alloc(0), 0x8);
    transport?.destroy();
    finish(128);
  });
}
