import { createHash } from "node:crypto";

const bridgeUrl =
  process.env.KCLOUD_SSH_BRIDGE_URL ||
  "wss://kcloud-contabo-ssh-relay.khouston.workers.dev";
const encodedSshKey = process.env.CONTABO_SSH_PRIVATE_KEY_B64?.replace(/\s+/g, "");
const bridgeProtocol =
  process.env.KCLOUD_SSH_BRIDGE_PROTOCOL ||
  (encodedSshKey
    ? `kcloud-${createHash("sha256").update(encodedSshKey).digest("hex")}`
    : "");

if (!bridgeUrl || !bridgeProtocol) {
  process.stderr.write(
    "KCLOUD SSH bridge is missing its URL or Contabo key-derived protocol.\n",
  );
  process.exit(20);
}

const webSocket = new WebSocket(bridgeUrl, bridgeProtocol);
webSocket.binaryType = "arraybuffer";

let connected = false;
let finished = false;

function finish(code) {
  if (finished) return;
  finished = true;
  process.stdin.pause();
  process.exitCode = code;
}

webSocket.addEventListener("open", () => {
  connected = true;
  process.stdin.on("data", (chunk) => webSocket.send(chunk));
  process.stdin.on("end", () => webSocket.close(1000, "stdin closed"));
  process.stdin.resume();
});

webSocket.addEventListener("message", (event) => {
  process.stdout.write(Buffer.from(event.data));
});

webSocket.addEventListener("close", (event) => {
  if (!connected || (event.code !== 1000 && event.code !== 1005)) {
    process.stderr.write(`KCLOUD SSH bridge closed with code ${event.code}.\n`);
    finish(30);
    return;
  }
  finish(0);
});

webSocket.addEventListener("error", () => {
  process.stderr.write("KCLOUD SSH bridge connection failed.\n");
  finish(30);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    try {
      webSocket.close(1000, signal);
    } finally {
      finish(128);
    }
  });
}
