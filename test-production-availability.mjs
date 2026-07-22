import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import Database from 'better-sqlite3'

const DEFAULT_BASE_URL = 'https://hooptrack.194-146-12-139.sslip.io'
const CHECK_COUNT = 5
const REQUEST_TIMEOUT_MS = 10_000
const ROUTES = [
  { path: '/', attempts: CHECK_COUNT },
  { path: '/coach', attempts: CHECK_COUNT },
  { path: '/api/health', attempts: CHECK_COUNT, expectJsonOk: true },
]

function normalizeBaseUrl(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function hasNextApplicationError(body) {
  return [
    'Application error',
    'a client-side exception has occurred',
    'An error occurred in the Server Components render',
    'Internal Server Error',
  ].some((message) => body.includes(message))
}

function formatError(error) {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : ''
  return `${error.message}${cause}`
}

async function getBody(response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'hooptrack-production-availability/1.0',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function assertProductionRouteAvailability(baseUrl, route) {
  const base = normalizeBaseUrl(baseUrl)
  const url = `${base}${route.path}`
  const checks = []

  for (let attempt = 1; attempt <= route.attempts; attempt += 1) {
    let response
    try {
      response = await fetchWithTimeout(url)
    } catch (error) {
      assert.fail(`attempt ${attempt}: ${url} request failed: ${formatError(error)}`)
    }
    const body = await getBody(response)
    const record = {
      path: route.path,
      attempt,
      status: response.status,
      finalUrl: response.url,
      passed: response.status >= 200 && response.status < 400 && !hasNextApplicationError(body),
    }

    assert.notEqual(response.status, 500, `attempt ${attempt}: ${url} returned HTTP 500`)
    assert.ok(
      response.status >= 200 && response.status < 400,
      `attempt ${attempt}: ${url} returned HTTP ${response.status}`
    )
    assert.equal(
      hasNextApplicationError(body),
      false,
      `attempt ${attempt}: ${url} body contained a Next.js application error`
    )
    if (route.expectJsonOk) {
      let payload
      try {
        payload = JSON.parse(body)
      } catch (error) {
        assert.fail(`attempt ${attempt}: ${url} did not return JSON: ${error.message}`)
      }
      assert.equal(payload.ok, true, `attempt ${attempt}: ${url} did not report ok=true`)
      record.ok = payload.ok
      record.service = payload.service
    }

    checks.push(record)
  }

  return {
    path: route.path,
    configured: true,
    passed: true,
    attempts: checks,
  }
}

function createPartiallyMigratedFixture(dbPath) {
  const fixture = new Database(dbPath)
  fixture.exec(`
    CREATE TABLE _migrations (version INTEGER PRIMARY KEY);
    INSERT INTO _migrations (version) VALUES (1), (2), (3), (4), (5), (6), (7), (8);

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('trainer','player')),
      ai_model TEXT DEFAULT 'Codex CLI',
      ai_credentials TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users (name, email, password_hash, role)
      VALUES ('Fixture Trainer', 'fixture@example.test', 'fixture-hash', 'trainer');

    CREATE TABLE recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES users(id),
      drill_id INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      blob_key TEXT NOT NULL UNIQUE,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      video_path TEXT,
      video_size_bytes INTEGER,
      video_mime TEXT,
      clip_start INTEGER,
      clip_end INTEGER,
      title TEXT,
      parent_recording_id INTEGER REFERENCES recordings(id)
    );

    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      context_type TEXT,
      context_id INTEGER,
      context_title TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT,
      attachment_type TEXT,
      attachment_path TEXT,
      attachment_mime TEXT,
      attachment_size_bytes INTEGER,
      attachment_duration_seconds INTEGER,
      attachment_filename TEXT
    );

    CREATE TABLE schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES users(id),
      workout_id INTEGER,
      scheduled_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT
    );
  `)
  fixture.close()
}

async function assertPartiallyMigratedDbImports() {
  const directory = mkdtempSync(join(tmpdir(), 'hooptrack-availability-'))
  const dbPath = join(directory, 'partial.db')
  const previousDbPath = process.env.HOOPTRACK_DB

  try {
    createPartiallyMigratedFixture(dbPath)
    process.env.HOOPTRACK_DB = dbPath

    const dbModule = await import(`./lib/db.ts?fixture=${Date.now()}`)
    const migratedDb = dbModule.db
    const userCount = migratedDb.prepare('SELECT COUNT(*) AS count FROM users').get().count
    const migrationVersion = migratedDb.prepare('SELECT MAX(version) AS version FROM _migrations').get().version

    assert.equal(userCount, 1, 'fixture user row count changed during migrations')
    assert.ok(migrationVersion >= 18, `expected fixture migrations to reach >= 18, got ${migrationVersion}`)

    migratedDb.close()
    globalThis.__db = undefined
  } finally {
    if (previousDbPath === undefined) {
      delete process.env.HOOPTRACK_DB
    } else {
      process.env.HOOPTRACK_DB = previousDbPath
    }
    rmSync(directory, { recursive: true, force: true })
  }
}

export async function run() {
  const baseUrl = process.env.HOOPTRACK_AVAILABILITY_BASE_URL || DEFAULT_BASE_URL
  const endpoints = []

  await assertPartiallyMigratedDbImports()
  for (const route of ROUTES) {
    endpoints.push(await assertProductionRouteAvailability(baseUrl, route))
  }

  return {
    configured: true,
    passed: true,
    baseUrl: normalizeBaseUrl(baseUrl),
    endpoints,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((result) => {
    console.log(JSON.stringify(result, null, 2))
  }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
