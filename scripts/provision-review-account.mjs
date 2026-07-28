/**
 * Creates the two demo accounts Apple's App Review team needs to get past the
 * login screen — one coach, one player — and gives them just enough content
 * that the reviewer does not land on empty screens.
 *
 * Unlike seed-design-data.mjs this is safe to run against a populated
 * database: it never deletes, never truncates, and only ever touches the two
 * designated review accounts. Re-running it resets their passwords, which is
 * what you want when a review cycle comes back months later.
 *
 *   HOOPTRACK_REVIEW_CONFIRM=yes node scripts/provision-review-account.mjs
 *
 * Override the defaults with REVIEW_COACH_EMAIL, REVIEW_PLAYER_EMAIL, and
 * REVIEW_PASSWORD. The password is printed at the end for the review notes;
 * it is not a secret, but do not reuse a real account's password here.
 */
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import process from 'node:process'

if (process.env.HOOPTRACK_REVIEW_CONFIRM !== 'yes') {
  console.error('Refusing to run: set HOOPTRACK_REVIEW_CONFIRM=yes to proceed.')
  process.exit(1)
}

const coachEmail = process.env.REVIEW_COACH_EMAIL ?? 'appreview.coach@hooptrack.app'
const playerEmail = process.env.REVIEW_PLAYER_EMAIL ?? 'appreview.player@hooptrack.app'
const plainPassword = process.env.REVIEW_PASSWORD ?? 'AppReview2026!'

if (coachEmail === playerEmail) {
  console.error('Refusing to run: coach and player review emails must differ.')
  process.exit(1)
}

const dbPath = process.env.HOOPTRACK_DB_PATH ?? path.join(process.cwd(), 'data', 'hooptrack.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const passwordHash = bcrypt.hashSync(plainPassword, 12)

// The users table gained columns through migrations, and a production database
// may sit at a different migration level than a fresh one. Only write columns
// that actually exist here.
const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name))
const optional = (values) =>
  Object.entries(values).filter(([column]) => userColumns.has(column))

const upsertUser = (name, email, role, extras = {}) => {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)

  if (existing) {
    db.prepare('UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?')
      .run(name, passwordHash, role, existing.id)
    console.log(`  updated  ${role.padEnd(7)} ${email} (id ${existing.id})`)
    return existing.id
  }

  const extra = optional(extras)
  const columns = ['name', 'email', 'password_hash', 'role', ...extra.map(([c]) => c)]
  const values = [name, email, passwordHash, role, ...extra.map(([, v]) => v)]
  const id = db
    .prepare(`INSERT INTO users (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    .run(...values).lastInsertRowid
  console.log(`  created  ${role.padEnd(7)} ${email} (id ${id})`)
  return id
}

db.exec('BEGIN')
try {
  const coachId = upsertUser('App Review Coach', coachEmail, 'trainer')
  const playerId = upsertUser('App Review Player', playerEmail, 'player', {
    position_abbr: 'SG',
    jersey_number: 1,
    position: 'Shooting Guard',
    grade_level: '11th Grade',
    school: 'HoopTrack Academy',
  })

  // A reviewer who logs in to a completely empty app tends to read it as
  // incomplete, so give the coach a team with the player already on it.
  let group = db
    .prepare("SELECT id FROM coach_groups WHERE coach_id = ? AND name = 'App Review Team'")
    .get(coachId)
  if (!group) {
    const groupId = db
      .prepare(
        `INSERT INTO coach_groups (coach_id, name, group_type, player_limit, description)
         VALUES (?, 'App Review Team', 'team', NULL, 'Demo roster for App Store review.')`,
      )
      .run(coachId).lastInsertRowid
    group = { id: groupId }
    console.log(`  created  team    "App Review Team" (id ${groupId})`)
  }

  db.prepare(
    `INSERT OR IGNORE INTO coach_group_members (group_id, player_id, added_by)
     VALUES (?, ?, ?)`,
  ).run(group.id, playerId, coachId)

  // One workout so the training tab has something to open.
  let workout = db
    .prepare("SELECT id FROM workouts WHERE created_by = ? AND title = 'Shooting Fundamentals'")
    .get(coachId)
  if (!workout) {
    const workoutId = db
      .prepare(
        `INSERT INTO workouts (title, description, category, created_by)
         VALUES ('Shooting Fundamentals', 'Demo workout for App Store review.', 'Shooting', ?)`,
      )
      .run(coachId).lastInsertRowid
    const insertDrill = db.prepare(
      `INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order)
       VALUES (?, ?, ?, 'Shooting', ?, ?)`,
    )
    ;[
      ['Form Shooting', 'Close-range shooting focused on release mechanics.', 300, 0],
      ['Catch and Shoot', 'Spot-up shooting off a simulated pass.', 420, 1],
      ['Free Throws', 'Ten free throws at game pace.', 300, 2],
    ].forEach(([name, description, seconds, order]) =>
      insertDrill.run(workoutId, name, description, seconds, order),
    )
    console.log(`  created  workout "Shooting Fundamentals" with 3 drills (id ${workoutId})`)
  }

  db.exec('COMMIT')
} catch (err) {
  db.exec('ROLLBACK')
  console.error('Provisioning failed, database left unchanged:', err.message)
  process.exit(1)
}

console.log(`
Paste this into App Store Connect -> App Review Information -> Sign-In Required:

  Coach account
    Username: ${coachEmail}
    Password: ${plainPassword}

  Player account
    Username: ${playerEmail}
    Password: ${plainPassword}

  Notes: HoopTrack Coach and HoopTrack Player are separate apps sharing one
  backend. Sign in to the Coach app with the coach account and the Player app
  with the player account. The coach's roster contains the player account.

Verify before submitting:
  curl -X POST ${process.env.HOOPTRACK_BASE_URL ?? 'https://hooptrack.194-146-12-139.sslip.io'}/api/auth/login \\
    -H 'Content-Type: application/json' \\
    -d '{"email":"${coachEmail}","password":"${plainPassword}"}'
`)
