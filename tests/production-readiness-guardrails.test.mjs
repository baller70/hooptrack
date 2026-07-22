import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('public root stays static and database-free for anonymous health checks', () => {
  const source = read('app/page.tsx')

  assert.match(source, /export const dynamic = ['"]force-static['"]/)
  assert.doesNotMatch(source, /getSession|redirect\(|@\/lib\/db|['"]\.\/lib\/db['"]/)
  assert.match(source, /href=['"]\/player['"]/)
  assert.match(source, /href=['"]\/coach['"]/)
})

test('session and SQLite startup remain production-safe', () => {
  const sessionSource = read('lib/session.ts')
  const dbSource = read('lib/db.ts')

  assert.doesNotMatch(sessionSource, /^import\s+\{\s*db\s*\}/m)
  assert.match(sessionSource, /await import\(['"]\.\/db['"]\)/)
  assert.match(sessionSource, /WHERE id = \? AND role = ['"]player['"]/)

  assert.match(dbSource, /process\.env\.HOOPTRACK_DB/)
  assert.match(dbSource, /function safeAddColumn/)
  assert.match(dbSource, /function quoteIdentifier/)
  assert.match(dbSource, /INSERT OR IGNORE INTO _migrations/)
  assert.match(dbSource, /duplicate column name/)
})

test('live exhaustive check covers the monitored root three times and split routes', () => {
  const source = read('test-e2e-exhaustive.mjs')

  assert.match(source, /https:\/\/hooptrack\.194-146-12-139\.sslip\.io/)
  assert.match(source, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/)
  assert.match(source, /response\.status !== 200/)
  assert.match(source, /includes\(['"]HoopTrack['"]\)/)
  assert.match(source, /includes\(['"]Application error['"]\)/)
  assert.match(source, /playerHref !== ['"]\/player['"]/)
  assert.match(source, /coachHref !== ['"]\/coach['"]/)
})

test('Player app target remains pinned to the public HoopTrack origin and bundle id', () => {
  const source = read('HooptrackPlayerTests/HooptrackPlayerTests.swift')

  assert.match(source, /https:\/\/hooptrack\.194-146-12-139\.sslip\.io/)
  assert.match(source, /com\.kevinhouston\.hooptrackplayer/)
  assert.match(source, /recordingVideoURL\(id: 42\)/)
})

test('Local Model URLs are validated before save and before server fetch', () => {
  const routeSource = read('app/api/users/settings/route.ts')
  const aiSource = read('lib/ai.ts')

  assert.match(routeSource, /resolveLocalModelBaseUrl/)
  assert.match(routeSource, /return Response\.json\(\{ error: normalizedCredentials\.error \}, \{ status: 400 \}\)/)
  assert.match(aiSource, /export function resolveLocalModelBaseUrl/)
  assert.match(aiSource, /NODE_ENV === ['"]production['"]/)
  assert.match(aiSource, /new URL\(rawUrl\)/)
  assert.match(aiSource, /parsed\.protocol !== ['"]http:['"]/)
  assert.match(aiSource, /LOCAL_MODEL_DEV_HOSTS\.has\(parsed\.hostname\)/)
  assert.doesNotMatch(aiSource, /openaiCompatibleChat\(creds\.local_base_url/)
})
