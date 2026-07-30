/**
 * Set the demo account App Review signs in with, on the current version of
 * each app.
 *
 *   node scripts/appstore-set-review-credentials.mjs \
 *     --coach-email a@b.c --coach-password '...' \
 *     --player-email d@e.f --player-password '...' --confirm
 *
 * Without --confirm it reports what is currently stored and changes nothing.
 *
 * Why this exists: the demo password lives in two places that have to agree —
 * the users row on the production backend, and App Review Information in App
 * Store Connect. Changing one without the other hands the reviewer a login
 * that does not work, which is a Guideline 2.1 rejection.
 *
 * The password is never printed. Only whether one is set, and whether the
 * value now stored matches what was passed in.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'

const APPS = [
  { key: 'coach', bundleId: 'com.kevinhouston.hooptrackcoach', name: 'HoopTrack Coach' },
  { key: 'player', bundleId: 'com.kevinhouston.hooptrackplayer', name: 'HoopTrack Player' },
]

const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const confirm = argv.includes('--confirm')

const wanted = {
  coach: { email: flag('--coach-email'), password: flag('--coach-password') },
  player: { email: flag('--player-email'), password: flag('--player-password') },
}

function discoverCredentials() {
  const helper = path.join(path.dirname(new URL(import.meta.url).pathname), 'appfactory-credentials.sh')
  if (!fs.existsSync(helper)) return {}
  const out = path.join(os.tmpdir(), `asc-setcreds-${process.pid}`)
  try {
    execFileSync('bash', [helper, out], { stdio: ['ignore', 'inherit', 'inherit'] })
    const found = {}
    for (const line of fs.readFileSync(out, 'utf8').split('\n')) {
      const m = /^export ([A-Z_]+)=(.*)$/.exec(line)
      if (m) found[m[1]] = m[2].replace(/^'(.*)'$/s, '$1').replace(/'\\''/g, "'")
    }
    return found
  } catch {
    return {}
  } finally {
    fs.rmSync(out, { force: true })
  }
}

let keyId = process.env.ASC_KEY_ID
let issuerId = process.env.ASC_ISSUER_ID
let keyPath = process.env.ASC_KEY_PATH

if (!keyId || !issuerId || !keyPath || !fs.existsSync(keyPath)) {
  const found = discoverCredentials()
  keyId = keyId || found.ASC_KEY_ID
  issuerId = issuerId || found.ASC_ISSUER_ID
  if (!keyPath || !fs.existsSync(keyPath)) keyPath = found.ASC_KEY_PATH ?? keyPath
}
if (!keyId || !issuerId || !keyPath || !fs.existsSync(keyPath)) {
  console.error('No App Store Connect key.')
  process.exit(2)
}

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const issuedAt = Math.floor(Date.now() / 1000)
const signingInput = [
  base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })),
  base64url(JSON.stringify({ iss: issuerId, iat: issuedAt, exp: issuedAt + 15 * 60, aud: 'appstoreconnect-v1' })),
].join('.')
const token = `${signingInput}.${base64url(
  crypto.sign('sha256', Buffer.from(signingInput), {
    key: fs.readFileSync(keyPath, 'utf8'),
    dsaEncoding: 'ieee-p1363',
  }),
)}`

const BASE = 'https://api.appstoreconnect.apple.com'
async function api(method, endpoint, body) {
  const response = await fetch(endpoint.startsWith('http') ? endpoint : `${BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status} on ${method} ${endpoint}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : {}
}

let changed = 0
for (const app of APPS) {
  const target = wanted[app.key]
  console.log(`\n== ${app.name}`)

  const apps = await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(app.bundleId)}&limit=1`)
  if (!apps.data?.length) {
    console.log('   no app record; skipping')
    continue
  }
  const appId = apps.data[0].id

  const versions = await api('GET', `/v1/apps/${appId}/appStoreVersions?limit=1`)
  const version = versions.data?.[0]
  if (!version) {
    console.log('   no version; skipping')
    continue
  }
  const state = version.attributes?.appStoreState
  console.log(`   version ${version.attributes?.versionString} (${state})`)

  const detail = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)
  const detailId = detail.data?.id
  const current = detail.data?.attributes ?? {}
  console.log(`   stored account: ${current.demoAccountName || '(empty)'}`)
  console.log(`   stored password: ${current.demoAccountPassword ? 'set' : 'NOT SET'}`)
  console.log(`   sign-in required: ${current.demoAccountRequired}`)

  if (!target.email || !target.password) {
    console.log('   nothing passed for this app; leaving as is')
    continue
  }
  const matches =
    current.demoAccountName === target.email && current.demoAccountPassword === target.password
  if (matches) {
    console.log('   already matches what was passed; no change needed')
    continue
  }
  if (!confirm) {
    console.log('   WOULD UPDATE (re-run with --confirm)')
    continue
  }

  await api('PATCH', `/v1/appStoreReviewDetails/${detailId}`, {
    data: {
      type: 'appStoreReviewDetails',
      id: detailId,
      attributes: {
        demoAccountName: target.email,
        demoAccountPassword: target.password,
        demoAccountRequired: true,
      },
    },
  })

  const after = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)
  const now = after.data?.attributes ?? {}
  const ok = now.demoAccountName === target.email && now.demoAccountPassword === target.password
  console.log(`   updated; App Store Connect now matches: ${ok ? 'yes' : 'NO'}`)
  if (ok) changed += 1
}

console.log(`\n${changed} app(s) updated.`)
