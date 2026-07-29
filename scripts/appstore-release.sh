#!/usr/bin/env bash
# Archive, export, validate, and upload the HoopTrack iOS apps to App Store Connect.
#
# Runs on macOS with Xcode installed. Safe to run with the repo living on an
# external drive — the preflight checks the conditions that break Xcode there.
#
#   ./scripts/appstore-release.sh coach preflight
#   ./scripts/appstore-release.sh coach archive --build 6
#   ./scripts/appstore-release.sh player all --build 6
set -Eeuo pipefail

die() {
  printf 'APPSTORE_RELEASE_ERROR: %s\n' "$*" >&2
  exit 1
}

note() { printf '  %s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }

# Cached because every `xcodebuild -version` call is a process launch, and
# because piping it anywhere that closes early aborts it on Xcode 26.
xcodebuild_version_cache=""
xcodebuild_version_line() {
  if [ -z "$xcodebuild_version_cache" ]; then
    xcodebuild_version_cache="$(xcodebuild -version)"
  fi
  printf '%s' "${xcodebuild_version_cache%%$'\n'*}"
}

usage() {
  cat <<'USAGE'
Usage: scripts/appstore-release.sh <app> <stage> [options]

  app     coach | player
  stage   preflight | archive | export | validate | upload | all

Options:
  --build <n>        Build number (CFBundleVersion). Must be higher than the
                     last build uploaded for this marketing version.
  --version <x.y.z>  Marketing version (CFBundleShortVersionString) override.
  --fix-quarantine   Strip com.apple.quarantine from the working tree first.
  --derived <path>   DerivedData location. Defaults to the internal drive.

App Store Connect credentials come from the environment:
  ASC_KEY_ID     App Store Connect API key ID
  ASC_ISSUER_ID  App Store Connect issuer ID
  ASC_KEY_PATH   Path to AuthKey_<ASC_KEY_ID>.p8 (optional). Without it the key
                 must sit where altool looks, e.g. ~/.appstoreconnect/private_keys/

If the environment carries none of these, preflight asks
scripts/appfactory-credentials.sh for the key App Factory already uses on this
Mac. Failing that, the export falls back to destination=upload and Xcode's own
signed-in Apple ID delivers the build — the same path Organizer takes.
USAGE
}

[ $# -ge 1 ] || { usage; exit 2; }

app="${1:-}"; shift || true
stage="${1:-preflight}"; shift || true

case "$app" in
  coach)  scheme="HooptrackCoach";  project="HooptrackCoach.xcodeproj";  bundle_id="com.kevinhouston.hooptrackcoach" ;;
  player) scheme="HooptrackPlayer"; project="HooptrackPlayer.xcodeproj"; bundle_id="com.kevinhouston.hooptrackplayer" ;;
  -h|--help) usage; exit 0 ;;
  *) die "app must be 'coach' or 'player' (got '${app:-}')" ;;
esac

case "$stage" in
  preflight|archive|export|validate|upload|all) ;;
  *) die "stage must be preflight, archive, export, validate, upload, or all" ;;
esac

build_number=""
marketing_version=""
fix_quarantine=0
derived_data="${HOME}/Library/Developer/Xcode/DerivedData/hooptrack-release"

while [ $# -gt 0 ]; do
  case "$1" in
    --build)          build_number="${2:-}"; shift 2 ;;
    --version)        marketing_version="${2:-}"; shift 2 ;;
    --derived)        derived_data="${2:-}"; shift 2 ;;
    --fix-quarantine) fix_quarantine=1; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) die "unknown option '$1'" ;;
  esac
done

[ -z "$build_number" ] || [[ "$build_number" =~ ^[0-9]+$ ]] || die "--build must be an integer"
[ -z "$marketing_version" ] || [[ "$marketing_version" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]] || die "--version must look like 1.2.3"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

team_id="DD9G8RP575"
build_dir="${repo_root}/build/appstore/${app}"
archive_path="${build_dir}/${scheme}.xcarchive"
export_dir="${build_dir}/export"
ipa_path="${export_dir}/${scheme}.ipa"
export_options="${build_dir}/ExportOptions.plist"

