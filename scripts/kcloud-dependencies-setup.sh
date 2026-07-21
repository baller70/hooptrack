#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

cache_dir="${HOME}/.cache/kcloud-dependencies"
repo_key="${GITHUB_REPOSITORY:-$(basename "$root")}"
repo_key="${repo_key//\//-}"
marker="${cache_dir}/${repo_key}.sha256"
mkdir -p "$cache_dir"

hash_files() {
  sha256sum "$@" | sha256sum | awk '{print $1}'
}

ensure_declared_node() {
  local requires_node_24=0
  if [ -f package.json ] && node -e '
    const value = require("./package.json").engines?.node || "";
    process.exit(/(^|[^0-9])24([^0-9]|$)/.test(value) ? 0 : 1);
  '; then
    requires_node_24=1
  elif [ -f mise.toml ] && grep -Eq 'node[[:space:]]*=[[:space:]]*"24"' mise.toml; then
    requires_node_24=1
  fi

  if [ "$requires_node_24" -eq 1 ] && [ "$(node -p 'process.versions.node.split(".")[0]')" != "24" ]; then
    command -v mise >/dev/null 2>&1 || {
      echo 'KCLOUD_DEPENDENCIES_MISSING_MISE: Node 24 is required.' >&2
      exit 40
    }
    [ ! -f mise.toml ] || mise trust "$PWD/mise.toml"
    mise install node@24
    mise use --global node@24
    export PATH="$(mise where node@24)/bin:${PATH}"
    hash -r
  fi
}

package_manager=""
lockfiles=()
install_targets=()

if [ -f package.json ]; then
  declared_manager="$(node -p 'require("./package.json").packageManager || ""')"
  case "$declared_manager" in
    pnpm@*) [ -f pnpm-lock.yaml ] && package_manager=pnpm ;;
    yarn@*) [ -s yarn.lock ] && package_manager=yarn ;;
    npm@*) [ -f package-lock.json ] && package_manager=npm ;;
  esac

  if [ -z "$package_manager" ] && [ -f package-lock.json ]; then
    package_manager=npm
  elif [ -z "$package_manager" ] && [ -f pnpm-lock.yaml ]; then
    package_manager=pnpm
  elif [ -z "$package_manager" ] && [ -s yarn.lock ]; then
    package_manager=yarn
  fi

  case "$package_manager" in
    npm) lockfiles=(package-lock.json); install_targets=(.) ;;
    pnpm) lockfiles=(pnpm-lock.yaml); install_targets=(.) ;;
    yarn) lockfiles=(yarn.lock); install_targets=(.) ;;
  esac
fi

if [ -z "$package_manager" ]; then
  while IFS= read -r lockfile; do
    lockfiles+=("$lockfile")
    install_targets+=("$(dirname "$lockfile")")
  done < <(find . -mindepth 2 -maxdepth 3 -name package-lock.json -print | sort)
  [ "${#lockfiles[@]}" -eq 0 ] || package_manager=npm-nested
fi

if [ -z "$package_manager" ]; then
  echo 'KCLOUD_DEPENDENCIES_STATIC_REPO: no dependency install required.'
  exit 0
fi

if [ "${KCLOUD_DEPENDENCIES_PLAN_ONLY:-0}" = "1" ]; then
  printf 'KCLOUD_DEPENDENCIES_PLAN: manager=%s targets=%s\n' \
    "$package_manager" "${install_targets[*]}"
  exit 0
fi

ensure_declared_node

current_hash="$(hash_files "${lockfiles[@]}")"
cache_ready=1
for target in "${install_targets[@]}"; do
  [ -d "${target}/node_modules" ] || cache_ready=0
done

if [ "$cache_ready" -eq 1 ] && [ -f "$marker" ] && [ "$(cat "$marker")" = "$current_hash" ]; then
  echo "KCLOUD_DEPENDENCIES_CACHE_HIT: ${package_manager}"
  exit 0
fi

case "$package_manager" in
  npm)
    npm ci
    ;;
  pnpm)
    pnpm_version="$(node -p '
      (require("./package.json").packageManager || "pnpm@10")
        .replace(/^pnpm@/, "").split("+")[0]
    ')"
    if ! command -v pnpm >/dev/null 2>&1 || [ "$(pnpm --version)" != "$pnpm_version" ]; then
      npm install --global "pnpm@${pnpm_version}"
    fi
    pnpm install --frozen-lockfile
    ;;
  yarn)
    yarn_version="$(node -p '
      (require("./package.json").packageManager || "yarn@1")
        .replace(/^yarn@/, "").split("+")[0]
    ')"
    if ! command -v yarn >/dev/null 2>&1 || [ "$(yarn --version)" != "$yarn_version" ]; then
      npm install --global "yarn@${yarn_version}"
    fi
    yarn install --immutable
    ;;
  npm-nested)
    for target in "${install_targets[@]}"; do
      npm ci --prefix "$target"
    done
    ;;
esac

printf '%s\n' "$current_hash" > "$marker"
echo "KCLOUD_DEPENDENCIES_READY: ${package_manager}"
