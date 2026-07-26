#!/usr/bin/env bash
# Paste-ready setup script for a Claude Code / Codex Cloud environment.
#
# Design rule: this script must always exit 0. A non-zero setup script aborts
# session startup, so an unreachable Contabo turns into "no session at all"
# rather than "session without Contabo". Every optional check below is wrapped.
set -uo pipefail

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "=== KCLOUD setup: toolchain ==="
if ! command -v ssh-keygen >/dev/null 2>&1; then
  $SUDO apt-get update -qq >/dev/null 2>&1 || true
  $SUDO apt-get install -y --no-install-recommends openssh-client >/dev/null 2>&1 ||
    echo "WARN: openssh-client install failed; ssh checks will be skipped."
fi
echo "node: $(node -v 2>/dev/null || echo missing)"
echo "npm:  $(npm -v 2>/dev/null || echo missing)"
echo "ssh:  $(command -v ssh || echo missing)"

echo "=== KCLOUD setup: dependencies ==="
# NODE_ENV=production in the image makes npm skip devDependencies, which drops
# tsc/eslint/playwright and breaks lint, typecheck, and test.
if [ -f package.json ]; then
  NODE_ENV=development npm install --include=dev || echo "WARN: npm install failed."
fi

echo "=== KCLOUD setup: local env placeholders ==="
# Throwaway local values so auth and web push work in the container. Real
# secrets belong in Cloud settings, never in Git. .env is gitignored.
if [ -f package.json ] && [ ! -f .env ] && [ -z "${JWT_SECRET:-}" ]; then
  node -e '
    const crypto = require("crypto"), fs = require("fs");
    let vapid = { publicKey: "", privateKey: "" };
    try { vapid = require("web-push").generateVAPIDKeys() } catch {}
    fs.writeFileSync(".env", [
      "NODE_ENV=development",
      "JWT_SECRET=" + crypto.randomBytes(48).toString("base64url"),
      "VAPID_PUBLIC_KEY=" + vapid.publicKey,
      "VAPID_PRIVATE_KEY=" + vapid.privateKey,
      "VAPID_SUBJECT=mailto:notifications@example.test",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapid.publicKey,
      "",
    ].join("\n"));
  ' 2>/dev/null && echo "Wrote local .env placeholders." ||
    echo "WARN: could not generate .env placeholders."
fi

echo "=== KCLOUD setup: Contabo (optional, never fatal) ==="
# Requires egress policy to allow the SSH relay host. Without it the gateway
# answers 403 to CONNECT and no key can help. See KCLOUD-EGRESS-BLOCKER.md.
if [ -x scripts/kcloud-contabo-ssh-setup.sh ] || [ -f scripts/kcloud-contabo-ssh-setup.sh ]; then
  bash scripts/kcloud-contabo-ssh-setup.sh ||
    echo "NOTE: Contabo check failed (expected while egress is blocked). Continuing."
fi

echo "=== KCLOUD setup: complete ==="
exit 0
