/**
 * Put the latest build in front of internal TestFlight testers.
 *
 *   node scripts/testflight-internal.mjs --build 25 --confirm
 *   node scripts/testflight-internal.mjs --build 25 --confirm --tester you@example.com
 *
 * Internal testing needs no beta review, so a build attached here is
 * installable on a device within minutes of processing finishing.
 *
 * Without --confirm this reports the current groups, their builds and their
 * testers, and changes nothing.
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
const flag = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : fallback
}
const confirm = argv.includes('--confirm')
const buildNumber = flag('--build')
const testerEmail = flag('--tester')
const groupName = flag('--group', 'App Factory Internal')

function discoverCredentials() {
  const helper = path.join(path.dirname(new URL(import.meta.url).pathname), 'appfactory-credentials.sh')
  if (!fs.existsSync(helper)) return {}
  const out = path.join(os.tmpdir(), `asc-tf-${process.pid}`)
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

for (const app of APPS) {
  console.log(`\n== ${app.name}`)
  const apps = await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(app.bundleId)}&limit=1`)
  if (!apps.data?.length) {
    console.log('   no app record; skipping')
    continue
  }
  const appId = apps.data[0].id

  // Find the build to hand out.
  const query = buildNumber
    ? `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}&limit=1`
    : `/v1/builds?filter[app]=${appId}&limit=1&sort=-uploadedDate`
  const builds = await api('GET', query)
  const build = builds.data?.[0]
  if (!build) {
    console.log(`   build ${buildNumber ?? '(latest)'} not found; skipping`)
    continue
  }
  const state = build.attributes?.processingState
  console.log(`   build ${build.attributes?.version} (${state})`)
  if (state !== 'VALID') {
    console.log('   not VALID yet; TestFlight cannot hand out a build still processing')
    continue
  }

  // Reuse an internal group if there is one; internal groups skip beta review.
  const groups = await api('GET', `/v1/apps/${appId}/betaGroups?limit=20`)
  let group = (groups.data ?? []).find(
    (g) => g.attributes?.isInternalGroup && g.attributes?.name === groupName,
  ) ?? (groups.data ?? []).find((g) => g.attributes?.isInternalGroup)

  if (!group) {
    if (!confirm) {
      console.log(`   WOULD CREATE internal group "${groupName}" (re-run with --confirm)`)
      continue
    }
    const created = await api('POST', '/v1/betaGroups', {
      data: {
        type: 'betaGroups',
        attributes: { name: groupName, isInternalGroup: true },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    })
    group = created.data
    console.log(`   created internal group ${group.id}`)
  }
  console.log(`   internal group "${group.attributes?.name}" (${group.id})`)

  const groupBuilds = await api('GET', `/v1/betaGroups/${group.id}/builds?limit=20`)
  const already = (groupBuilds.data ?? []).some((b) => b.id === build.id)
  if (already) {
    console.log('   build already in this group')
  } else if (!confirm) {
    console.log('   WOULD ATTACH the build to this group (re-run with --confirm)')
  } else {
    await api('POST', `/v1/betaGroups/${group.id}/relationships/builds`, {
      data: [{ type: 'builds', id: build.id }],
    })
    console.log('   build attached')
  }

  const testers = await api('GET', `/v1/betaGroups/${group.id}/betaTesters?limit=50`)
  console.log(`   testers in group: ${testers.data?.length ?? 0}`)
  // state is the difference between "Apple sent it" and "he can install it":
  // INVITED means the invitation is out and unaccepted, ACCEPTED means the
  // Apple ID is linked, INSTALLED means it is on a device.
  for (const tester of testers.data ?? []) {
    const a = tester.attributes ?? {}
    console.log(
      `     - ${a.email ?? '(no email)'} — state ${a.state ?? 'unknown'}` +
        `, invite ${a.inviteType ?? 'unknown'}`,
    )
  }

  if (testerEmail) {
    const existing = (testers.data ?? []).find(
      (t) => t.attributes?.email?.toLowerCase() === testerEmail.toLowerCase(),
    )
    if (existing) {
      console.log(`   ${testerEmail} is already a tester`)
    } else if (!confirm) {
      console.log(`   WOULD INVITE ${testerEmail} (re-run with --confirm)`)
    } else {
      await api('POST', '/v1/betaTesters', {
        data: {
          type: 'betaTesters',
          attributes: { email: testerEmail, firstName: 'Kevin', lastName: 'Houston' },
          relationships: { betaGroups: { data: [{ type: 'betaGroups', id: group.id }] } },
        },
      })
      console.log(`   invited ${testerEmail} — check that inbox, then open TestFlight on the phone`)
    }
  }
}

console.log('\nInternal testers can install as soon as they accept; no beta review needed.')
