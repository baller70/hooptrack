#!/usr/bin/env bash
set -euo pipefail

repository="${GITHUB_REPOSITORY:-}"
if [ -z "$repository" ]; then
  echo 'KCLOUD_GITHUB_MISSING_REPOSITORY: GITHUB_REPOSITORY is not configured.' >&2
  exit 50
fi

remote_url="https://github.com/${repository%.git}.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$remote_url"
else
  git remote add origin "$remote_url"
fi

token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -n "$token" ]; then
  credential_file="${HOME}/.config/git/kcloud-credentials"
  mkdir -p "$(dirname "$credential_file")"
  printf 'https://x-access-token:%s@github.com\n' "$token" > "$credential_file"
  chmod 600 "$credential_file"

  if command -v gh >/dev/null 2>&1; then
    printf '%s' "$token" | env -u GH_TOKEN -u GITHUB_TOKEN \
      gh auth login --hostname github.com --git-protocol https \
        --insecure-storage --with-token
    env -u GH_TOKEN -u GITHUB_TOKEN gh auth setup-git --hostname github.com
    chmod 600 "${HOME}/.config/gh/hosts.yml" 2>/dev/null || true
  fi

  git config --global --unset-all credential.helper >/dev/null 2>&1 || true
  git config --global credential.helper "store --file=${credential_file}"
fi

if ! git ls-remote --exit-code --heads origin main >/dev/null; then
  echo 'KCLOUD_GITHUB_AUTH_FAILED: origin/main is not reachable.' >&2
  exit 51
fi

echo "KCLOUD_GITHUB_READY: ${repository%.git} main"
