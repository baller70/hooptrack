#!/usr/bin/env bash
# What this environment can actually reach — run this FIRST, before telling
# Kevin that any credential, host or capability is missing.
#
#   bash scripts/env-preflight.sh
#
# Every check is read-only. Nothing is deployed, restarted, written or
# installed. No secret value is ever printed — only whether a name is set.
#
# Why this exists: across several environments the same hour was burned
# rediscovering things that were configured all along, and Kevin was told
# repeatedly that he "didn't have" access he had already set up. He was right
# every time. This script is the answer to "do we have X?" so that question is
# never put to him again.
#
# Hard rule, learned the expensive way: NEVER search the filesystem to find a
# credential. An earlier version of the App Store key lookup ran `find` across
# multi-terabyte external drives and burned an entire 90-minute CI job one line
# into its output. Check explicit paths, or check nothing.
set -uo pipefail

pass=0 fail=0 skip=0
declare -a remedies=()

ok()   { printf '  \033[32mOK\033[0m    %-28s %s\n' "$1" "${2:-}"; pass=$((pass + 1)); }
no()   { printf '  \033[31mMISS\033[0m  %-28s %s\n' "$1" "${2:-}"; fail=$((fail + 1)); remedies+=("$1 — ${3:-see docs/ENVIRONMENT-CONTRACT.md}"); }
na()   { printf '  \033[33mN/A\033[0m   %-28s %s\n' "$1" "${2:-}"; skip=$((skip + 1)); }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# `set` rather than the value: this prints what is configured, never what it is.
is_set() { [ -n "${!1:-}" ]; }

# ------------------------------------------------------------------ identity --

head_ 'Repository'
if git rev-parse --git-dir >/dev/null 2>&1; then
  ok 'git checkout' "$(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
  origin="$(git remote get-url origin 2>/dev/null || echo '(none)')"
  case "$origin" in
    *baller70/hooptrack*) ok 'origin remote' 'baller70/hooptrack' ;;
    *) no 'origin remote' "$origin" 'expected baller70/hooptrack' ;;
  esac
  if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
    ok 'working tree' 'clean'
  else
    na 'working tree' "$(git status --porcelain | grep -c .) file(s) modified"
  fi
else
  no 'git checkout' 'not a git repository' 'run from the repo root'
fi

# -------------------------------------------------------------------- runtime --

head_ 'Runtime'
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$node_major" -ge 22 ] 2>/dev/null; then
    ok 'node' "$(node -v)"
  else
    no 'node' "$(node -v) — README wants 22.x" 'install Node 22'
  fi
else
  no 'node' 'not on PATH' 'install Node 22'
fi
command -v npm >/dev/null 2>&1 && ok 'npm' "$(npm -v)" || no 'npm' 'not on PATH' 'install npm 10.x'
[ -d node_modules ] && ok 'node_modules' 'installed' || no 'node_modules' 'absent' 'run: npm install'
# NODE_ENV=development in the shell makes every production build die in
# prerender with "Cannot read properties of null (reading 'useContext')".
# It is environmental, not a repo bug. See AGENTS.md.
case "${NODE_ENV:-}" in
  production) ok 'NODE_ENV' 'production' ;;
  '')         ok 'NODE_ENV' 'unset (fine — pass it on the build command)' ;;
  *)          na 'NODE_ENV' "${NODE_ENV} — prefix builds with NODE_ENV=production" ;;
esac

# --------------------------------------------------------------------- github --

head_ 'GitHub'
is_set GITHUB_TOKEN && ok 'GITHUB_TOKEN' 'set' || na 'GITHUB_TOKEN' 'unset (MCP tools may still work)'
if git ls-remote --exit-code origin HEAD >/dev/null 2>&1; then
  ok 'origin reachable' 'fetch works'
else
  no 'origin reachable' 'git ls-remote failed' 'check network/credentials'
fi

# -------------------------------------------------------------------- contabo --

head_ 'Contabo (production host)'
is_set CONTABO_HOST && ok 'CONTABO_HOST' 'set' || na 'CONTABO_HOST' 'unset'

if is_set KC_FULL_BRIDGE_URL && is_set KC_FULL_BRIDGE_TOKEN; then
  ok 'exec bridge vars' 'KC_FULL_BRIDGE_URL + KC_FULL_BRIDGE_TOKEN set'
  # A trivial command proves the bridge round-trips without touching anything.
  probe="$(curl -sS -m 25 -X POST "$KC_FULL_BRIDGE_URL" \
    -H "Authorization: Bearer ${KC_FULL_BRIDGE_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"command":"hostname; id -un"}' 2>/dev/null \
    | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(" ".join(d.get("stdout","").split()) or "(no output)")
except Exception:
    print("UNPARSEABLE")' 2>/dev/null)"
  case "$probe" in
    ''|UNPARSEABLE) no 'exec bridge reachable' 'no usable response' 'check bridge process on the host' ;;
    *) ok 'exec bridge reachable' "$probe" ;;
  esac
else
  no 'exec bridge vars' 'KC_FULL_BRIDGE_URL / KC_FULL_BRIDGE_TOKEN unset' \
     'set both as environment secrets — this is the primary path to the host'
fi

