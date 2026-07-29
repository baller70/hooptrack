#!/usr/bin/env bash
# Recover the App Store Connect API credentials already present on this Mac.
#
# Kevin's App Factory signs and uploads with:
#
#   xcodebuild -allowProvisioningUpdates \
#     -authenticationKeyPath     "$ASC_KEY_PATH" \
#     -authenticationKeyID       "$ASC_KEY_ID" \
#     -authenticationKeyIssuerID "$ASC_ISSUER_ID"
#
# and reads those three out of its worker/worker.env. Same Apple account, same
# team, same machine — so the release lane reuses that key instead of asking
# for a new one.
#
# Usage:  appfactory-credentials.sh <output-file>
#
# Writes sourceable `export` lines to <output-file> (mode 600) and prints only
# non-secret diagnostics. Key material is never echoed; on GitHub Actions the
# ids are registered with ::add-mask:: before anything else is printed.
#
# Exit 0 with an empty output file when nothing is found — the caller decides
# whether that is fatal.
#
# This checks an explicit list of paths and never searches the filesystem. An
# earlier version ran `find -maxdepth 6` across /Volumes/APPLICATIONS and $HOME;
# those are multi-terabyte external drives holding backup archives, and it spent
# 89 minutes inside the first `find` before the job's 90-minute timeout killed
# it. Discovery has to be instant or it is worse than useless. To teach it a new
# location, add the path to app_factory_roots below.

set -uo pipefail

out="${1:?usage: appfactory-credentials.sh <output-file>}"
: >"$out"
chmod 600 "$out"

mask() { [ -n "${1:-}" ] && printf '::add-mask::%s\n' "$1"; }

# Every App Factory checkout seen on this Mac. `[ -f ]` on a miss costs
# nothing, so listing generously is free.
app_factory_roots=(
  "/Volumes/APPLICATIONS/00_APPS_I_CREATED/00_ACTIVE_WORKSPACE/External File Configuration/ACTIVE APPS TO COMPLETE/app-factory-standalone"
  "/Volumes/APPLICATIONS/02_STORAGE_AND_RUNTIME/CodexStorage/projects/app-factory-standalone"
  "/Volumes/APPLICATIONS/02_STORAGE_AND_RUNTIME/CodexStorage/projects/codex-cloud-apps/app-factory-standalone"
  "/Volumes/APPLICATIONS/02_STORAGE_AND_RUNTIME/CodexStorage/projects/app-factory-standalone-qa"
  "/Volumes/APPLICATIONS/00_APPS_I_CREATED/00_ACTIVE_WORKSPACE/ACTIVE APPS TO COMPLETE.partial-20260716-143209/app-factory-standalone"
  "/Volumes/APPLICATIONS/03_BACKUPS_ARCHIVES_OFFLOAD/Offload/internal-project-originals/ACTIVE APPS TO COMPLETE.original-20260716-143500/app-factory-standalone"
  "${HOME}/app-factory-standalone-edit"
  "${HOME}/app-factory-page"
  "${HOME}/OpenDesignAppFactoryiOS"
)

echo "--- App Store Connect key discovery ---"

candidates=()
for root in "${app_factory_roots[@]}"; do
  for rel in worker/worker.env worker/.env.local .env.local .env; do
    [ -f "${root}/${rel}" ] && candidates+=("${root}/${rel}")
  done
done

if [ "${#candidates[@]}" -eq 0 ]; then
  echo "  no App Factory env file at any known path"
  exit 0
fi

# Pull one KEY=value out of an env file without sourcing it. These files carry
# unrelated secrets too, and none of those belong in this shell.
read_var() {
  awk -v key="$2" '
    $0 ~ "^[[:space:]]*(export[[:space:]]+)?" key "[[:space:]]*=" {
      sub("^[[:space:]]*(export[[:space:]]+)?" key "[[:space:]]*=[[:space:]]*", "")
      gsub(/^["'"'"']|["'"'"']$/, "")
      sub(/[[:space:]]+$/, "")
      print
      exit
    }' "$1"
}

