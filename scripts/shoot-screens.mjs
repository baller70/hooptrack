/**
 * Screenshots the implemented screens at the design pack's canvas size so they
 * can be diffed against design/hooptrack-raw-individual-screens/**.
 *
 *   node scripts/shoot-screens.mjs [routeKey ...]
 *
 * With no arguments it shoots every route in TARGETS.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.HOOPTRACK_BASE ?? 'http://localhost:3210'
const OUT = process.env.HOOPTRACK_SHOT_DIR ?? '/private/tmp/claude-501/-Users-kevinhouston/7f987f62-85d3-496b-b79f-b4204442b709/scratchpad/shots'

const COACH = { email: 'marcus@hooptrack.test', password: 'hooptrack' }
const PLAYER = { email: 'marcus.williams@email.com', password: 'hooptrack' }

// key -> [route, who, designPng]
const TARGETS = {
  'player-dashboard': ['/player', PLAYER, 'web-desktop/001-player-web-dashboard-raw.png'],
  'coach-teams': ['/coach/teams', COACH, 'web-desktop/002-coach-teams-request-flow-raw.png'],
  'player-workouts': ['/player/workouts', PLAYER, 'web-desktop/003-player-training-workspace-raw.png'],
  'coach-activity': ['/coach/activity', COACH, 'web-desktop/004-coach-activity-film-review-raw.png'],
  'coach-film': ['/coach/film', COACH, 'ios/015-coach-film-review-raw.png'],
  'coach-progress': ['/coach/progress', COACH, 'web-desktop/005-coach-progress-calendar-raw.png'],
  'coach-roster': ['/coach', COACH, null],
  'coach-players': ['/coach/players', COACH, 'ios/009-coach-roster-raw.png'],
  'coach-player-detail': ['/coach/players/19', COACH, 'ios/013-coach-player-profile-review-raw.png'],
  'player-requests': ['/player/requests', PLAYER, null],
  'player-progress': ['/player/progress', PLAYER, null],
  'player-me': ['/player/me', PLAYER, null],
  'coach-capture': ['/coach/capture', COACH, null],
  'coach-library': ['/coach/moves', COACH, null],
  'player-classroom': ['/player/classroom', PLAYER, 'ios/010-player-classroom-raw.png'],
  'player-moves': ['/player/moves', PLAYER, 'ios/007-player-move-library-raw.png'],
  'player-capture': ['/player/capture', PLAYER, 'ios/005-player-capture-setup-raw.png'],
  'player-record': ['/player/record', PLAYER, 'ios/008-player-live-recording-raw.png'],
  'player-profile': ['/player/profile', PLAYER, 'ios/012-player-profile-me-raw.png'],
  'coach-profile': ['/coach/profile', COACH, 'ios/017-coach-settings-raw.png'],
  'coach-comparison': ['/coach/comparison', COACH, null],
  'player-notifications': ['/player/notifications', PLAYER, null],
}

// The iOS apps are WKWebView shells over these same routes (see
// HooptrackPlayer/Views/RootView.swift), so --mobile reproduces exactly what
// ships inside the app and lets the ios/*.png designs be diffed for real.
const MOBILE = process.argv.includes('--mobile')
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1536, height: 1024 }

const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const keys = wanted.length ? wanted : Object.keys(TARGETS)

fs.mkdirSync(OUT, { recursive: true })

/* Cloud runners ship a pinned Chromium that rarely matches the build Playwright
 * wants, and re-downloading is often blocked. HOOPTRACK_CHROMIUM points the
 * launcher at whatever binary the environment already has. */
const browser = await chromium.launch(
  process.env.HOOPTRACK_CHROMIUM ? { executablePath: process.env.HOOPTRACK_CHROMIUM } : {},
)
const results = []

// One context per persona, reused across every route. /api/auth/login is rate
// limited to 10 requests per 15 minutes per IP, so logging in per route makes a
// full sweep fail with 429s partway through.
const contexts = new Map()

/* Sessions are cached to disk and reused across runs and across agents.
 * /api/auth/login allows 10 requests per 15 minutes and the bucket is shared
 * (requestIp() falls back to 'unknown' for localhost), so several agents
 * shooting concurrently used to 429 each other constantly. The JWT is valid for
 * 7 days; re-minting one per run was pure waste. */
const SESSION_DIR = path.join(OUT, '.sessions')
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000

function sessionFile(who) {
  return path.join(SESSION_DIR, `${who.email.replace(/[^a-z0-9]/gi, '_')}.json`)
}

async function contextFor(who) {
  const cached = contexts.get(who)
  if (cached) return cached

  const opts = { viewport: VIEWPORT, deviceScaleFactor: 1, isMobile: MOBILE, hasTouch: MOBILE }
  const file = sessionFile(who)

  // Reuse a stored session when it is recent enough to still be valid.
  try {
    const stat = fs.statSync(file)
    if (Date.now() - stat.mtimeMs < SESSION_MAX_AGE_MS) {
      const context = await browser.newContext({ ...opts, storageState: file })
      const check = await context.request.get(`${BASE}/api/auth/me`)
      if (check.ok()) {
        contexts.set(who, context)
        return context
      }
      await context.close()
    }
  } catch {
    // No cached session yet, or it is stale/unreadable — fall through and log in.
  }

  const context = await browser.newContext(opts)
  const login = await context.request.post(`${BASE}/api/auth/login`, { data: who })
  if (!login.ok()) {
    throw new Error(
      `login failed for ${who.email}: ${login.status()}` +
        (login.status() === 429
          ? ' (rate limited — a cached session will be reused once one agent gets through)'
          : ''),
    )
  }
  fs.mkdirSync(SESSION_DIR, { recursive: true })
  await context.storageState({ path: file })
  contexts.set(who, context)
  return context
}

for (const key of keys) {
  const target = TARGETS[key]
  if (!target) {
    console.error(`unknown route key: ${key}`)
    continue
  }
  const [route, who] = target
  let context
  try {
    context = await contextFor(who)
  } catch (error) {
    console.error(`${key}: ${error.message}`)
    continue
  }
  const page = await context.newPage()
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(900)
  const file = path.join(OUT, `${key}${MOBILE ? '-mobile' : ''}.png`)
  await page.screenshot({ path: file, fullPage: MOBILE })

  results.push({
    key,
    route,
    status: response?.status() ?? 0,
    finalUrl: page.url().replace(BASE, ''),
    errors: errors.slice(0, 4),
    file,
  })
  await page.close()
}

await browser.close()

for (const r of results) {
  const flag = r.status >= 400 ? 'FAIL' : r.errors.length ? 'WARN' : ' OK '
  console.log(`[${flag}] ${r.key.padEnd(18)} ${String(r.status).padEnd(4)} ${r.finalUrl}`)
  for (const e of r.errors) console.log(`         ! ${e.slice(0, 160)}`)
}
