import puppeteer from "puppeteer";

const BASE = "https://hooptrack.89-167-33-236.sslip.io";
let browser, page;
const results = [];

function log(test, pass, detail) {
  const status = pass ? "PASS" : "FAIL";
  results.push({ test, status, detail });
  console.log(`${status}: ${test}${detail ? " — " + detail : ""}`);
}

try {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    executablePath: "/usr/bin/google-chrome",
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const jsErrors = [];
  page.on("pageerror", (err) => jsErrors.push(err.message));

  // TEST 1: Landing page
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 15000 });
  const title = await page.title();
  log("Landing page loads", title.includes("HoopTrack"), "Title: " + title);

  // TEST 2: Register
  await page.goto(BASE + "/register", { waitUntil: "networkidle2" });
  await page.type("#name", "Puppeteer Coach");
  await page.type("#email", "pup" + Date.now() + "@test.com");
  await page.type("#password", "testpass123");
  await page.select("#role", "trainer");
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  const afterRegUrl = page.url();
  log("Register + redirect", afterRegUrl.includes("/dashboard"), "URL: " + afterRegUrl);

  // TEST 3: Workouts page
  await page.goto(BASE + "/dashboard/workouts", { waitUntil: "networkidle2", timeout: 15000 });
  const wkHeader = await page.$eval("h2", el => el.textContent).catch(() => "");
  log("Workouts page renders", wkHeader.includes("Workouts"), "Header: " + wkHeader);

  // TEST 4: Moves page
  await page.goto(BASE + "/dashboard/moves", { waitUntil: "networkidle2", timeout: 15000 });
  const mvHeader = await page.$eval("h2", el => el.textContent).catch(() => "");
  log("Moves page renders", mvHeader.includes("Moves"), "Header: " + mvHeader);

  // TEST 5: Click AI recommendations button
  const buttons = await page.$$("button");
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes("Get AI Move Recommendations")) {
      await btn.click();
      break;
    }
  }

  console.log("  Waiting for AI recommendations (Claude CLI, up to 90s)...");
  let recsFound = false;
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const cards = await page.$$('div[class*="border-purple-200"]');
    if (cards.length > 0) {
      recsFound = true;
      log("AI recommendations loaded", true, cards.length + " cards");
      break;
    }
  }
  if (!recsFound) log("AI recommendations loaded", false, "Timed out 90s");

  // TEST 6: Click + to add first recommendation
  if (recsFound) {
    const plusBtns = await page.$$('button[title="Add to catalog with video"]');
    if (plusBtns.length > 0) {
      console.log("  Clicking + on first recommendation...");
      await plusBtns[0].click();

      let addDone = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const checks = await page.$$(".text-green-600");
        if (checks.length > 0) { addDone = true; break; }
      }
      log("Click + adds move with video", addDone, addDone ? "Green check appeared" : "Timed out");
    } else {
      log("Click + adds move with video", false, "No + buttons found");
    }

    // TEST 7: Verify move has real YouTube URL via API
    const movesData = await page.evaluate(async () => {
      const res = await fetch("/api/moves");
      return res.json();
    });
    const withVideo = (movesData.moves || []).filter(m => m.youtube_url && m.youtube_url.includes("youtube.com/watch"));
    log("Move has real YouTube URL", withVideo.length > 0,
      withVideo.length > 0 ? withVideo[0].youtube_url : "No video URL");

    // TEST 8: Expand move — video player loads
    if (withVideo.length > 0) {
      // Reload moves page to see the new move in catalog
      await page.goto(BASE + "/dashboard/moves", { waitUntil: "networkidle2", timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      // Click on the move card to expand
      const allCards = await page.$$("div.cursor-pointer");
      for (const card of allCards) {
        const text = await card.evaluate(el => el.textContent);
        if (text.includes(withVideo[0].title)) {
          await card.click();
          await new Promise(r => setTimeout(r, 3000));
          break;
        }
      }

      const iframe = await page.$("iframe");
      log("Move expands with YouTube video", iframe !== null, iframe ? "iframe loaded" : "No iframe");

      // Check for Edit Clip button
      const hasEditClip = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Edit Clip"));
      });
      log("Edit Clip button visible", hasEditClip, hasEditClip ? "Found" : "Not found");
    }
  }

  // TEST 9: Other pages
  for (const p of ["/dashboard/calendar", "/dashboard/classroom", "/dashboard/comparison", "/dashboard/record"]) {
    await page.goto(BASE + p, { waitUntil: "networkidle2", timeout: 10000 });
    log(p + " loads", page.url().includes(p), "OK");
  }

  // TEST 10: Profile + Sign Out
  await page.goto(BASE + "/dashboard/profile", { waitUntil: "networkidle2", timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
  const hasSignOut = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Sign Out"));
  });
  log("Profile has Sign Out", hasSignOut, hasSignOut ? "Found" : "Not found");

  if (hasSignOut) {
    const allBtns = await page.$$("button");
    for (const btn of allBtns) {
      const t = await btn.evaluate(el => el.textContent);
      if (t.includes("Sign Out")) { await btn.click(); break; }
    }
    await new Promise(r => setTimeout(r, 3000));
    log("Sign Out works", page.url().includes("/login"), "URL: " + page.url());
  }

  // TEST 11: JS errors
  log("No JS errors", jsErrors.length === 0, jsErrors.length > 0 ? jsErrors.join("; ") : "Clean");

} catch (err) {
  console.error("TEST CRASH:", err.message);
} finally {
  if (browser) await browser.close();
}

// SUMMARY
console.log("\n========================================");
console.log("       PUPPETEER TEST RESULTS");
console.log("========================================");
const passed = results.filter(r => r.status === "PASS").length;
const failed = results.filter(r => r.status === "FAIL").length;
console.log("  PASSED: " + passed);
console.log("  FAILED: " + failed);
console.log("  TOTAL:  " + results.length);
console.log("========================================");
if (failed > 0) {
  console.log("\nFAILURES:");
  results.filter(r => r.status === "FAIL").forEach(r => {
    console.log("  " + r.test + " — " + r.detail);
  });
}
