#!/usr/bin/env bash
set -euo pipefail

host="${CONTABO_HOST:-194.146.12.139}"
user="${CONTABO_USER:-root}"
ssh_dir="${HOME}/.ssh"
key_path="${CONTABO_SSH_KEY_PATH:-${ssh_dir}/id_ed25519}"
known_hosts_path="${ssh_dir}/known_hosts"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bridge_client="${KCLOUD_SSH_BRIDGE_CLIENT:-${script_dir}/kcloud-websocket-proxy.mjs}"
proxy_url="${HTTPS_PROXY:-${https_proxy:-${HTTP_PROXY:-${http_proxy:-}}}}"
missing_key=0

printf 'KCLOUD Contabo SSH setup/check\n'
printf 'Target: %s@%s:22\n' "$user" "$host"
printf 'HTTP proxy configured: %s\n' "$([ -n "${HTTP_PROXY:-${http_proxy:-}}" ] && echo yes || echo no)"
printf 'HTTPS proxy configured: %s\n' "$([ -n "${HTTPS_PROXY:-${https_proxy:-}}" ] && echo yes || echo no)"
printf 'KCLOUD WebSocket bridge client: %s\n' "$([ -f "$bridge_client" ] && echo present || echo missing)"

mkdir -p "${ssh_dir}"
chmod 700 "${ssh_dir}"

try_direct_tcp() {
  if command -v nc >/dev/null 2>&1; then
    nc -vz -w 10 "${host}" 22 >/tmp/kcloud-contabo-nc-$$.log 2>&1
  else
    timeout 10 bash -c "</dev/tcp/${host}/22" >/tmp/kcloud-contabo-nc-$$.log 2>&1
  fi
}

proxy_hostport=""
if [ -n "$proxy_url" ]; then
  proxy_hostport="$(node -e 'try { const u = new URL(process.argv[1]); console.log(u.host) } catch { process.exit(1) }' "$proxy_url" 2>/dev/null || true)"
fi

ssh_proxy_args=()
route_mode=direct
if try_direct_tcp; then
  echo 'Direct TCP to Contabo port 22 succeeded.'
else
  echo 'Direct TCP to Contabo port 22 failed:' >&2
  cat /tmp/kcloud-contabo-nc-$$.log >&2 || true
  if [ -f "$bridge_client" ] && command -v node >/dev/null 2>&1; then
    export KCLOUD_SSH_BRIDGE_URL="${KCLOUD_SSH_BRIDGE_URL:-wss://kcloud-contabo-ssh-relay.khouston.workers.dev}"
    echo 'Using authenticated KCLOUD SSH-over-WebSocket bridge on HTTPS port 443.'
    ssh_proxy_args=(-o "ProxyCommand=node $bridge_client")
    route_mode=websocket
  elif [ -n "$proxy_hostport" ] && command -v nc >/dev/null 2>&1; then
    echo "Trying SSH over HTTP CONNECT proxy $proxy_hostport..."
    if nc -X connect -x "$proxy_hostport" "$host" 22 </dev/null >/tmp/kcloud-contabo-proxy-$$.log 2>&1; then
      echo 'HTTP CONNECT proxy can reach Contabo port 22.'
      ssh_proxy_args=(-o "ProxyCommand=nc -X connect -x $proxy_hostport %h %p")
      route_mode=http-connect
    else
      echo 'HTTP CONNECT proxy could not reach Contabo port 22:' >&2
      cat /tmp/kcloud-contabo-proxy-$$.log >&2 || true
      echo 'KCLOUD_CONTABO_NETWORK_BLOCKED: Cloud network/proxy cannot route to Contabo SSH port 22.' >&2
      exit 30
    fi
  else
    echo 'KCLOUD_CONTABO_NETWORK_BLOCKED: Cloud network cannot route to Contabo SSH port 22 and no usable HTTP proxy CONNECT fallback is available.' >&2
    exit 30
  fi
fi

if [ -n "${CONTABO_SSH_PRIVATE_KEY_B64:-}" ]; then
  if base64 --help 2>&1 | grep -q -- "--decode"; then
    printf '%s' "${CONTABO_SSH_PRIVATE_KEY_B64}" | tr -d '\r\n ' | base64 --decode > "${key_path}"
  else
    printf '%s' "${CONTABO_SSH_PRIVATE_KEY_B64}" | tr -d '\r\n ' | base64 -d > "${key_path}"
  fi
elif [ -n "${CONTABO_SSH_PRIVATE_KEY:-}" ]; then
  printf '%s\n' "${CONTABO_SSH_PRIVATE_KEY}" > "${key_path}"
elif [ ! -s "${key_path}" ]; then
  missing_key=1
fi

if [ "$missing_key" -eq 1 ]; then
  echo "KCLOUD_CONTABO_MISSING_KEY: network route was checked, but CONTABO_SSH_PRIVATE_KEY_B64 or CONTABO_SSH_PRIVATE_KEY is missing and ${key_path} does not exist." >&2
  exit 20
fi

chmod 600 "${key_path}"

if [ -n "${CONTABO_KNOWN_HOSTS:-}" ]; then
  printf '%s\n' "${CONTABO_KNOWN_HOSTS}" > "${known_hosts_path}"
else
  ssh-keygen -R "${host}" >/dev/null 2>&1 || true
  if [ "$route_mode" = direct ] && ! ssh-keyscan -T 10 "${host}" >> "${known_hosts_path}" 2>/tmp/kcloud-ssh-keyscan-$$.log; then
    echo 'KCLOUD_CONTABO_KEYSCAN_FAILED: ssh-keyscan could not reach Contabo.' >&2
    cat /tmp/kcloud-ssh-keyscan-$$.log >&2 || true
  elif [ "$route_mode" != direct ]; then
    echo 'Host-key discovery deferred to the authenticated SSH connection.'
  fi
fi
chmod 600 "${known_hosts_path}" 2>/dev/null || true

ssh_opts=(
  -i "${key_path}"
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o IdentitiesOnly=yes
  -o UserKnownHostsFile="${known_hosts_path}"
  -o StrictHostKeyChecking=accept-new
)
if [ ${#ssh_proxy_args[@]} -gt 0 ]; then
  ssh_opts+=("${ssh_proxy_args[@]}")
fi

remote_check='set -e; hostname; whoami; test -d /opt/apps && echo apps-ok; marker=/tmp/kcloud-rw-$(date +%s)-$$; printf kcloud-rw-test > "$marker"; cat "$marker"; rm "$marker"; echo rw-ok'
set +e
ssh "${ssh_opts[@]}" "${user}@${host}" "$remote_check"
status=$?
set -e
if [ "$status" -ne 0 ]; then
  echo "KCLOUD_CONTABO_SSH_FAILED: ssh exited with status $status." >&2
  echo 'If this says Permission denied, the Cloud secret is missing/malformed or the public key is not authorized on Contabo.' >&2
  exit "$status"
fi