chosen=""; key_id=""; issuer_id=""; key_path=""; team_id=""

for f in "${candidates[@]}"; do
  k="$(read_var "$f" ASC_KEY_ID)"
  i="$(read_var "$f" ASC_ISSUER_ID)"
  p="$(read_var "$f" ASC_KEY_PATH)"

  d="$(dirname "$f")"

  # ASC_KEY_PATH may be relative to the App Factory checkout.
  if [ -n "$p" ] && [ ! -f "$p" ]; then
    for guess in "${d}/${p}" "${d}/../${p}" "${d}/../../${p}"; do
      if [ -f "$guess" ]; then p="$guess"; break; fi
    done
  fi
  # Or it may be absent, with the key sitting under the conventional name.
  if [ -z "$p" ] && [ -n "$k" ]; then
    for guess in "${d}/AuthKey_${k}.p8" \
                 "${d}/../AuthKey_${k}.p8" \
                 "${d}/private_keys/AuthKey_${k}.p8" \
                 "${d}/../private_keys/AuthKey_${k}.p8" \
                 "${HOME}/.appstoreconnect/private_keys/AuthKey_${k}.p8"; do
      if [ -f "$guess" ]; then p="$guess"; break; fi
    done
  fi

  status="incomplete"
  if [ -n "$k" ] && [ -n "$i" ]; then status="ids-only"; fi
  if [ -n "$k" ] && [ -n "$i" ] && [ -n "$p" ] && [ -f "$p" ]; then status="COMPLETE"; fi
  printf '  %-10s %s\n' "$status" "$f"

  if [ "$status" = "COMPLETE" ] && [ -z "$chosen" ]; then
    chosen="$f"; key_id="$k"; issuer_id="$i"; key_path="$p"
    team_id="$(read_var "$f" APPLE_TEAM_ID)"
  fi
done

# An env file may hold the ids while the .p8 sits under one of the App Factory
# roots rather than beside the env file. Only those roots are checked, one
# directory level each — never a recursive sweep of the volume.
if [ -z "$chosen" ]; then
  for f in "${candidates[@]}"; do
    k="$(read_var "$f" ASC_KEY_ID)"
    i="$(read_var "$f" ASC_ISSUER_ID)"
    if [ -z "$k" ] || [ -z "$i" ]; then continue; fi
    found=""
    for root in "${app_factory_roots[@]}"; do
      for rel in "AuthKey_${k}.p8" "worker/AuthKey_${k}.p8" \
                 "private_keys/AuthKey_${k}.p8" "worker/private_keys/AuthKey_${k}.p8"; do
        if [ -f "${root}/${rel}" ]; then found="${root}/${rel}"; break 2; fi
      done
    done
    if [ -n "$found" ]; then
      echo "  matched a stray key file to the ids in ${f}"
      chosen="$f"; key_id="$k"; issuer_id="$i"; key_path="$found"
      team_id="$(read_var "$f" APPLE_TEAM_ID)"
      break
    fi
  done
fi

if [ -z "$chosen" ]; then
  echo "  App Factory env files exist, but none yielded key id + issuer id + .p8"
  exit 0
fi

mask "$key_id"
mask "$issuer_id"
mask "$team_id"

{
  printf 'export ASC_KEY_ID=%q\n' "$key_id"
  printf 'export ASC_ISSUER_ID=%q\n' "$issuer_id"
  printf 'export ASC_KEY_PATH=%q\n' "$key_path"
  if [ -n "$team_id" ]; then printf 'export APPLE_TEAM_ID=%q\n' "$team_id"; fi
} >"$out"

echo "  source: ${chosen}"
echo "  key id ${#key_id} chars, issuer id ${#issuer_id} chars"
echo "  key file readable: $([ -r "$key_path" ] && echo yes || echo NO)"
echo "  key file size: $(wc -c <"$key_path" | tr -d ' ') bytes"
