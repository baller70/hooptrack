#!/usr/bin/env bash
# Build both apps for a physical iPhone and install them straight onto it.
#
#   ./scripts/install-on-device.sh                 # both apps, first available device
#   ./scripts/install-on-device.sh coach           # one app
#   DEVICE_UDID=00008030-... ./scripts/install-on-device.sh
#
# This is not the App Store path. An app-store-signed IPA cannot be installed
# on a device directly, so this builds Debug with a *development* identity that
# xcodebuild creates on demand through the App Store Connect key, and hands the
# result to devicectl. It never touches the archive, the upload, or anything in
# review.
set -Eeuo pipefail

die() { printf 'INSTALL_ERROR: %s\n' "$*" >&2; exit 1; }
note() { printf '  %s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

team_id="DD9G8RP575"
derived_data="${HOME}/Library/Developer/Xcode/DerivedData/hooptrack-device"

requested="${1:-both}"
case "$requested" in
  coach)  apps=(coach) ;;
  player) apps=(player) ;;
  both)   apps=(coach player) ;;
  *) die "app must be coach, player, or both (got '$requested')" ;;
esac

# ---------------------------------------------------------------- the device --

step 'Finding the device'
devices_json="$(mktemp)"
trap 'rm -f "$devices_json"' EXIT
xcrun devicectl list devices --json-output "$devices_json" >/dev/null 2>&1 \
  || die 'devicectl could not list devices'

read -r device_id device_udid device_name device_state <<<"$(
  DEVICE_UDID="${DEVICE_UDID:-}" python3 - "$devices_json" <<'PY'
import json, os, sys

wanted = os.environ.get('DEVICE_UDID', '').strip()
devices = json.load(open(sys.argv[1])).get('result', {}).get('devices', [])

def udid_of(d):
    return (d.get('hardwareProperties', {}) or {}).get('udid', '')

def name_of(d):
    return (d.get('deviceProperties', {}) or {}).get('name', '?')

def state_of(d):
    return (d.get('connectionProperties', {}) or {}).get('tunnelState', '?')

# An iPhone that is merely paired is not installable; it has to be connected.
def usable(d):
    return state_of(d) not in ('unavailable', 'disconnected', '?')

candidates = [d for d in devices if not wanted or udid_of(d) == wanted]
usable_ones = [d for d in candidates if usable(d)]
chosen = (usable_ones or candidates or [None])[0]

if chosen is None:
    print('  ')
else:
    print(' '.join([
        chosen.get('identifier', ''),
        udid_of(chosen) or '-',
        name_of(chosen).replace(' ', '_'),
        state_of(chosen),
    ]))
PY
)"

[ -n "${device_id:-}" ] || die 'no paired iPhone at all — pair it with the Mac in Xcode first'
note "Device: ${device_name//_/ } (${device_udid})"
note "Connection state: ${device_state}"

case "$device_state" in
  unavailable|disconnected|'?')
    die "the phone is paired but not reachable (state: ${device_state}).
    Plug it into this Mac over USB, unlock it, and tap Trust if asked — or put it
    on the same Wi-Fi with the screen on. Nothing can be pushed to a sleeping or
    disconnected device." ;;
esac

# ------------------------------------------------------------- credentials --

if [ -f "${repo_root}/scripts/appfactory-credentials.sh" ] && [ -z "${ASC_KEY_ID:-}" ]; then
  creds="$(mktemp)"
  bash "${repo_root}/scripts/appfactory-credentials.sh" "$creds" || true
  if [ -s "$creds" ]; then
    # shellcheck disable=SC1090
    . "$creds"
    note 'Using the App Store Connect key already on this Mac.'
  fi
  rm -f "$creds"
fi

auth_args=()
if [ -n "${ASC_KEY_ID:-}" ] && [ -n "${ASC_ISSUER_ID:-}" ] && [ -n "${ASC_KEY_PATH:-}" ] && [ -f "${ASC_KEY_PATH}" ]; then
  auth_args=(
    -authenticationKeyID "$ASC_KEY_ID"
    -authenticationKeyIssuerID "$ASC_ISSUER_ID"
    -authenticationKeyPath "$ASC_KEY_PATH"
  )
fi

# ------------------------------------------------------------------ install --

for app in "${apps[@]}"; do
  case "$app" in
    coach)  scheme=HooptrackCoach;  project=HooptrackCoach.xcodeproj ;;
    player) scheme=HooptrackPlayer; project=HooptrackPlayer.xcodeproj ;;
  esac

  step "Building ${scheme} for the device"
  # Debug, and signed with a development identity xcodebuild is allowed to
  # create — the distribution identity used for the store cannot install here.
  xcodebuild build \
    -project "$project" \
    -scheme "$scheme" \
    -configuration Debug \
    -destination "platform=iOS,id=${device_udid}" \
    -derivedDataPath "$derived_data" \
    -allowProvisioningUpdates \
    "${auth_args[@]+"${auth_args[@]}"}" \
    DEVELOPMENT_TEAM="$team_id"

  app_path="${derived_data}/Build/Products/Debug-iphoneos/${scheme}.app"
  [ -d "$app_path" ] || die "no ${scheme}.app at ${app_path}"
  note "Built: ${app_path}"

  step "Installing ${scheme} onto ${device_name//_/ }"
  xcrun devicectl device install app --device "$device_id" "$app_path"
  note "${scheme} is on the phone."
done

step "Done — ${requested} installed on ${device_name//_/ }"
note 'The apps are on the home screen. They point at the live backend, same as'
note 'the build in review.'
