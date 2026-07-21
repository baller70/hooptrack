import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import Database from 'better-sqlite3'
import { SignJWT } from 'jose'
import { hashSync } from 'bcryptjs'

const root = process.cwd()
const temporaryRoot = path.join(root, 'tmp')
await mkdir(temporaryRoot, { recursive: true })
const work = await mkdtemp(path.join(temporaryRoot, 'hooptrack-mobile-readiness-'))
const dbPath = path.join(work, 'test.db')
const recordingsPath = path.join(work, 'recordings')
const attachmentsPath = path.join(work, 'attachments')
const port = 3219
const origin = `http://127.0.0.1:${port}`
const secret = 'mobile-readiness-test-secret-is-at-least-32-bytes'
const tsconfigPath = path.join(root, 'tsconfig.json')
const originalTsconfig = await readFile(tsconfigPath)
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)], {
  cwd: root,
  env: {
    ...process.env,
    HOOPTRACK_DB: dbPath,
    RECORDINGS_DIR: recordingsPath,
    ATTACHMENTS_DIR: attachmentsPath,
    JWT_SECRET: secret,
    NEXT_DIST_DIR: path.relative(root, path.join(work, '.next')),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})

let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode != null) throw new Error(`Next exited early (${server.exitCode})\n${serverLog}`)
    try {
      const response = await fetch(origin)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for Next\n${serverLog}`)
}

async function token(user) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

async function api(route, userToken, options = {}) {
  const response = await fetch(`${origin}${route}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `hooptrack_token=${userToken}`,
      'x-forwarded-for': '127.0.0.42',
      ...options.headers,
    },
  })
  const body = await response.json()
  return { response, body }
}

