#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function loadEnv(filePath) {
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator > 0 && !process.env[line.slice(0, separator).trim()]) {
      process.env[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }
}

const envPath = argument("--env");
const outputRoot = path.resolve(argument("--output", ".factory/approved-real-screenshots"));
const baseUrl = argument("--base-url", "https://hooptrack.194-146-12-139.sslip.io").replace(/\/$/, "");
const chromePath = argument("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const productFilter = argument("--product");
if (!envPath || !fs.existsSync(envPath)) throw new Error("A valid --env file is required.");
if (!fs.existsSync(chromePath)) throw new Error("A valid --chrome executable is required.");
loadEnv(envPath);

const accounts = JSON.parse(process.env.APP_REVIEW_DEMO_ACCOUNTS_JSON || "{}");
const products = [
  {
    name: "player",
    bundleId: "com.kevinhouston.hooptrackplayer",
    routes: [
      ["01-home", "/player"],
      ["02-workouts", "/player/workouts"],
      ["03-moves", "/player/moves"],
      ["04-progress", "/player/progress"],
      ["05-requests", "/player/requests"],
      ["06-profile", "/player/profile"],
    ],
  },
  {
    name: "coach",
    bundleId: "com.kevinhouston.hooptrackcoach",
    routes: [
      ["01-home", "/coach"],
      ["02-teams", "/coach/teams"],
      ["03-roster", "/coach/players"],
      ["04-workouts", "/coach/workouts"],
      ["05-activity", "/coach/activity"],
      ["06-progress", "/coach/progress"],
    ],
  },
].filter((product) => !productFilter || product.name === productFilter);
if (!products.length) throw new Error("--product must be player or coach when provided.");

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const manifest = { capturedAt: new Date().toISOString(), baseUrl, products: [] };

try {
  for (const product of products) {
    const account = accounts[product.bundleId];
    if (!account?.username || !account?.password) throw new Error(`Review account missing for ${product.bundleId}.`);
    const directory = path.join(outputRoot, product.name, "raw");
    fs.mkdirSync(directory, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      reducedMotion: "reduce",
      serviceWorkers: "block",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
    });
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      data: { email: account.username, password: account.password },
    });
    if (!login.ok()) throw new Error(`${product.name} production login returned HTTP ${login.status()}.`);
    const page = await context.newPage();
    const captures = [];

    for (const [id, route] of product.routes) {
      process.stderr.write(`Capturing ${product.name}/${id}\n`);
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(
        () => !/\bloading(?:\s+requests)?[….]*\b/i.test(document.body.innerText),
        { timeout: 8_000 },
      ).catch(() => {});
      await page.waitForTimeout(1_200);
      const bodyText = await page.locator("body").innerText();
      if (page.url().includes("/login")) throw new Error(`${product.name}/${id} redirected to login.`);
      if (/404|page could not be found/i.test(bodyText)) throw new Error(`${product.name}/${id} rendered a 404 page.`);
      if (/\bloading(?:\s+requests)?[….]*\b/i.test(bodyText)) throw new Error(`${product.name}/${id} did not finish loading.`);
      const filePath = path.join(directory, `${id}.png`);
      await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
      const buffer = fs.readFileSync(filePath);
      captures.push({
        id,
        route,
        filePath,
        width: 1290,
        height: 2796,
        sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      });
    }

    manifest.products.push({ name: product.name, bundleId: product.bundleId, captures });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.mkdirSync(outputRoot, { recursive: true });
const manifestName = productFilter ? `capture-manifest-${productFilter}.json` : "capture-manifest.json";
fs.writeFileSync(path.join(outputRoot, manifestName), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
