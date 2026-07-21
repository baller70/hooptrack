#!/usr/bin/env bash
set -euo pipefail

printf 'KCLOUD Playwright setup: %s\n' "$(pwd)"

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
    if pnpm exec playwright --version >/dev/null 2>&1; then
      pnpm exec playwright install --with-deps chromium
    else
      pnpm dlx playwright install --with-deps chromium
    fi
  elif [ -f yarn.lock ]; then
    yarn install --frozen-lockfile || yarn install --immutable || yarn install
    if yarn playwright --version >/dev/null 2>&1; then
      yarn playwright install --with-deps chromium
    else
      npx -y playwright@latest install --with-deps chromium
    fi
  else
    if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
      npm ci
    else
      npm install
    fi
    npx playwright install --with-deps chromium
  fi
else
  npx -y playwright@latest install --with-deps chromium
fi

node -e "const bins=['chromium']; console.log('KCLOUD Playwright browser setup complete:', bins.join(','))"
