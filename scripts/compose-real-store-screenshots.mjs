#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const root = path.resolve(process.argv[2] || ".factory/approved-real-screenshots");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const campaigns = {
  player: [
    ["01-home", "arena-entry.png", "HOOPTRACK PLAYER", "Train smarter.\\nEvery day.", false],
    ["02-workouts", "performance-lab.png", "HOOPTRACK PLAYER", "Build a plan.\\nFinish the work.", false],
    ["03-moves", "performance-lab.png", "HOOPTRACK PLAYER", "Study every move.\\nOwn the detail.", true],
    ["04-progress", "progress-arena.png", "HOOPTRACK PLAYER", "See your game\\ngrow.", false],
    ["05-requests", "arena-entry.png", "HOOPTRACK PLAYER", "Stay connected\\nto your team.", true],
    ["06-profile", "progress-arena.png", "HOOPTRACK PLAYER", "Your game.\\nYour account.", true],
  ],
  coach: [
    ["01-home", "command-center.png", "HOOPTRACK COACH", "Run your program\\nfrom one place.", false],
    ["02-teams", "strategy-bench.png", "HOOPTRACK COACH", "Build teams.\\nInvite players.", false],
    ["03-roster", "strategy-bench.png", "HOOPTRACK COACH", "Know every player.\\nMove faster.", true],
    ["04-workouts", "command-center.png", "HOOPTRACK COACH", "Create workouts\\nthat get done.", true],
    ["05-activity", "film-room.png", "HOOPTRACK COACH", "See every rep.\\nReview the work.", false],
    ["06-progress", "film-room.png", "HOOPTRACK COACH", "Turn activity\\ninto progress.", true],
  ],
};

const manifest = { composedAt: new Date().toISOString(), renderer: "Chrome CSS compositor", products: [] };

function imageDataUrl(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function composeFrame(page, { background, source, output, kicker, headline, flip }) {
  const backgroundTransform = flip ? "scaleX(-1)" : "none";
  const displayHeadline = escapeHtml(headline.replaceAll("\\n", "\n"));
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; width: 1290px; height: 2796px; overflow: hidden; background: #050505; }
          body { position: relative; font-family: Arial, Helvetica, sans-serif; }
          .background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: ${backgroundTransform}; }
          .scrim { position: absolute; inset: 0 0 auto; height: 760px; background: linear-gradient(to bottom, rgba(0,0,0,.96), rgba(0,0,0,.08)); }
          .card { position: absolute; left: 118px; top: 568px; width: 1054px; height: 2220px; border-radius: 58px; background: #fff; box-shadow: 0 24px 56px rgba(0,0,0,.62); }
          .screen { position: absolute; left: 143px; top: 590px; width: 1004px; height: 2176px; border-radius: 40px; object-fit: fill; }
          .kicker { position: absolute; left: 86px; top: 74px; display: flex; align-items: center; gap: 22px; color: #ff6a14; font-size: 31px; font-weight: 800; line-height: 1; letter-spacing: 0; }
          .rule { width: 58px; height: 9px; border-radius: 5px; background: #ff5c08; }
          .headline { position: absolute; left: 82px; top: 158px; width: 1125px; color: #fff; font-family: "Arial Black", Arial, Helvetica, sans-serif; font-size: 112px; font-weight: 900; line-height: .98; letter-spacing: 0; white-space: pre-line; text-shadow: 0 4px 18px rgba(0,0,0,.62); }
        </style>
      </head>
      <body>
        <img class="background" src="${imageDataUrl(background)}" alt="">
        <div class="scrim"></div>
        <div class="card"></div>
        <img class="screen" src="${imageDataUrl(source)}" alt="Exact HoopTrack production screen">
        <div class="kicker"><span class="rule"></span><span>${escapeHtml(kicker)}</span></div>
        <div class="headline">${displayHeadline}</div>
      </body>
    </html>`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: output, type: "png", fullPage: false });
}

if (!fs.existsSync(chromePath)) throw new Error(`Chrome executable missing: ${chromePath}`);
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
const page = await context.newPage();

try {
for (const [product, scenes] of Object.entries(campaigns)) {
  const outputDirectory = path.join(root, product, "final");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputs = [];

  for (const [id, backgroundName, kicker, headline, flip] of scenes) {
    const source = path.join(root, product, "raw", `${id}.png`);
    const background = path.join(root, "backgrounds", product, backgroundName);
    const output = path.join(outputDirectory, `${id}.png`);
    for (const required of [source, background]) {
      if (!fs.existsSync(required)) throw new Error(`Required asset missing: ${required}`);
    }
    await composeFrame(page, { background, source, output, kicker, headline, flip });
    const sourceBuffer = fs.readFileSync(source);
    const outputBuffer = fs.readFileSync(output);
    outputs.push({
      id,
      headline: headline.replaceAll("\\n", " "),
      source,
      sourceSha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
      background,
      output,
      outputSha256: crypto.createHash("sha256").update(outputBuffer).digest("hex"),
      width: 1290,
      height: 2796,
    });
  }

  manifest.products.push({ product, outputs });
}
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(root, "composition-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
