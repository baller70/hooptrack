#!/usr/bin/env bash
set -euo pipefail

host="${CONTABO_HOST:-194.146.12.139}"
user="${CONTABO_USER:-root}"
ssh_dir="${HOME}/.ssh"
key_path="${CONTABO_SSH_KEY_PATH:-${ssh_dir}/id_ed25519}"
known_hosts_path="${ssh_dir}/known_hosts"

mkdir -p "${ssh_dir}"
chmod 700 "${ssh_dir}"

if [ -n "${CONTABO_SSH_PRIVATE_KEY_B64:-}" ]; then
  if base64 --help 2>&1 | grep -q -- "--decode"; then
    printf '%s' "${CONTABO_SSH_PRIVATE_KEY_B64}" | tr -d '
 ' | base64 --decode > "${key_path}"
  else
    printf '%s' "${CONTABO_SSH_PRIVATE_KEY_B64}" | tr -d '
 ' | base64 -d > "${key_path}"
  fi
elif [ -n "${CONTABO_SSH_PRIVATE_KEY:-}" ]; then
  printf '%s
' "${CONTABO_SSH_PRIVATE_KEY}" > "${key_path}"
elif [ ! -s "${key_path}" ]; then
  echo "Missing CONTABO_SSH_PRIVATE_KEY_B64 or CONTABO_SSH_PRIVATE_KEY, and ${key_path} does not exist." >&2
  exit 20
fi

chmod 600 "${key_path}"

if [ -n "${CONTABO_KNOWN_HOSTS:-}" ]; then
  printf '%s
' "${CONTABO_KNOWN_HOSTS}" > "${known_hosts_path}"
else
  ssh-keygen -R "${host}" >/dev/null 2>&1 || true
  ssh-keyscan -T 10 "${host}" >> "${known_hosts_path}" 2>/dev/null
fi
chmod 600 "${known_hosts_path}"

if command -v nc >/dev/null 2>&1; then
  nc -vz -w 10 "${host}" 22 >/dev/null
else
  timeout 10 bash -c "</dev/tcp/${host}/22" >/dev/null 2>&1
fi

ssh_opts=(
  -i "${key_path}"
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o IdentitiesOnly=yes
  -o UserKnownHostsFile="${known_hosts_path}"
  -o StrictHostKeyChecking=yes
)

remote_check='set -e; hostname; whoami; test -d /opt/apps && echo apps-ok; marker=/tmp/kcloud-rw-$(date +%s)-$$; printf kcloud-rw-test > "$marker"; cat "$marker"; rm "$marker"; echo rw-ok'
ssh "${ssh_opts[@]}" "${user}@${host}" "$remote_check"
