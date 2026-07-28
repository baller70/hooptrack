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
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { SignJWT, importPKCS8 } from 'jose'

const APPS = [
  { key: 'coach', bundleId: 'com.kevinhouston.hooptrackcoach', name: 'HoopTrack Coach' },
  { key: 'player', bundleId: 'com.kevinhouston.hooptrackplayer', name: 'HoopTrack Player' },
]

const keyId = process.env.ASC_KEY_ID
const issuerId = process.env.ASC_ISSUER_ID
const keyPath =
  process.env.ASC_KEY_PATH ||
  (keyId ? path.join(process.env.HOME ?? '', '.appstoreconnect', 'private_keys', `AuthKey_${keyId}.p8`) : '')

if (!keyId || !issuerId || !keyPath || !fs.existsSync(keyPath)) {
  console.error('Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_KEY_PATH.')
  process.exit(2)
}

const token = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
  .setIssuer(issuerId)
  .setIssuedAt()
  .setExpirationTime('15m')
  .setAudience('appstoreconnect-v1')
  .sign(await importPKCS8(fs.readFileSync(keyPath, 'utf8'), 'ES256'))

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
  lines.push('')
}

lines.push(blocked ? '**Not ready to submit.**' : '**Ready to attach a build and submit.**', '')
console.log(lines.join('\n'))