if is_set CONTABO_SSH_PRIVATE_KEY_B64; then
  ok 'CONTABO_SSH_PRIVATE_KEY_B64' 'set — run scripts/kcloud-contabo-ssh-setup.sh'
else
  na 'CONTABO_SSH_PRIVATE_KEY_B64' 'unset (the exec bridge covers most needs)'
fi

# ------------------------------------------------------------------ live site --

head_ 'Live application'
site="${HOOPTRACK_PUBLIC_URL:-https://hooptrack.194-146-12-139.sslip.io}"
code="$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "${site}/login" 2>/dev/null || echo 000)"
case "$code" in
  200) ok 'public site' "${site} → 200" ;;
  000) no 'public site' "${site} unreachable" 'check outbound network / host is up' ;;
  *)   no 'public site' "${site} → HTTP ${code}" 'check PM2 process hooptrack on the host' ;;
esac

# --------------------------------------------------------------- app store --

head_ 'App Store Connect'
# The key lives on Kevin's Mac, not in Cloud containers. appfactory-credentials.sh
# checks an explicit list of App Factory locations — it must never search.
if [ -f scripts/appfactory-credentials.sh ]; then
  creds="$(mktemp)"
  bash scripts/appfactory-credentials.sh "$creds" >/dev/null 2>&1 || true
  if [ -s "$creds" ]; then
    ok 'ASC key' 'found via scripts/appfactory-credentials.sh'
  else
    na 'ASC key' 'not on this machine (expected off-Mac — Xcode work runs on the Mac runner)'
  fi
  rm -f "$creds"
else
  no 'appfactory-credentials.sh' 'missing' 'restore scripts/appfactory-credentials.sh'
fi

# ------------------------------------------------------- xcode / device (mac) --

head_ 'Xcode toolchain and device'
if [ "$(uname -s)" != 'Darwin' ]; then
  na 'Xcode toolchain' 'not macOS — archive, signing and device installs run on the Mac runner'
  na 'iPhone' 'not visible from here — use a devices/** branch on the broker repo'
else
  if command -v xcodebuild >/dev/null 2>&1; then
    ok 'xcodebuild' "$(xcodebuild -version 2>/dev/null | head -1)"
  else
    no 'xcodebuild' 'not on PATH' 'install Xcode and run xcode-select --switch'
  fi

  # Counts only. Certificate common names carry the team identity, so they are
  # not printed.
  ident_total="$(security find-identity -v -p codesigning 2>/dev/null | grep -c ')' || echo 0)"
  if [ "$ident_total" -gt 0 ] 2>/dev/null; then
    if security find-identity -v -p codesigning 2>/dev/null | grep -q 'Apple Distribution'; then
      ok 'signing identities' "${ident_total} visible, including Apple Distribution"
    else
      # Not a failure: appstore-release.sh archives unsigned and signs at
      # export precisely because this is the normal state on the runner.
      na 'signing identities' "${ident_total} visible, no Apple Distribution — archive unsigned, sign at export"
    fi
  else
    na 'signing identities' 'none visible — xcodebuild will mint one via the API key'
  fi

  # The private keys the App Store scripts stage for altool.
  key_count="$(find "${HOME}/.appstoreconnect/private_keys" -maxdepth 1 -name 'AuthKey_*.p8' 2>/dev/null | grep -c . || echo 0)"
  if [ "$key_count" -gt 0 ] 2>/dev/null; then
    ok 'staged ASC keys' "${key_count} in ~/.appstoreconnect/private_keys"
  else
    na 'staged ASC keys' 'none staged yet (appstore-release.sh stages one on demand)'
  fi

  if command -v xcrun >/dev/null 2>&1; then
    dev_json="$(mktemp)"
    if xcrun devicectl list devices --json-output "$dev_json" >/dev/null 2>&1; then
      dev_summary="$(python3 -c '
import json, sys
devices = json.load(open(sys.argv[1])).get("result", {}).get("devices", [])
if not devices:
    print("none paired")
else:
    parts = []
    for d in devices:
        name = (d.get("deviceProperties") or {}).get("name", "?")
        state = (d.get("connectionProperties") or {}).get("tunnelState", "?")
        parts.append("%s (%s)" % (name, state))
    print(", ".join(parts[:3]))
' "$dev_json" 2>/dev/null)"
      case "$dev_summary" in
        ''|'none paired') na 'iPhone' 'none paired — pair it in Xcode, unlock, tap Trust' ;;
        # tunnelState describes a network tunnel, not installability: a
        # USB-attached phone can read "disconnected" and install fine.
        *) ok 'iPhone' "$dev_summary" ;;
      esac
    else
      no 'devicectl' 'could not list devices' 'check Xcode command line tools'
    fi
    rm -f "$dev_json"
  fi
fi

# ------------------------------------------------------------------- summary --

head_ 'Summary'
printf '  %d ok, %d missing, %d not applicable\n' "$pass" "$fail" "$skip"
if [ "${#remedies[@]}" -gt 0 ]; then
  printf '\n\033[1mNeeds attention\033[0m\n'
  for line in "${remedies[@]}"; do printf '  - %s\n' "$line"; done
fi
printf '\nCapability map and known traps: docs/ENVIRONMENT-CONTRACT.md\n'

# Exit 0 regardless. This is a report, not a gate — a missing optional
# capability should not fail a CI step that does not need it.
exit 0