# ---------------------------------------------------------------- preflight --

run_preflight() {
  step "Preflight — ${scheme} (${bundle_id})"

  [ "$(uname -s)" = "Darwin" ] || die "this script requires macOS; Xcode does not run on $(uname -s)"

  adopt_appfactory_credentials

  command -v xcodebuild >/dev/null 2>&1 || die "xcodebuild not found — install Xcode and run: sudo xcode-select --switch /Applications/Xcode.app"
  # Never pipe xcodebuild into head: it writes a second line, and on Xcode 26
  # the resulting SIGPIPE surfaces as an uncaught NSFileHandleOperationException
  # that aborts with exit 134. Capture the whole thing and slice it here.
  note "$(xcodebuild_version_line)"

  # Xcode refuses to build from a case-insensitive/permission-less volume, and
  # code signing silently corrupts on exFAT. This is the usual external-drive trap.
  local device fs
  device="$(df -P "$repo_root" | awk 'NR==2 {print $1}')"
  fs="$(diskutil info "$device" 2>/dev/null | awk -F': *' '/File System Personality/ {print $2}' | xargs || true)"
  if [ -n "$fs" ]; then
    note "Volume: ${device} (${fs})"
    case "$fs" in
      *ExFAT*|*exFAT*|*MS-DOS*|*FAT32*)
        die "repo is on ${fs}. Xcode code signing requires POSIX permissions and symlinks.
    Reformat the drive as APFS (or Mac OS Extended, Journaled), or clone the repo
    to the internal drive and build there." ;;
      *APFS*|*Journaled*|*HFS*) note "Filesystem supports code signing." ;;
      *) note "WARNING: unrecognized filesystem '${fs}' — if signing fails, this is the first suspect." ;;
    esac
  fi

  case "$repo_root" in
    /Volumes/*) note "Building from external volume: ${repo_root}"
                note "DerivedData is redirected to the internal drive: ${derived_data}" ;;
  esac

  # Files copied onto an external drive from another Mac arrive quarantined,
  # which makes build phases fail with opaque permission errors.
  # `wc -l` on two operands prints two numbers; collapse to one integer or the
  # arithmetic test below dies on "0\n0".
  local quarantined=0
  quarantined="$(xattr -r -p com.apple.quarantine "$project" "$scheme" 2>/dev/null | grep -c . || true)"
  quarantined="${quarantined//[!0-9]/}"
  if [ "${quarantined:-0}" -gt 0 ]; then
    if [ "$fix_quarantine" -eq 1 ]; then
      note "Stripping com.apple.quarantine from ${quarantined} paths"
      xattr -dr com.apple.quarantine "$project" "$scheme"
    else
      note "WARNING: ${quarantined} quarantined paths. Re-run with --fix-quarantine if the build fails."
    fi
  fi

  [ -d "$project" ] || die "missing ${project}"
  [ -f "${project}/xcshareddata/xcschemes/${scheme}.xcscheme" ] || die "scheme '${scheme}' is not shared; share it in Xcode > Product > Scheme > Manage Schemes"
  note "Shared scheme present: ${scheme}"

  # A Release build that still points at the development APS environment gets
  # rejected, and silently breaks push for real users.
  if [ "$app" = "coach" ]; then
    grep -q 'APS_ENVIRONMENT = production;' "${project}/project.pbxproj" \
      || die "Release config must set APS_ENVIRONMENT = production"
    note "Push entitlement: production"
  fi

  # Signing is checked here rather than discovered a minute into an archive.
  # A CI runner started as a daemon has no GUI session, so codesign cannot
  # reach the private key and fails with errSecInternalComponent after the
  # whole app has already compiled.
  local identities
  identities="$(security find-identity -v -p codesigning 2>/dev/null || true)"

  # Print the whole signing environment. Which keychains are on the search
  # path, and whether they are locked, is the difference between a process in
  # a login session and one started by launchd — and it is invisible from
  # anywhere but this machine.
  note "Keychain search path:"
  security list-keychains -d user 2>/dev/null | sed 's/^/    /' || true
  note "login.keychain state:"
  security show-keychain-info ~/Library/Keychains/login.keychain-db 2>&1 | sed 's/^/    /' || true
  note "Code-signing identities visible to this process:"
  if [ -n "$identities" ]; then
    printf '%s\n' "$identities" | sed 's/^/    /'
  else
    note "    (none)"
  fi
  local profile_dir="${HOME}/Library/MobileDevice/Provisioning Profiles"
  if [ -d "$profile_dir" ]; then
    note "Provisioning profiles installed: $(find "$profile_dir" -name '*.mobileprovision' | wc -l | tr -d ' ')"
  else
    note "Provisioning profiles installed: 0 (no directory)"
  fi
  if printf '%s' "$identities" | grep -q 'Apple Distribution'; then
    note "Signing: Apple Distribution identity present"
  elif printf '%s' "$identities" | grep -q 'Apple Development'; then
    note "WARNING: only an Apple Development identity is in this keychain."
    note "         App Store archives need 'Apple Distribution'. Create one at"
    note "         developer.apple.com > Certificates, then import it here."
  else
    note "WARNING: no code-signing identity is visible to this process."
    note "         If this is a CI runner, the login keychain is probably locked:"
    note "           security unlock-keychain ~/Library/Keychains/login.keychain-db"
    note "           security set-key-partition-list -S apple-tool:,apple: -s \\"
    note "             -k <password> ~/Library/Keychains/login.keychain-db"
  fi

  # awk rather than `grep | head`, which under pipefail turns a SIGPIPE into a
  # failed preflight.
  local backend
  backend="$(awk 'match($0, /https:\/\/[^\"]+/) { print substr($0, RSTART, RLENGTH); exit }' \
    "${scheme}/Networking/HoopTrackAPI.swift")"
  note "Backend: ${backend}"
  if curl -fsS -o /dev/null --max-time 15 "$backend" 2>/dev/null; then
    note "Backend reachable."
  else
    note "WARNING: backend did not respond. App Review will exercise this host —"
    note "         it must be up and serving valid TLS for the whole review."
  fi

  if [ "$stage" = "preflight" ]; then
    note "Preflight complete. Next: $0 ${app} all --build <n>"
  fi
}

asc_key_path=""

# altool searches these directories by name; xcodebuild wants an explicit path.
# ASC_KEY_PATH short-circuits the search — that is how App Factory's worker
# passes the key, and its .p8 does not live in any of altool's search dirs.
locate_asc_key() {
  asc_key_path=""
  if [ -n "${ASC_KEY_PATH:-}" ] && [ -f "$ASC_KEY_PATH" ]; then
    asc_key_path="$ASC_KEY_PATH"
    if [ -z "${ASC_KEY_ID:-}" ]; then
      local base="${asc_key_path##*/}"
      base="${base%.p8}"
      ASC_KEY_ID="${base#AuthKey_}"
      export ASC_KEY_ID
    fi
    return 0
  fi
  [ -n "${ASC_KEY_ID:-}" ] || return 1
  local dir
  for dir in "./private_keys" "${HOME}/private_keys" "${HOME}/.private_keys" "${HOME}/.appstoreconnect/private_keys"; do
    if [ -f "${dir}/AuthKey_${ASC_KEY_ID}.p8" ]; then
      asc_key_path="${dir}/AuthKey_${ASC_KEY_ID}.p8"
      return 0
    fi
  done
  return 1
}

