import assert from 'node:assert/strict'
import http from 'node:http'
import https from 'node:https'
import { pathToFileURL } from 'node:url'
import Database from 'better-sqlite3'

const DEFAULT_BASE_URL = 'https://hooptrack.194-146-12-139.sslip.io'
const CHECK_COUNT = 5
const REQUEST_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5
const ROUTES = [
  { path: '/', attempts: CHECK_COUNT },
  { path: '/coach', attempts: CHECK_COUNT },
  { path: '/api/health', attempts: CHECK_COUNT, expectJsonOk: true },
]

class AvailabilityCheckError extends Error {
  constructor(result) {
    super('HoopTrack production availability checks failed')
    this.name = 'AvailabilityCheckError'
    this.result = result
  }
}

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

function resolveSslipAddress(hostname) {
  const match = hostname.match(/(?:^|\.)(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.sslip\.io$/i)
  if (!match) return null
  const octets = match.slice(1).map(Number)
  if (octets.some((octet) => octet < 0 || octet > 255)) return null
  return octets.join('.')
}

function hostOverrideFor(url) {
  if (process.env.HOOPTRACK_AVAILABILITY_RESOLVE_IP) {
    return process.env.HOOPTRACK_AVAILABILITY_RESOLVE_IP
  }
  return resolveSslipAddress(new URL(url).hostname)
}

function responseFromBody(status, finalUrl, body) {
  return {
    status,
    url: finalUrl,
    text: async () => body,
  }
}

async function requestWithHostOverride(url, overrideHost, redirectsRemaining = MAX_REDIRECTS) {
  const parsed = new URL(url)
  const client = parsed.protocol === 'https:' ? https : http
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80

  return new Promise((resolve, reject) => {
    const request = client.request(
      {
        protocol: parsed.protocol,
        hostname: overrideHost,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        servername: parsed.hostname,
        headers: {
          Host: parsed.host,
          'User-Agent': 'hooptrack-production-availability/1.0',
        },
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', async () => {
          const status = response.statusCode ?? 0
          const location = response.headers.location
          if (location && status >= 300 && status < 400 && redirectsRemaining > 0) {
            try {
              const nextUrl = new URL(location, parsed).toString()
              resolve(await requestWithHostOverride(nextUrl, overrideHost, redirectsRemaining - 1))
              return
            } catch (error) {
              reject(error)
              return
            }
          }

          resolve(responseFromBody(status, url, Buffer.concat(chunks).toString('utf8')))
        })
      }
    )
    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`request timed out after ${REQUEST_TIMEOUT_MS}ms`))
    })
    request.on('error', reject)
    request.end()
  })
}

async function fetchWithTimeout(url) {
  const overrideHost = hostOverrideFor(url)
  if (overrideHost) return requestWithHostOverride(url, overrideHost)

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
    const body = await response.text().catch(() => '')
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

async function checkProductionRouteAvailability(baseUrl, route) {
  try {
    return await assertProductionRouteAvailability(baseUrl, route)
  } catch (error) {
    return {
      path: route.path,
      configured: true,
      passed: false,
      error: formatError(error),
      attempts: [],
    }
  }
}

function createPartiallyMigratedFixture() {
  const fixture = new Database(':memory:')
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
  return fixture
}

async function assertPartiallyMigratedDbImports() {
  const previousDbPath = process.env.HOOPTRACK_DB
  const fixture = createPartiallyMigratedFixture()

  try {
    process.env.HOOPTRACK_DB = ':memory:'

    const dbModule = await import(`./lib/db.ts?fixture=${Date.now()}`)
    const importedDb = dbModule.db
    const usersBefore = fixture.prepare('SELECT COUNT(*) AS count FROM users').get().count

    dbModule.runMigrations(fixture)
    const userCount = fixture.prepare('SELECT COUNT(*) AS count FROM users').get().count
    const migrationVersion = fixture.prepare('SELECT MAX(version) AS version FROM _migrations').get().version

    assert.equal(userCount, 1, 'fixture user row count changed during migrations')
    assert.ok(migrationVersion >= 18, `expected fixture migrations to reach >= 18, got ${migrationVersion}`)

    importedDb.close()
    globalThis.__db = undefined
    return {
      configured: true,
      passed: true,
      usersBefore,
      usersAfter: userCount,
      migrationVersion,
    }
  } finally {
    if (previousDbPath === undefined) {
      delete process.env.HOOPTRACK_DB
    } else {
      process.env.HOOPTRACK_DB = previousDbPath
    }
    fixture.close()
  }
}

export async function run(options = {}) {
  const baseUrl = process.env.HOOPTRACK_AVAILABILITY_BASE_URL || DEFAULT_BASE_URL
  const endpoints = []
  const checkFixture = options.checkFixture ?? process.env.HOOPTRACK_AVAILABILITY_SKIP_FIXTURE !== '1'
  const fixture = checkFixture
    ? await assertPartiallyMigratedDbImports()
    : { configured: false, passed: true, skipped: true }

  for (const route of ROUTES) {
    endpoints.push(await checkProductionRouteAvailability(baseUrl, route))
  }

  const result = {
    configured: true,
    passed: fixture.passed && endpoints.every((endpoint) => endpoint.passed),
    baseUrl: normalizeBaseUrl(baseUrl),
    fixture,
    endpoints,
  }
  if (!result.passed) throw new AvailabilityCheckError(result)
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((result) => {
    console.log(JSON.stringify(result, null, 2))
  }).catch((error) => {
    if (error?.result) {
      console.error(JSON.stringify(error.result, null, 2))
    }
    console.error(error)
    process.exitCode = 1
  })
}
