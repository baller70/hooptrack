# KCLOUD egress blocker: Contabo SSH

Status: **blocked at the network gateway.** Not fixable from inside a Cloud
session, and not a credentials problem.

## Ask for whoever administers the egress policy

Allow outbound HTTPS (443) from this environment to:

```
kcloud-contabo-ssh-relay.khouston.workers.dev
```

That host is the SSH-over-WebSocket relay (`scripts/kcloud-websocket-proxy.mjs`)
that carries SSH to Contabo over 443, because raw port 22 is not routable from
Cloud. Allowlisting it is sufficient; direct port 22 access is not required.

## Evidence

Captured from the session's own proxy status endpoint
(`curl -sS "$HTTPS_PROXY/__agentproxy/status"`):

```json
"recentRelayFailures": [
  { "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "kcloud-contabo-ssh-relay.khouston.workers.dev:443" },
  { "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "194.146.12.139:443" }
]
```

Direct SSH, for completeness:

```
ssh: connect to host 194.146.12.139 port 22: Connection timed out
```

So all three routes are closed: port 22 has no route, and both the relay host
and the Contabo IP are refused at 443 by policy.

## Why credentials cannot fix this

The connection is refused before authentication is ever attempted. A private
key only matters once a TCP session exists. While the gateway answers 403,
`CONTABO_SSH_PRIVATE_KEY_B64` changes nothing.

The environment's proxy documentation (`/root/.ccr/README.md`) is explicit that
a 403/407 is an organization egress policy denial and must be reported rather
than routed around.

## Why it works in Codex Cloud

Codex Cloud is a separate product with its own egress policy and allowlist. A
working Contabo setup there does not carry over; the two environments send
traffic through different gateways.

## Known-good state without Contabo

Everything that does not require the production server is verified working:
install, lint, typecheck, unit tests, production build, registration/login with
a real JWT session, SQLite persistence, and generated VAPID keys.

Contabo SSH is only needed for deploys, which per `AGENTS.md` require Kevin's
explicit approval regardless.
