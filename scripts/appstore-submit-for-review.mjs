/**
 * Attaches an uploaded build to its App Store version and submits it for
 * review, via the App Store Connect API.
 *
 * This is the step after the IPA lands in App Store Connect. Producing that
 * IPA needs macOS (see scripts/appstore-release.sh); everything here is plain
 * HTTPS and runs anywhere.
 *
 *   ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=AuthKey_XXX.p8 \
 *     node scripts/appstore-submit-for-review.mjs coach --build 6
 *
 * Add --submit to actually submit. Without it the script stops after
 * attaching the build and prints what it would have done, because submitting
 * for review is not something to trigger by accident.
 *
 * Preconditions the API enforces, not this script: the version's metadata
 * must already be complete in App Store Connect — screenshots, description,
 * keywords, support URL, privacy policy URL, age rating, and pricing. If any
 * are missing the submit call fails and says which.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { SignJWT, importPKCS8 } from 'jose'

const APPS = {
  coach: { bundleId: 'com.kevinhouston.hooptrackcoach', name: 'HoopTrack Coach' },
  player: { bundleId: 'com.kevinhouston.hooptrackplayer', name: 'HoopTrack Player' },
}

const argv = process.argv.slice(2)
const appKey = argv.find((a) => !a.startsWith('-'))
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name)
  return i >= 0 ? (argv[i + 1] ?? true) : fallback
}
const wantSubmit = argv.includes('--submit')

const app = APPS[appKey]
if (!app) {
  console.error(`Usage: node scripts/appstore-submit-for-review.mjs <coach|player> --build <n> [--version 1.0] [--submit]`)
  process.exit(2)
}

const buildNumber = flag('--build')
const versionString = flag('--version', '1.0')
if (!buildNumber) {
  console.error('--build is required (the CFBundleVersion you uploaded).')
  process.exit(2)
}

// On Kevin's Mac the key App Factory uses is the one to use here too. Ask the
// same discovery helper appstore-release.sh uses, so the two never disagree
// about which account is submitting.
function discoverCredentials() {
  const helper = path.join(path.dirname(new URL(import.meta.url).pathname), 'appfactory-credentials.sh')
  if (!fs.existsSync(helper)) return {}
  const out = path.join(os.tmpdir(), `asc-creds-${process.pid}`)
  try {
    execFileSync('bash', [helper, out], { stdio: ['ignore', 'inherit', 'inherit'] })
    const found = {}
    for (const line of fs.readFileSync(out, 'utf8').split('\n')) {
      // `export NAME=value`, with value shell-quoted by printf %q.
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
let keyPath =
  process.env.ASC_KEY_PATH ||
  (keyId ? path.join(process.env.HOME ?? '', '.appstoreconnect', 'private_keys', `AuthKey_${keyId}.p8`) : '')

if (!keyId || !issuerId || !keyPath || !fs.existsSync(keyPath)) {
  const found = discoverCredentials()
  keyId = keyId || found.ASC_KEY_ID
  issuerId = issuerId || found.ASC_ISSUER_ID
  if (!keyPath || !fs.existsSync(keyPath)) keyPath = found.ASC_KEY_PATH ?? keyPath
}

if (!keyId || !issuerId || !keyPath || !fs.existsSync(keyPath)) {
  console.error('Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_KEY_PATH (or place AuthKey_<ID>.p8 in ~/.appstoreconnect/private_keys/).')
  process.exit(2)
}

const BASE = 'https://api.appstoreconnect.apple.com'

const token = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
  .setIssuer(issuerId)
  .setIssuedAt()
  .setExpirationTime('15m')
  .setAudience('appstoreconnect-v1')
  .sign(await importPKCS8(fs.readFileSync(keyPath, 'utf8'), 'ES256'))

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
  const json = text ? JSON.parse(text) : {}
  if (!response.ok) {
    const detail = (json.errors ?? [])
      .map((e) => `  ${e.title}${e.detail ? `: ${e.detail}` : ''}`)
      .join('\n')
    throw new Error(`${method} ${endpoint} -> HTTP ${response.status}\n${detail || text}`)
  }
  return json
}

const step = (message) => console.log(`==> ${message}`)

// ---- Locate the app -------------------------------------------------------
step(`Looking up ${app.name} (${app.bundleId})`)
const apps = await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(app.bundleId)}&limit=1`)
if (!apps.data?.length) {
  throw new Error(
    `No app record for ${app.bundleId}. Create it in App Store Connect first — the API cannot create app records.`,
  )
}
const appId = apps.data[0].id
console.log(`    app id ${appId}`)

// ---- Locate the build -----------------------------------------------------
step(`Finding build ${buildNumber}`)
const builds = await api(
  'GET',
  `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}&limit=1`,
)
if (!builds.data?.length) {
  throw new Error(
    `Build ${buildNumber} is not in App Store Connect yet.\n` +
      'Uploading finishes before processing does — a build takes 5-30 minutes to appear. Wait, then re-run.',
  )
}
const build = builds.data[0]
const processingState = build.attributes?.processingState
console.log(`    build id ${build.id} (${processingState})`)
if (processingState !== 'VALID') {
  throw new Error(`Build ${buildNumber} is ${processingState}, not VALID. Wait for processing, or check email for an ITMS rejection.`)
}

// ---- Locate or create the version ----------------------------------------
step(`Resolving version ${versionString}`)
const versions = await api(
  'GET',
  `/v1/apps/${appId}/appStoreVersions?filter[versionString]=${encodeURIComponent(versionString)}&limit=1`,
)
let versionId = versions.data?.[0]?.id
if (versionId) {
  console.log(`    version id ${versionId} (${versions.data[0].attributes?.appStoreState})`)
} else {
  const created = await api('POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  })
  versionId = created.data.id
  console.log(`    created version ${versionString} (${versionId})`)
}

// ---- Attach the build -----------------------------------------------------
step('Attaching the build to the version')
await api('PATCH', `/v1/appStoreVersions/${versionId}/relationships/build`, {
  data: { type: 'builds', id: build.id },
})
console.log(`    build ${buildNumber} attached`)

if (!wantSubmit) {
  console.log(
    `\nStopping here. Build ${buildNumber} is attached to version ${versionString} but NOT submitted.` +
      `\nRe-run with --submit to send it to App Review.`,
  )
  process.exit(0)
}

// ---- Submit for review ----------------------------------------------------
step('Creating the review submission')
let submissionId
const existing = await api(
  'GET',
  `/v1/reviewSubmissions?filter[app]=${appId}&filter[state]=READY_FOR_REVIEW&limit=1`,
)
if (existing.data?.length) {
  submissionId = existing.data[0].id
  console.log(`    reusing open submission ${submissionId}`)
} else {
  const created = await api('POST', '/v1/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  })
  submissionId = created.data.id
  console.log(`    submission ${submissionId}`)
}

step('Adding the version to the submission')
await api('POST', '/v1/reviewSubmissionItems', {
  data: {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
    },
  },
})

step('Submitting for review')
await api('PATCH', `/v1/reviewSubmissions/${submissionId}`, {
  data: { type: 'reviewSubmissions', id: submissionId, attributes: { submitted: true } },
})

console.log(`\n${app.name} ${versionString} (build ${buildNumber}) is submitted for App Review.`)
console.log('Apple emails on state changes; review typically takes 24-48 hours.')
