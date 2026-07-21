#!/usr/bin/env bash
set -Eeuo pipefail

die() {
  printf 'KCLOUD_XCODE_SUBMIT_ERROR: %s\n' "$*" >&2
  exit 1
}

mode="${1:-doctor}"
target_ref="${2:-main}"
broker_repository="${KCLOUD_XCODE_BROKER_REPOSITORY:-baller70/kcloud-xcode-runner}"
target_repository="${GITHUB_REPOSITORY:-}"

case "$mode" in
  doctor|build|test) ;;
  *) die "mode must be doctor, build, or test" ;;
esac

[[ "$target_ref" =~ ^[A-Za-z0-9._/-]+$ ]] || die "invalid ref"

if [ -z "$target_repository" ]; then
  remote_url="$(git config --get remote.origin.url 2>/dev/null || true)"
  target_repository="$(printf '%s' "$remote_url" | sed -E 's#^https://github.com/##; s#^git@github.com:##; s#\.git$##')"
fi

[[ "$target_repository" =~ ^baller70/[A-Za-z0-9._-]+$ ]] || die "cannot determine an approved GitHub repository"

if [ "$mode" != "doctor" ]; then
  [ -n "${XCODE_CONTAINER:-}" ] || die "set XCODE_CONTAINER to a relative .xcodeproj or .xcworkspace path"
  [ -n "${XCODE_SCHEME:-}" ] || die "set XCODE_SCHEME"
fi

token="${KCLOUD_XCODE_BROKER_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"
if [ -z "$token" ] && [ -r "${HOME}/.config/git/kcloud-token" ]; then
  token="$(<"${HOME}/.config/git/kcloud-token")"
fi
if [ -z "$token" ] && command -v gh >/dev/null 2>&1; then
  token="$(env -u GH_TOKEN -u GITHUB_TOKEN gh auth token --hostname github.com 2>/dev/null || true)"
fi
[ -n "$token" ] || die "GitHub broker credentials are unavailable; rerun the KCLOUD GitHub setup"
command -v node >/dev/null 2>&1 || die "Node.js is required to create the dispatch payload"

payload="$(
  TARGET_REPOSITORY="$target_repository" \
  TARGET_REF="$target_ref" \
  XCODE_MODE="$mode" \
  XCODE_CONTAINER="${XCODE_CONTAINER:-}" \
  XCODE_SCHEME="${XCODE_SCHEME:-}" \
  XCODE_DESTINATION="${XCODE_DESTINATION:-}" \
  node -e '
    const payload = {
      event_type: "kcloud-xcode",
      client_payload: {
        repository: process.env.TARGET_REPOSITORY,
        ref: process.env.TARGET_REF,
        mode: process.env.XCODE_MODE,
        container: process.env.XCODE_CONTAINER,
        scheme: process.env.XCODE_SCHEME,
        destination: process.env.XCODE_DESTINATION,
      },
    };
    process.stdout.write(JSON.stringify(payload));
  '
)"

if command -v gh >/dev/null 2>&1; then
  GH_TOKEN="$token" gh api \
    --method POST \
    "repos/${broker_repository}/dispatches" \
    --input - <<<"$payload"
else
  command -v curl >/dev/null 2>&1 || die "GitHub CLI or curl is required"
  response_file="$(mktemp)"
  trap 'rm -f "$response_file"' EXIT
  status="$(
    curl --silent --show-error \
      --output "$response_file" \
      --write-out '%{http_code}' \
      --request POST \
      --header "Accept: application/vnd.github+json" \
      --header "Authorization: Bearer ${token}" \
      --header "X-GitHub-Api-Version: 2022-11-28" \
      --data "$payload" \
      "https://api.github.com/repos/${broker_repository}/dispatches"
  )"
  if [ "$status" != "204" ]; then
    cat "$response_file" >&2
    die "GitHub dispatch returned HTTP $status"
  fi
fi

printf 'KCLOUD_XCODE_JOB_SUBMITTED: repository=%s ref=%s mode=%s\n' "$target_repository" "$target_ref" "$mode"
printf 'KCLOUD_XCODE_ACTIONS_URL: https://github.com/%s/actions\n' "$broker_repository"
