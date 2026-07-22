import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { run as runAvailabilityChecks } from '../test-production-availability.mjs'

test('/coach redirects before importing the SQLite runtime module', () => {
  const source = readFileSync(join(process.cwd(), 'app/coach/page.tsx'), 'utf8')
  const unauthenticatedRedirect = source.indexOf("if (!session) redirect('/login')")
  const roleRedirect = source.indexOf("redirect('/player')")
  const runtimeDbImport = source.indexOf("await import('@/lib/db')")

  assert.equal(
    /import\s+\{\s*db\s*\}\s+from\s+['"]@\/lib\/db['"]/.test(source),
    false,
    'app/coach/page.tsx must not import db at module scope'
  )
  assert.ok(runtimeDbImport > unauthenticatedRedirect, 'db import must happen after the logged-out redirect')
  assert.ok(runtimeDbImport > roleRedirect, 'db import must happen after the non-trainer redirect')
})

test('availability runner checks home, coach, and health endpoints repeatedly', async () => {
  const requestCounts = new Map()
  const previousBaseUrl = process.env.HOOPTRACK_AVAILABILITY_BASE_URL
  const previousFetch = globalThis.fetch
  process.env.HOOPTRACK_AVAILABILITY_BASE_URL = 'https://availability.test'
  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(url)
    requestCounts.set(parsedUrl.pathname, (requestCounts.get(parsedUrl.pathname) ?? 0) + 1)

    if (parsedUrl.pathname === '/api/health') {
      return new Response(JSON.stringify({ ok: true, service: 'hooptrack' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (parsedUrl.pathname === '/coach') {
      return new Response('<main>Login</main>', { status: 200 })
    }
    if (parsedUrl.pathname === '/') {
      return new Response('<main>HoopTrack</main>', { status: 200 })
    }

    return new Response('not found', { status: 404 })
  }

  try {
    const result = await runAvailabilityChecks({ checkFixture: false })

    assert.equal(result.configured, true)
    assert.equal(result.passed, true)
    assert.deepEqual(result.endpoints.map((endpoint) => endpoint.path), ['/', '/coach', '/api/health'])
    assert.equal(requestCounts.get('/'), 5)
    assert.equal(requestCounts.get('/coach'), 5)
    assert.equal(requestCounts.get('/api/health'), 5)
    assert.ok(result.endpoints.every((endpoint) => endpoint.configured && endpoint.passed))
    assert.ok(result.endpoints.every((endpoint) => endpoint.attempts.length === 5))
    assert.equal(result.fixture.skipped, true)
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.HOOPTRACK_AVAILABILITY_BASE_URL
    } else {
      process.env.HOOPTRACK_AVAILABILITY_BASE_URL = previousBaseUrl
    }
    globalThis.fetch = previousFetch
  }
})

test('availability runner fixture preserves users while completing migrations', async () => {
  const previousBaseUrl = process.env.HOOPTRACK_AVAILABILITY_BASE_URL
  const previousFetch = globalThis.fetch
  process.env.HOOPTRACK_AVAILABILITY_BASE_URL = 'https://availability.test'
  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.pathname === '/api/health') {
      return new Response(JSON.stringify({ ok: true, service: 'hooptrack' }), { status: 200 })
    }
    return new Response('<main>HoopTrack</main>', { status: 200 })
  }

  try {
    const result = await runAvailabilityChecks()

    assert.equal(result.fixture.configured, true)
    assert.equal(result.fixture.passed, true)
    assert.equal(result.fixture.usersBefore, 1)
    assert.equal(result.fixture.usersAfter, 1)
    assert.ok(result.fixture.migrationVersion >= 18)
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.HOOPTRACK_AVAILABILITY_BASE_URL
    } else {
      process.env.HOOPTRACK_AVAILABILITY_BASE_URL = previousBaseUrl
    }
    globalThis.fetch = previousFetch
  }
})

test('availability runner reports fixture evidence when live endpoints fail', async () => {
  const previousBaseUrl = process.env.HOOPTRACK_AVAILABILITY_BASE_URL
  const previousFetch = globalThis.fetch
  process.env.HOOPTRACK_AVAILABILITY_BASE_URL = 'https://availability.test'
  globalThis.fetch = async () => {
    throw new Error('network blocked')
  }

  try {
    await assert.rejects(
      runAvailabilityChecks(),
      (error) => {
        assert.equal(error.name, 'AvailabilityCheckError')
        assert.equal(error.result.configured, true)
        assert.equal(error.result.passed, false)
        assert.equal(error.result.fixture.passed, true)
        assert.equal(error.result.fixture.usersBefore, 1)
        assert.equal(error.result.fixture.usersAfter, 1)
        assert.equal(error.result.endpoints.length, 3)
        assert.ok(error.result.endpoints.every((endpoint) => endpoint.configured && !endpoint.passed))
        return true
      }
    )
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.HOOPTRACK_AVAILABILITY_BASE_URL
    } else {
      process.env.HOOPTRACK_AVAILABILITY_BASE_URL = previousBaseUrl
    }
    globalThis.fetch = previousFetch
  }
})
