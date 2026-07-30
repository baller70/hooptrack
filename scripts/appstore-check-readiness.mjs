/**
 * Read-only App Store Connect status for both HoopTrack apps: whether the app
 * record exists, what versions are there, and which builds have been uploaded.
 *
 * Answers "can we actually submit?" without changing anything. Used by the
 * preflight workflow and safe to run by hand.
 *
 *   ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=AuthKey_XXX.p8 \
 *     node scripts/appstore-check-readiness.mjs
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

// Same key App Factory uses, found the same way appstore-release.sh finds it.
function discoverCredentials() {
  const helper = path.join(path.dirname(new URL(import.meta.url).pathname), 'appfactory-credentials.sh')
  if (!fs.existsSync(helper)) return {}
  const out = path.join(os.tmpdir(), `asc-readiness-${process.pid}`)
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
  console.error('Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_KEY_PATH.')
  process.exit(2)
}

// node:crypto rather than jose: the Mac runner has no npm. ieee-p1363 is the
// concatenated (r||s) encoding JWS needs; DER is rejected by Apple.
const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const issuedAt = Math.floor(Date.now() / 1000)
const signingInput = [
  base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })),
  base64url(JSON.stringify({
    iss: issuerId,
    iat: issuedAt,
    exp: issuedAt + 15 * 60,
    aud: 'appstoreconnect-v1',
  })),
].join('.')

const token = `${signingInput}.${base64url(
  crypto.sign('sha256', Buffer.from(signingInput), {
    key: fs.readFileSync(keyPath, 'utf8'),
    dsaEncoding: 'ieee-p1363',
  }),
)}`

const api = async (endpoint) => {
  const response = await fetch(`https://api.appstoreconnect.apple.com${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status} on ${endpoint}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

const lines = ['', '## App Store Connect status', '']
let blocked = false

for (const app of APPS) {
  lines.push(`### ${app.name}`, '')
  let record
  try {
    record = await api(`/v1/apps?filter[bundleId]=${encodeURIComponent(app.bundleId)}&limit=1`)
  } catch (err) {
    lines.push(`- API error: ${err.message}`, '')
    blocked = true
    continue
  }

  if (!record.data?.length) {
    lines.push(
      `- **No app record for \`${app.bundleId}\`.**`,
      '  Create it in App Store Connect — the API cannot create app records.',
      '',
    )
    blocked = true
    continue
  }

  const appId = record.data[0].id
  lines.push(`- App record: \`${appId}\``)

  const versions = await api(`/v1/apps/${appId}/appStoreVersions?limit=5`)
  if (!versions.data?.length) {
    lines.push('- No versions yet.')
    blocked = true
  } else {
    for (const version of versions.data) {
      lines.push(`- Version ${version.attributes?.versionString}: **${version.attributes?.appStoreState}**`)
    }
  }

  const builds = await api(`/v1/builds?filter[app]=${appId}&limit=5&sort=-uploadedDate`)
  if (!builds.data?.length) {
    lines.push('- No builds uploaded yet.')
    blocked = true
  } else {
    for (const build of builds.data) {
      lines.push(`- Build ${build.attributes?.version}: ${build.attributes?.processingState}`)
    }
  }

  // TestFlight: an internal group needs the build attached before it shows up
  // in the TestFlight app on a device. Internal testing needs no beta review,
  // so this is the fastest way onto a phone.
  try {
    const groups = await api(`/v1/apps/${appId}/betaGroups?limit=10`)
    if (!groups.data?.length) {
      lines.push('- TestFlight: no beta groups.')
    } else {
      for (const group of groups.data) {
        const kind = group.attributes?.isInternalGroup ? 'internal' : 'external'
        const groupBuilds = await api(`/v1/betaGroups/${group.id}/builds?limit=10`)
        const versionsInGroup = (groupBuilds.data ?? [])
          .map((b) => b.attributes?.version)
          .filter(Boolean)
        const testers = await api(`/v1/betaGroups/${group.id}/betaTesters?limit=10`)
        lines.push(
          `- TestFlight ${kind} group "${group.attributes?.name}" (\`${group.id}\`): ` +
            `builds [${versionsInGroup.join(', ') || 'none'}], ${testers.data?.length ?? 0} tester(s)`,
        )
      }
    }
  } catch (err) {
    lines.push(`- Could not read TestFlight groups: ${err.message}`)
  }

  // Whether App Review can actually log in. Wrong or missing demo credentials
  // are the most common first-submission rejection.
  try {
    const versionForReview = versions.data?.[0]
    if (versionForReview) {
      const detail = await api(`/v1/appStoreVersions/${versionForReview.id}/appStoreVersionSubmission`)
        .catch(() => null)
      const review = await api(`/v1/appStoreVersions/${versionForReview.id}/appStoreReviewDetail`)
      const attrs = review.data?.attributes ?? {}
      lines.push(
        `- Review sign-in required: ${attrs.demoAccountRequired === true ? 'yes' : attrs.demoAccountRequired === false ? 'NO (reviewer will not be given a login)' : 'unset'}`,
      )
      lines.push(`- Demo account name in review notes: ${attrs.demoAccountName ? `\`${attrs.demoAccountName}\`` : '**empty**'}`)
      lines.push(`- Demo password set: ${attrs.demoAccountPassword ? 'yes' : '**no**'}`)
      // Off by default. Kevin asked for this explicitly: the production
      // database and App Store Connect disagree about the coach demo password,
      // and printing the value Apple already stores lets the database be
      // pointed back at it. That way Apple's copy is never edited and the
      // queued submission is not disturbed. Only ever set this for a single
      // run on a private repository.
      if (process.env.HOOPTRACK_SHOW_DEMO_LOGIN === '1' && attrs.demoAccountPassword) {
        lines.push(`- demoAccountName: ${attrs.demoAccountName}`)
        lines.push(`- demoAccountPassword: ${attrs.demoAccountPassword}`)
      }
      void detail
    }
  } catch (err) {
    lines.push(`- Could not read App Review Information: ${err.message}`)
  }

  // The version's appStoreState is what "is it still under review" actually
  // means. WAITING_FOR_REVIEW is queued, IN_REVIEW is being looked at, and
  // REJECTED / DEVELOPER_REJECTED mean it left review and needs action.
  try {
    const submissions = await api(`/v1/reviewSubmissions?filter[app]=${appId}&limit=5`)
    if (!submissions.data?.length) {
      lines.push('- No review submission on record.')
    } else {
      for (const submission of submissions.data) {
        const state = submission.attributes?.state
        const submitted = submission.attributes?.submittedDate ?? 'not submitted'
        lines.push(`- Review submission \`${submission.id}\`: **${state}** (submitted ${submitted})`)
      }
    }
  } catch (err) {
    lines.push(`- Could not read review submissions: ${err.message}`)
  }
  lines.push('')
}

lines.push(blocked ? '**Not ready to submit.**' : '**App records, versions and builds are all present.**', '')
console.log(lines.join('\n'))
