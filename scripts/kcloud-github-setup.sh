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
  token_file="${HOME}/.config/git/kcloud-token"
  askpass_file="${HOME}/.config/git/kcloud-askpass.sh"
  mkdir -p "$(dirname "$credential_file")"
  printf 'https://x-access-token:%s@github.com\n' "$token" > "$credential_file"
  printf '%s' "$token" > "$token_file"
  cat > "$askpass_file" <<'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' 'x-access-token' ;;
  *Password*) cat "${HOME}/.config/git/kcloud-token" ;;
esac
EOF
  chmod 600 "$credential_file"
  chmod 600 "$token_file"
  chmod 700 "$askpass_file"

  if command -v gh >/dev/null 2>&1; then
    printf '%s' "$token" | env -u GH_TOKEN -u GITHUB_TOKEN \
      gh auth login --hostname github.com --git-protocol https \
        --insecure-storage --with-token
    env -u GH_TOKEN -u GITHUB_TOKEN gh auth setup-git --hostname github.com
    chmod 600 "${HOME}/.config/gh/hosts.yml" 2>/dev/null || true
  fi

  git config --global --unset-all credential.helper >/dev/null 2>&1 || true
  git config --global credential.helper "store --file=${credential_file}"
  git config --global core.askPass "$askpass_file"
  git config --global credential.interactive always
  git config credential.helper "store --file=${credential_file}"
  git config core.askPass "$askpass_file"
  basic_auth="$(printf 'x-access-token:%s' "$token" | base64 | tr -d '\r\n')"
  git config http.https://github.com/.extraheader \
    "AUTHORIZATION: basic ${basic_auth}"
  chmod 600 "$(git rev-parse --git-path config)" 2>/dev/null || true
fi

if ! env -u GH_TOKEN -u GITHUB_TOKEN GIT_ASKPASS=/bin/false SSH_ASKPASS=/bin/false \
  git ls-remote --exit-code --heads origin main >/dev/null; then
  echo 'KCLOUD_GITHUB_AUTH_FAILED: origin/main is not reachable.' >&2
  exit 51
fi

echo "KCLOUD_GITHUB_READY: ${repository%.git} main"
