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
    # "available (paired)" is installable. Only treat an explicit unavailable
    # or disconnected as unusable, and even then only for ranking.
    return not state_of(d).startswith(('unavailable', 'disconnected'))

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

# Do not refuse on the reported state. devicectl's tunnelState says whether a
# network tunnel is up, which is not the same question as "can this be
# installed" — a USB-attached phone can read as disconnected and install fine.
# An earlier version treated that as fatal and skipped an install that might
# have worked. Warn, then let devicectl be the judge.
case "$device_state" in
  unavailable|disconnected|'?')
    note "WARNING: reported state is '${device_state}'. Trying anyway —"
    note "         if this fails, plug the phone into this Mac, unlock it, and"
    note "         tap Trust." ;;
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

# ------------------------------------------------------------- keychain --
#
# A device build signs with an Apple *Development* identity, and the only one
# on this Mac sits in login.keychain — which a runner with no GUI session
# cannot unlock, so codesign dies with errSecInternalComponent after the app
# has already compiled. The App Store path solved this by building inside a
# throwaway unlocked keychain; the device path needs the same treatment, or
# -allowProvisioningUpdates mints a development certificate whose private key
# lands somewhere unreadable.
signing_keychain=""
original_keychains=""
original_default=""

# One EXIT trap for everything: a second `trap ... EXIT` silently replaces the
# first, which would leak the temp file above.
cleanup() {
  rm -f "$devices_json"
  [ -n "$original_default" ] && security default-keychain -d user -s "$original_default" 2>/dev/null || true
  if [ -n "$original_keychains" ]; then
    # shellcheck disable=SC2086
    security list-keychains -d user -s $original_keychains 2>/dev/null || true
  fi
  [ -n "$signing_keychain" ] && security delete-keychain "$signing_keychain" 2>/dev/null || true
}
trap cleanup EXIT

# Always. The previous version only did this when no identity was visible, but
# an identity being *visible* is not the problem — the Apple Development one in
# login.keychain is perfectly visible and perfectly unusable, because its
# private key cannot be unlocked without a GUI session.
if true; then
  step 'Preparing a keychain codesign can actually use'

  signing_keychain="$(mktemp -d)/device-signing.keychain-db"
  signing_password="$(openssl rand -base64 24)"

  original_keychains=""
  while IFS= read -r kc; do
    kc="${kc#"${kc%%[![:space:]]*}"}"; kc="${kc%\"}"; kc="${kc#\"}"
    [ -n "$kc" ] && [ -e "$kc" ] && original_keychains="${original_keychains}${kc} "
  done < <(security list-keychains -d user)
  original_default="$(security default-keychain -d user | sed -e 's/^[[:space:]]*//' -e 's/"//g')"
  [ -e "$original_default" ] || original_default="${HOME}/Library/Keychains/login.keychain-db"

  security create-keychain -p "$signing_password" "$signing_keychain"
  security set-keychain-settings -lut 21600 "$signing_keychain"
  security unlock-keychain -p "$signing_password" "$signing_keychain"
  # The throwaway keychain must be the ONLY one on the search path. Leaving
  # login.keychain listed lets automatic signing keep picking the Apple
  # Development identity inside it — which is exactly what happened last run,
  # and no amount of making this keychain "default" changed that. With nothing
  # else visible, xcodebuild has to create a development certificate here.
  security list-keychains -d user -s "$signing_keychain"
  security default-keychain -d user -s "$signing_keychain"
  security set-key-partition-list -S apple-tool:,apple:,codesign: \
    -k "$signing_password" "$signing_keychain" >/dev/null 2>&1 || true
  unset signing_password

  note "Signing into ${signing_keychain}"
  note 'xcodebuild will create a development certificate here through the API key.'
fi

# ------------------------------------------------------------------ install --

for app in "${apps[@]}"; do
  case "$app" in
    coach)  scheme=HooptrackCoach;  project=HooptrackCoach.xcodeproj ;;
    player) scheme=HooptrackPlayer; project=HooptrackPlayer.xcodeproj ;;
  esac

  step "Destinations this project can actually target"
  # Ask the real project. An earlier version asked xcodebuild about /dev/null,
  # which errors out and lists nothing — that is not evidence of a missing
  # device, and it wasted a round of debugging.
  xcodebuild -showdestinations -project "$project" -scheme "$scheme" 2>&1 \
    | sed -n '/Available destinations/,/^$/p' | head -12 || true

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
