#!/usr/bin/env bash
set -euo pipefail

playwright_version="${KCLOUD_PLAYWRIGHT_VERSION:-1.61.1}"
chromium_version="${KCLOUD_CHROMIUM_VERSION:-149.0.0}"
global_root="$(npm root --global)"

global_playwright="${global_root}/playwright"
global_chromium="${global_root}/@sparticuz/chromium"

if [ ! -f "${global_playwright}/package.json" ] || \
  [ "$(node -p "require('${global_playwright}/package.json').version" 2>/dev/null || true)" != "$playwright_version" ]; then
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    npm install --global "playwright@${playwright_version}"
fi

if [ ! -f "${global_chromium}/package.json" ] || \
  [ "$(node -p "require('${global_chromium}/package.json').version" 2>/dev/null || true)" != "$chromium_version" ]; then
  npm install --global "@sparticuz/chromium@${chromium_version}"
fi

chromium_executable="$(NODE_PATH="$global_root" node -e '
  require("@sparticuz/chromium").executablePath()
    .then((value) => process.stdout.write(value));
')"

if [ -f package.json ] && node -e 'require.resolve("playwright")' >/dev/null 2>&1; then
  expected_executable="$(node -e '
    process.stdout.write(require("playwright").chromium.executablePath());
  ')"
else
  expected_executable="$(node -e "
    process.stdout.write(require('${global_playwright}').chromium.executablePath());
  ")"
fi

test -x "$chromium_executable"
mkdir -p "$(dirname "$expected_executable")"
ln -sfn "$chromium_executable" "$expected_executable"
ln -sfn "$chromium_executable" /usr/local/bin/chromium

NODE_PATH="$global_root" KCLOUD_CHROMIUM_EXECUTABLE="$expected_executable" node -e '
  const { chromium } = require("playwright");
  chromium.launch({
    executablePath: process.env.KCLOUD_CHROMIUM_EXECUTABLE,
    headless: true,
  }).then(async (browser) => {
    const page = await browser.newPage();
    await page.setContent("<title>KCLOUD Playwright ready</title>");
    if ((await page.title()) !== "KCLOUD Playwright ready") process.exitCode = 1;
    await browser.close();
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
'

echo "KCLOUD_PLAYWRIGHT_BROWSER_READY: chromium ${chromium_version}"