try {
  await waitForServer()
  const securityResponse = await fetch(origin)
  assert.equal(securityResponse.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(securityResponse.headers.get('x-frame-options'), 'DENY')
  assert.equal(securityResponse.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  assert.match(securityResponse.headers.get('permissions-policy') ?? '', /geolocation=\(\)/)
  assert.match(securityResponse.headers.get('strict-transport-security') ?? '', /max-age=63072000/)
  const db = new Database(dbPath)
  const users = [
    { id: 1001, name: 'Release Coach', email: 'coach@release.test', role: 'trainer' },
    { id: 1002, name: 'Player One', email: 'one@release.test', role: 'player' },
    { id: 1003, name: 'Player Two', email: 'two@release.test', role: 'player' },
    { id: 1004, name: 'Other Coach', email: 'other-coach@release.test', role: 'trainer' },
    { id: 1005, name: 'Outside Player', email: 'outside@release.test', role: 'player' },
  ]
  for (const user of users) {
    db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, user.name, user.email, 'not-used-by-this-test', user.role)
  }
  const [coachToken, playerOneToken, playerTwoToken, otherCoachToken, outsidePlayerToken] = await Promise.all(users.map(token))

  const underSpecifiedRegistration = await api('/api/auth/register', playerOneToken, {
    method: 'POST', body: JSON.stringify({ name: 'No Age Gate', email: 'no-age@release.test', password: 'password', role: 'player' }),
  })
  assert.equal(underSpecifiedRegistration.response.status, 400, 'Registration must require age and legal acceptance')

  const forbidden = await api('/api/coach/groups', playerOneToken, {
    method: 'POST', body: JSON.stringify({ name: 'No Access', group_type: 'team' }),
  })
  assert.equal(forbidden.response.status, 403, 'Player must not create Coach groups')

  const apnsToken = 'a'.repeat(64)
  const wrongBundle = await api('/api/push/apns', playerOneToken, {
    method: 'POST', body: JSON.stringify({ device_token: apnsToken, environment: 'sandbox', bundle_id: 'com.kevinhouston.hooptrackcoach' }),
  })
  assert.equal(wrongBundle.response.status, 403, 'Player token must not register under Coach bundle')
  const playerBundle = await api('/api/push/apns', playerOneToken, {
    method: 'POST', body: JSON.stringify({ device_token: apnsToken, environment: 'sandbox', bundle_id: 'com.kevinhouston.hooptrackplayer' }),
  })
  assert.equal(playerBundle.response.status, 200)

  const created = await api('/api/coach/groups', coachToken, {
    method: 'POST', body: JSON.stringify({ name: 'Release Team', group_type: 'team', player_limit: 1 }),
  })
  assert.equal(created.response.status, 201)
  const groupId = Number(created.body.id)

  const unknown = await api(`/api/coach/groups/${groupId}/invites`, coachToken, {
    method: 'POST', body: JSON.stringify({ email: 'unknown@release.test' }),
  })
  assert.equal(unknown.response.status, 202)
  assert.deepEqual(unknown.body, { id: 0, status: 'queued' }, 'Unknown email response must not disclose account existence')

  for (const email of ['one@release.test', 'two@release.test']) {
    const invited = await api(`/api/coach/groups/${groupId}/invites`, coachToken, {
      method: 'POST', body: JSON.stringify({ email }),
    })
    assert.equal(invited.response.status, 201)
  }

  const invites = db.prepare('SELECT id, player_id, expires_at FROM coach_group_invites ORDER BY player_id').all()
  assert.equal(invites.length, 2)
  assert.ok(invites.every((invite) => invite.expires_at), 'Every real invitation must expire')

  const responses = await Promise.all([
    api(`/api/player/invites/${invites[0].id}/respond`, playerOneToken, { method: 'POST', body: JSON.stringify({ action: 'accept' }) }),
    api(`/api/player/invites/${invites[1].id}/respond`, playerTwoToken, { method: 'POST', body: JSON.stringify({ action: 'accept' }) }),
  ])
  assert.deepEqual(responses.map(({ response }) => response.status).sort(), [200, 409], 'Capacity race must admit exactly one Player')
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM coach_group_members WHERE group_id = ?').get(groupId).count, 1)

  const accepted = responses.find(({ response }) => response.status === 200)
  const acceptedInvite = responses.indexOf(accepted) === 0 ? invites[0] : invites[1]
  const acceptedToken = acceptedInvite.player_id === users[1].id ? playerOneToken : playerTwoToken
  const duplicate = await api(`/api/player/invites/${acceptedInvite.id}/respond`, acceptedToken, {
    method: 'POST', body: JSON.stringify({ action: 'accept' }),
  })
  assert.equal(duplicate.response.status, 409, 'Accepted invitation must not be replayable')

  const expiryGroup = await api('/api/coach/groups', coachToken, {
    method: 'POST', body: JSON.stringify({ name: 'Expiry Team', group_type: 'training_session' }),
  })
  const expiryInvite = await api(`/api/coach/groups/${expiryGroup.body.id}/invites`, coachToken, {
    method: 'POST', body: JSON.stringify({ email: 'one@release.test' }),
  })
  db.prepare("UPDATE coach_group_invites SET expires_at = datetime('now', '-1 minute') WHERE id = ?").run(expiryInvite.body.id)
  const expired = await api(`/api/player/invites/${expiryInvite.body.id}/respond`, playerOneToken, {
    method: 'POST', body: JSON.stringify({ action: 'accept' }),
  })
  assert.equal(expired.response.status, 410, 'Expired invitation must not be accepted')
  assert.equal(db.prepare('SELECT status FROM coach_group_invites WHERE id = ?').get(expiryInvite.body.id).status, 'cancelled')

  const accessGroup = await api('/api/coach/groups', coachToken, {
    method: 'POST', body: JSON.stringify({ name: 'Access Team', group_type: 'team' }),
  })
  const accessInvite = await api(`/api/coach/groups/${accessGroup.body.id}/invites`, coachToken, {
    method: 'POST', body: JSON.stringify({ email: 'outside@release.test' }),
  })
  const wrongCoachRevoke = await api(`/api/coach/groups/${accessGroup.body.id}/invites/${accessInvite.body.id}`, otherCoachToken, { method: 'DELETE' })
  assert.equal(wrongCoachRevoke.response.status, 404, 'Another Coach must not revoke an invitation')
  const revoked = await api(`/api/coach/groups/${accessGroup.body.id}/invites/${accessInvite.body.id}`, coachToken, { method: 'DELETE' })
  assert.equal(revoked.response.status, 200)
  assert.equal(db.prepare('SELECT status FROM coach_group_invites WHERE id = ?').get(accessInvite.body.id).status, 'cancelled')

  const membershipInvite = await api(`/api/coach/groups/${accessGroup.body.id}/invites`, coachToken, {
    method: 'POST', body: JSON.stringify({ email: 'outside@release.test' }),
  })
  const joined = await api(`/api/player/invites/${membershipInvite.body.id}/respond`, outsidePlayerToken, {
    method: 'POST', body: JSON.stringify({ action: 'accept' }),
  })
  assert.equal(joined.response.status, 200)

  const coachPlayers = await api('/api/players', coachToken)
  assert.deepEqual(coachPlayers.body.players.map((player) => player.id).sort(), [acceptedInvite.player_id, 1005].sort(), 'Coach must only list accepted Players')
  const coachContacts = await api('/api/users/contacts', coachToken)
  assert.deepEqual(coachContacts.body.contacts.map((contact) => contact.id).sort(), [acceptedInvite.player_id, 1005].sort(), 'Coach contacts must be membership-scoped')
  const playerContacts = await api('/api/users/contacts', outsidePlayerToken)
  assert.deepEqual(playerContacts.body.contacts.map((contact) => contact.id), [1001], 'Player contacts must be membership-scoped')

  const unauthorizedMessage = await api('/api/messages', otherCoachToken, {
    method: 'POST', body: JSON.stringify({ recipient_id: 1005, body: 'Not connected' }),
  })
  assert.equal(unauthorizedMessage.response.status, 403, 'Unconnected Coach must not message Player')
  const authorizedMessage = await api('/api/messages', coachToken, {
    method: 'POST', body: JSON.stringify({ recipient_id: 1005, body: 'Connected message' }),
  })
  assert.equal(authorizedMessage.response.status, 201)

  const reportedMessage = await api('/api/safety/report', outsidePlayerToken, {
    method: 'POST', body: JSON.stringify({ message_id: Number(authorizedMessage.body.id), reason: 'harassment', details: 'Safe release-test report' }),
  })
  assert.equal(reportedMessage.response.status, 200, 'A recipient must be able to report a received message')
  const blockedCoach = await api('/api/safety/block', outsidePlayerToken, {
    method: 'POST', body: JSON.stringify({ user_id: 1001 }),
  })
  assert.equal(blockedCoach.response.status, 200)
  const blockedMessage = await api('/api/messages', coachToken, {
    method: 'POST', body: JSON.stringify({ recipient_id: 1005, body: 'Blocked delivery must fail' }),
  })
  assert.equal(blockedMessage.response.status, 403, 'Blocking must stop messaging in both directions')
  const unblockedCoach = await api('/api/safety/block', outsidePlayerToken, {
    method: 'DELETE', body: JSON.stringify({ user_id: 1001 }),
  })
  assert.equal(unblockedCoach.response.status, 200)
  const messageAfterUnblock = await api('/api/messages', coachToken, {
    method: 'POST', body: JSON.stringify({ recipient_id: 1005, body: 'Delivery restored after unblock' }),
  })
  assert.equal(messageAfterUnblock.response.status, 201)

  const forgedViewAs = await api('/api/auth/me', otherCoachToken, {
    headers: { Cookie: `hooptrack_token=${otherCoachToken}; hooptrack_view_as=1005` },
  })
  assert.equal(forgedViewAs.body.user.id, 1004, 'A forged view-as cookie must not cross Coach ownership boundaries')
  const ownCoachNotifications = await api('/api/notifications', otherCoachToken)
  assert.equal(ownCoachNotifications.response.status, 200, 'A Coach must retain access to their own notification inbox')

  const wrongCoachRemoval = await api(`/api/coach/groups/${accessGroup.body.id}/members/1005`, otherCoachToken, { method: 'DELETE' })
  assert.equal(wrongCoachRemoval.response.status, 404, 'Another Coach must not remove a member')
  const removed = await api(`/api/coach/groups/${accessGroup.body.id}/members/1005`, coachToken, { method: 'DELETE' })
  assert.equal(removed.response.status, 200)
  const messageAfterRemoval = await api('/api/messages', coachToken, {
    method: 'POST', body: JSON.stringify({ recipient_id: 1005, body: 'Must be blocked after removal' }),
  })
  assert.equal(messageAfterRemoval.response.status, 403, 'Removed Player must immediately lose Coach messaging connection')

  const leaveGroup = await api('/api/coach/groups', coachToken, {
    method: 'POST', body: JSON.stringify({ name: 'Leave Team', group_type: 'team' }),
  })
  const leaveInvite = await api(`/api/coach/groups/${leaveGroup.body.id}/invites`, coachToken, {
    method: 'POST', body: JSON.stringify({ email: 'outside@release.test' }),
  })
  await api(`/api/player/invites/${leaveInvite.body.id}/respond`, outsidePlayerToken, {
    method: 'POST', body: JSON.stringify({ action: 'accept' }),
  })
  const wrongPlayerLeave = await api(`/api/player/memberships/${leaveGroup.body.id}`, playerOneToken, { method: 'DELETE' })
  assert.equal(wrongPlayerLeave.response.status, 404, 'Another Player must not leave someone else\'s membership')
  const left = await api(`/api/player/memberships/${leaveGroup.body.id}`, outsidePlayerToken, { method: 'DELETE' })
  assert.equal(left.response.status, 200)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM coach_group_members WHERE group_id = ? AND player_id = 1005').get(leaveGroup.body.id).count, 0)

  const deletionCoach = { id: 1010, name: 'Deletion Coach', email: 'delete-coach@release.test', role: 'trainer' }
  const retainedPlayer = { id: 1011, name: 'Retained Player', email: 'retained@release.test', role: 'player' }
  const deletionPassword = 'Delete-ready-123!'
  for (const user of [deletionCoach, retainedPlayer]) {
    db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, user.name, user.email, hashSync(deletionPassword, 4), user.role)
  }
  const deletionCoachToken = await token(deletionCoach)
  const deletionGroupId = Number(db.prepare("INSERT INTO coach_groups (coach_id, name, group_type) VALUES (?, 'Deletion Team', 'team')").run(deletionCoach.id).lastInsertRowid)
  db.prepare('INSERT INTO coach_group_members (group_id, player_id, added_by) VALUES (?, ?, ?)').run(deletionGroupId, retainedPlayer.id, deletionCoach.id)
  const deletionWorkoutId = Number(db.prepare("INSERT INTO workouts (title, category, created_by) VALUES ('Deletion Workout', 'Test', ?)").run(deletionCoach.id).lastInsertRowid)
  const deletionDrillId = Number(db.prepare("INSERT INTO drills (workout_id, name, category) VALUES (?, 'Deletion Drill', 'Test')").run(deletionWorkoutId).lastInsertRowid)
  await mkdir(recordingsPath, { recursive: true })
  await writeFile(path.join(recordingsPath, 'deletion-video.mp4'), 'safe-test-video')
  db.prepare("INSERT INTO recordings (player_id, drill_id, duration_seconds, blob_key, video_path) VALUES (?, ?, 10, 'delete-blob', 'deletion-video.mp4')")
    .run(retainedPlayer.id, deletionDrillId)
  const deletedAccount = await api('/api/account/delete', deletionCoachToken, {
    method: 'DELETE', body: JSON.stringify({ password: deletionPassword, confirmation: 'DELETE' }),
  })
  assert.equal(deletedAccount.response.status, 200, 'Coach must be able to delete their account in-app')
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users WHERE id = ?').get(deletionCoach.id).count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users WHERE id = ?').get(retainedPlayer.id).count, 1, 'Player account must survive Coach deletion')
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM coach_groups WHERE id = ?').get(deletionGroupId).count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM workouts WHERE id = ?').get(deletionWorkoutId).count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM recordings WHERE drill_id = ?').get(deletionDrillId).count, 0)
  await assert.rejects(readFile(path.join(recordingsPath, 'deletion-video.mp4')), { code: 'ENOENT' }, 'Coach-owned recording file must be removed')

  const backupPath = path.join(work, 'restored-backup.db')
  await db.backup(backupPath)
  const restored = new Database(backupPath, { readonly: true })
  assert.equal(restored.pragma('integrity_check', { simple: true }), 'ok', 'Restored SQLite backup must pass integrity_check')
  assert.equal(restored.prepare('SELECT MAX(version) AS version FROM _migrations').get().version, 19, 'Restored backup must contain the latest schema')
  assert.equal(restored.prepare('SELECT COUNT(*) AS count FROM users').get().count, db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 'Restored backup must preserve users')
  restored.close()

  console.log('mobile readiness integration: PASS')
  db.close()
} catch (error) {
  console.error(serverLog)
  throw error
} finally {
  try { process.kill(-server.pid, 'SIGTERM') } catch {}
  await new Promise((resolve) => server.once('exit', resolve))
  await writeFile(tsconfigPath, originalTsconfig)
  await rm(work, { recursive: true, force: true })
  await new Promise((resolve) => setTimeout(resolve, 100))
  await rm(temporaryRoot, { recursive: false, force: true }).catch(() => {})
}
