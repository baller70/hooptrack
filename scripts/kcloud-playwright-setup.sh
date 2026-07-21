#!/usr/bin/env bash
set -euo pipefail

printf 'KCLOUD Playwright setup: %s\n' "$(pwd)"
printf 'Node: '; node --version 2>/dev/null || true
printf 'npm: '; npm --version 2>/dev/null || true
printf 'HTTP proxy: %s\n' "${HTTP_PROXY:-${http_proxy:-none}}"
printf 'HTTPS proxy: %s\n' "${HTTPS_PROXY:-${https_proxy:-none}}"
printf 'NO_PROXY: %s\n' "${NO_PROXY:-${no_proxy:-none}}"

if [ "${KCLOUD_PLAYWRIGHT_SKIP_INSTALL:-0}" = "1" ]; then
  echo 'KCLOUD_PLAYWRIGHT_SKIP_INSTALL=1; skipping install for diagnostics.'
  exit 0
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

pm="npx"
pw_cmd=(npx playwright)

if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ]; then
    pm="pnpm"
    pnpm install --frozen-lockfile
    if pnpm exec playwright --version >/dev/null 2>&1; then
      pw_cmd=(pnpm exec playwright)
    else
      pw_cmd=(pnpm dlx playwright)
    fi
  elif [ -f yarn.lock ]; then
    pm="yarn"
    yarn install --frozen-lockfile || yarn install --immutable || yarn install
    if yarn playwright --version >/dev/null 2>&1; then
      pw_cmd=(yarn playwright)
    else
      pw_cmd=(npx -y playwright@latest)
    fi
  else
    pm="npm"
    if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
      npm ci
    else
      npm install
    fi
    pw_cmd=(npx playwright)
  fi
else
  pw_cmd=(npx -y playwright@latest)
fi

printf 'Package manager path: %s\n' "$pm"
"${pw_cmd[@]}" --version || true

install_log="${TMPDIR:-/tmp}/kcloud-playwright-install-$$.log"
with_deps_status=0
plain_status=0

echo 'Installing Playwright Chromium with Ubuntu dependencies...'
set +e
"${pw_cmd[@]}" install --with-deps chromium >"$install_log" 2>&1
with_deps_status=$?
set -e

if [ "$with_deps_status" -ne 0 ]; then
  echo "Playwright --with-deps install failed with status $with_deps_status. Last 80 log lines:"
  tail -n 80 "$install_log" || true
  echo 'Retrying Playwright Chromium install without OS dependency install...'
  set +e
  "${pw_cmd[@]}" install chromium >"$install_log" 2>&1
  plain_status=$?
  set -e
  if [ "$plain_status" -ne 0 ]; then
    echo "Playwright browser download failed with status $plain_status. Last 80 log lines:"
    tail -n 80 "$install_log" || true
  fi
fi

cache_root="${PLAYWRIGHT_BROWSERS_PATH:-${HOME}/.cache/ms-playwright}"
echo "Playwright cache root: $cache_root"
if [ -d "$cache_root" ]; then
  find "$cache_root" -maxdepth 3 -type f \( -name chromium -o -name chrome -o -name headless_shell \) -print | sed -n '1,20p' || true
else
  echo 'Playwright cache root missing.'
fi

system_browser=""
for candidate in chromium chromium-browser google-chrome google-chrome-stable chrome firefox; do
  if command -v "$candidate" >/dev/null 2>&1; then
    system_browser="$(command -v "$candidate")"
    break
  fi
done

if [ -n "$system_browser" ]; then
  mkdir -p .kcloud
  {
    printf 'export KCLOUD_SYSTEM_BROWSER=%q\n' "$system_browser"
    printf 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1\n'
  } > .kcloud/playwright.env
  echo "System browser found: $system_browser"
  echo 'Wrote .kcloud/playwright.env. Existing Playwright configs may still need channel/executablePath support to use a system browser.'
fi

if [ "$with_deps_status" -ne 0 ] && [ "$plain_status" -ne 0 ]; then
  if grep -Eqi '403|Forbidden|cdn\.playwright\.dev|proxy|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN' "$install_log"; then
    cat >&2 <<'EOF'
KCLOUD_PLAYWRIGHT_NETWORK_BLOCKED
Playwright browser install is blocked by the Cloud network/proxy. This is not a repo dependency problem.
Required fix in Codex Cloud environment settings or network policy:
- enable agent/setup internet access;
- allow package repositories used by the base image;
- allow https://cdn.playwright.dev;
- or use a Cloud image/environment with Chromium already installed and configure tests to use that system browser.
EOF
    exit 31
  fi
  echo 'KCLOUD_PLAYWRIGHT_INSTALL_FAILED: Playwright install failed for a non-classified reason.' >&2
  exit 32
fi

if [ "$with_deps_status" -ne 0 ] && [ "$plain_status" -eq 0 ]; then
  echo 'KCLOUD_PLAYWRIGHT_OS_DEPS_BLOCKED: Chromium downloaded, but Ubuntu OS dependency install failed. Browser tests may still fail if required system libraries are missing.' >&2
fi

echo 'KCLOUD Playwright browser setup complete: chromium'