# altool takes --apiKey by *id* and then goes looking for the file itself, so a
# key held anywhere else has to be staged into one of its search directories.
stage_key_for_altool() {
  locate_asc_key || return 1
  case "$asc_key_path" in
    ./private_keys/*|"${HOME}/private_keys/"*|"${HOME}/.private_keys/"*|"${HOME}/.appstoreconnect/private_keys/"*)
      return 0 ;;
  esac
  mkdir -p "${HOME}/.appstoreconnect/private_keys"
  cp "$asc_key_path" "${HOME}/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  chmod 600 "${HOME}/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  note "Staged the API key where altool looks for it."
}

require_asc_credentials() {
  [ -n "${ASC_ISSUER_ID:-}" ] || die "ASC_ISSUER_ID is not set"
  locate_asc_key || die "no App Store Connect key: set ASC_KEY_PATH, or put AuthKey_\${ASC_KEY_ID}.p8 in ~/.appstoreconnect/private_keys/ (or ./private_keys, ~/private_keys, ~/.private_keys)"
  [ -n "${ASC_KEY_ID:-}" ]    || die "ASC_KEY_ID is not set"
  stage_key_for_altool
}

# Is there a usable App Store Connect API key? Both the key file and the issuer
# id are needed; a .p8 on its own cannot authenticate.
have_asc_credentials() {
  [ -n "${ASC_ISSUER_ID:-}" ] && locate_asc_key
}

# Nothing needs to be supplied by hand on a machine that already runs App
# Factory: it holds an App Store Connect API key and drives xcodebuild with it.
# Reuse that key when the environment does not already carry one.
adopt_appfactory_credentials() {
  have_asc_credentials && return 0

  local loader="${repo_root}/scripts/appfactory-credentials.sh"
  [ -f "$loader" ] || return 0

  local found
  found="$(mktemp "${TMPDIR:-/tmp}/asc-creds.XXXXXX")"
  bash "$loader" "$found" || true
  if [ -s "$found" ]; then
    # shellcheck disable=SC1090
    . "$found"
    note "Adopted the App Store Connect key App Factory already uses on this Mac."
  fi
  rm -f "$found"
}

# With these flags xcodebuild can create and download provisioning profiles on
# its own, which is what makes -allowProvisioningUpdates work on a CI runner
# where nobody can answer an interactive Apple ID prompt.
asc_auth_args=()
set_asc_auth_args() {
  asc_auth_args=()
  if have_asc_credentials; then
    asc_auth_args=(
      -authenticationKeyID "$ASC_KEY_ID"
      -authenticationKeyIssuerID "$ASC_ISSUER_ID"
      -authenticationKeyPath "$(cd "$(dirname "$asc_key_path")" && pwd)/$(basename "$asc_key_path")"
    )
    note "Signing non-interactively with App Store Connect key ${ASC_KEY_ID}"
  fi
}

# ------------------------------------------------------------------ archive --

write_export_options() {
  # Xcode 15.3 renamed the App Store method; older Xcode rejects the new name.
  local method="app-store-connect" version major minor
  version="$(xcodebuild_version_line)"   # e.g. "Xcode 26.2"
  version="${version##* }"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"
  [[ "$major" =~ ^[0-9]+$ ]] || major=99
  [[ "$minor" =~ ^[0-9]+$ ]] || minor=0
  if [ "$major" -lt 15 ] || { [ "$major" -eq 15 ] && [ "$minor" -lt 3 ]; }; then
    method="app-store"
  fi

  # Without an API key, hand the upload to Xcode itself. `destination: upload`
  # authenticates with the Apple ID signed into Xcode on this machine, which is
  # the same path Organizer's "Distribute App" takes — and it needs no issuer
  # id, because the account session already carries the team identity.
  local destination="export"
  if ! have_asc_credentials; then
    destination="upload"
    note "No App Store Connect key; exporting with destination=upload so Xcode's"
    note "  own signed-in account performs the upload."
  fi

  mkdir -p "$build_dir"
  cat >"$export_options" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>${method}</string>
	<key>destination</key>
	<string>${destination}</string>
	<key>teamID</key>
	<string>${team_id}</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>uploadSymbols</key>
	<true/>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
PLIST
  note "Export method: ${method}, destination: ${destination}"
}

run_archive() {
  step "Archive — ${scheme}"
  local overrides=("DEVELOPMENT_TEAM=${team_id}")
  if [ -n "$build_number" ]; then
    overrides+=("CURRENT_PROJECT_VERSION=${build_number}")
  fi
  if [ -n "$marketing_version" ]; then
    overrides+=("MARKETING_VERSION=${marketing_version}")
  fi
  # Xcode signs an archive with a *development* identity and only re-signs for
  # distribution at export. On this runner that is fatal: the sole Apple
  # Development identity lives in login.keychain, which a launchd process with
  # no GUI session cannot unlock, so codesign fails with errSecInternalComponent
  # after the whole app has compiled — even though the App Store Connect key
  # authenticated fine.
  #
  # When no usable identity is present, archive without signing and let
  # -exportArchive do the only signing that matters. Export creates the Apple
  # Distribution certificate through the API key and lands its private key in
  # the default keychain, which the broker has pointed at an unlocked one.
  if ! security find-identity -v -p codesigning 2>/dev/null | grep -q 'Apple Distribution'; then
    note "No Apple Distribution identity; archiving unsigned and signing at export."
    overrides+=(
      CODE_SIGNING_ALLOWED=NO
      CODE_SIGNING_REQUIRED=NO
      CODE_SIGN_IDENTITY=
      CODE_SIGN_ENTITLEMENTS=
    )
  fi

  note "Build settings: ${overrides[*]}"

  rm -rf "$archive_path"
  mkdir -p "$build_dir"
  set_asc_auth_args

  xcodebuild archive \
    -project "$project" \
    -scheme "$scheme" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$archive_path" \
    -derivedDataPath "$derived_data" \
    -allowProvisioningUpdates \
    "${asc_auth_args[@]+"${asc_auth_args[@]}"}" \
    "${overrides[@]}"

  [ -d "$archive_path" ] || die "archive was not produced at ${archive_path}"
  note "Archive: ${archive_path}"
}

run_export() {
  step "Export — ${scheme}"
  [ -d "$archive_path" ] || die "no archive at ${archive_path} — run the archive stage first"
  write_export_options
  rm -rf "$export_dir"
  set_asc_auth_args

  xcodebuild -exportArchive \
    -archivePath "$archive_path" \
    -exportPath "$export_dir" \
    -exportOptionsPlist "$export_options" \
    -allowProvisioningUpdates \
    "${asc_auth_args[@]+"${asc_auth_args[@]}"}"

  # destination=upload hands the build straight to App Store Connect and leaves
  # no .ipa behind, so its absence there is success rather than failure.
  if [ -f "$ipa_path" ]; then
    note "IPA: ${ipa_path} ($(du -h "$ipa_path" | cut -f1))"
  elif have_asc_credentials; then
    die "no IPA at ${ipa_path}"
  else
    note "Uploaded to App Store Connect by Xcode; no local IPA is produced."
    note "Processing takes 5-30 minutes before the build appears in TestFlight."
  fi
}

run_validate() {
  step "Validate with App Store Connect — ${scheme}"
  [ -f "$ipa_path" ] || die "no IPA at ${ipa_path} — run the export stage first"
  require_asc_credentials
  xcrun altool --validate-app \
    --type ios \
    --file "$ipa_path" \
    --apiKey "$ASC_KEY_ID" \
    --apiIssuer "$ASC_ISSUER_ID"
  note "Validation passed."
}

run_upload() {
  step "Upload to App Store Connect — ${scheme}"
  [ -f "$ipa_path" ] || die "no IPA at ${ipa_path} — run the export stage first"
  require_asc_credentials
  xcrun altool --upload-app \
    --type ios \
    --file "$ipa_path" \
    --apiKey "$ASC_KEY_ID" \
    --apiIssuer "$ASC_ISSUER_ID"
  note "Uploaded. Processing takes 5-30 minutes before the build appears in TestFlight."
}

run_preflight
case "$stage" in
  preflight) ;;
  archive)   run_archive ;;
  export)    run_export ;;
  validate)  run_validate ;;
  upload)    run_upload ;;
  all)
    run_archive
    run_export
    # With no API key the export already uploaded; altool has nothing to add
    # and could not authenticate anyway.
    if have_asc_credentials; then
      run_validate
      run_upload
    else
      note "Skipping altool validate/upload — Xcode already uploaded the build."
    fi
    ;;
esac

step "Done — ${app} / ${stage}"
