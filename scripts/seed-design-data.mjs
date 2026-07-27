/**
 * Development seed that mirrors the content shown in
 * design/hooptrack-raw-individual-screens, so the implemented screens can be
 * compared against the PNGs side by side.
 *
 * DEV ONLY. Refuses to run unless HOOPTRACK_SEED_CONFIRM=yes, and never
 * touches a database that already holds users.
 *
 *   HOOPTRACK_SEED_CONFIRM=yes node scripts/seed-design-data.mjs [--force]
 */
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import process from 'node:process'

if (process.env.HOOPTRACK_SEED_CONFIRM !== 'yes') {
  console.error('Refusing to seed: set HOOPTRACK_SEED_CONFIRM=yes to proceed.')
  process.exit(1)
}

const force = process.argv.includes('--force')
const dbPath = path.join(process.cwd(), 'data', 'hooptrack.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const existingUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
if (existingUsers > 0 && !force) {
  console.error(
    `Refusing to seed: ${existingUsers} users already exist in ${dbPath}.\n` +
      'Re-run with --force only if this database is disposable.',
  )
  process.exit(1)
}

const password = bcrypt.hashSync('hooptrack', 12)
const today = new Date()
const iso = (offsetDays) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
const stamp = (offsetDays, hour = 10) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, 24, 0, 0)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

const insertUser = db.prepare(
  'INSERT INTO users (name, email, password_hash, role, position_abbr) VALUES (?, ?, ?, ?, ?)',
)
/* The MEMBERS table in 002-coach-teams-request-flow prints a position against
 * every player (PG/SG/SF/PF/C); without one the column seeds as a wall of
 * em-dashes and the screen stops matching the pack. */
const addUser = (name, email, role, position = null) =>
  insertUser.run(name, email, password, role, position).lastInsertRowid

db.exec('BEGIN')
try {
  if (force) {
    for (const table of [
      'quiz_attempts', 'quiz_questions', 'quizzes', 'recordings', 'schedule',
      'drills', 'workouts', 'player_moves', 'messages', 'notifications',
      'coach_group_invites', 'coach_group_members', 'coach_groups', 'users',
    ]) {
      db.exec(`DELETE FROM ${table}`)
    }
  }

  const coach = addUser('Marcus Reed', 'marcus@hooptrack.test', 'trainer')
  const coach2 = addUser('Jordan Hill', 'jordan.hill@hooptrack.test', 'trainer')

  // Primary demo player — the screens show "Marcus" in the account menu.
  // Positions follow the pack's MEMBERS table: Jaden PG, Liam SG, Noah SF,
  // Mason PF, Ethan C, with the rest filled out to keep a plausible roster.
  const marcus = addUser('Marcus Williams', 'marcus.williams@email.com', 'player', 'SG')
  const jordan = addUser('Jordan Smith', 'jordan.smith@email.com', 'player', 'PG')
  const tyler = addUser('Tyler Johnson', 'tyler.johnson@email.com', 'player', 'SF')
  const eden = addUser('Eden Davis', 'eden.davis@email.com', 'player', 'PF')
  const jaden = addUser('Jaden Smith', 'jaden.smith@email.com', 'player', 'PG')
  const liam = addUser('Liam Johnson', 'liam.johnson@email.com', 'player', 'SG')
  const noah = addUser('Noah Williams', 'noah.williams@email.com', 'player', 'SF')
  const mason = addUser('Mason Brown', 'mason.brown@email.com', 'player', 'PF')
  const ethan = addUser('Ethan Davis', 'ethan.davis@email.com', 'player', 'C')
  const alex = addUser('Alex Walker', 'alex.walker@email.com', 'player', 'SG')
  const bryson = addUser('Bryson Smith', 'bryson.smith@email.com', 'player', 'C')
  const chris = addUser('Chris Taylor', 'chris.taylor@email.com', 'player', 'SF')

  // ---- Groups, members, invites (002-coach-teams-request-flow) ----
  const insertGroup = db.prepare(
    'INSERT INTO coach_groups (coach_id, name, group_type, player_limit, description) VALUES (?,?,?,?,?)',
  )
  const rising = insertGroup.run(coach, 'Rising Stars 15U', 'team', 15,
    'Competitive travel team focused on player development, fundamentals, and game IQ.').lastInsertRowid
  const skills = insertGroup.run(coach, 'Skills Academy', 'training_session', 20,
    'Weekly skills sessions covering handles, finishing, and shooting mechanics.').lastInsertRowid
  const city = insertGroup.run(coach, 'City Hoops 17U', 'team', 15,
    'Varsity-level squad preparing for the spring circuit.').lastInsertRowid

  const addMember = db.prepare(
    'INSERT INTO coach_group_members (group_id, player_id, added_by, joined_at) VALUES (?,?,?,?)',
  )
  const roster = [
    [rising, jaden, -14], [rising, liam, -14], [rising, noah, -12],
    [rising, mason, -11], [rising, ethan, -11], [rising, jordan, -10],
    [rising, marcus, -9], [rising, tyler, -9], [rising, eden, -8],
    [skills, jordan, -20], [skills, marcus, -19], [skills, tyler, -18],
    [city, noah, -25], [city, mason, -25],
  ]
  for (const [group, player, days] of roster) {
    addMember.run(group, player, coach, stamp(days))
  }

  const addInvite = db.prepare(
    'INSERT INTO coach_group_invites (group_id, coach_id, player_id, status, message, created_at) VALUES (?,?,?,?,?,?)',
  )
  addInvite.run(rising, coach, alex, 'pending',
    "Hi! We'd love to invite you to join our 15U team and upcoming training sessions. Let me know if you're interested!",
    stamp(-3))
  addInvite.run(city, coach, bryson, 'pending', 'Spot open on the 17U roster if you want it.', stamp(-4))
  addInvite.run(skills, coach, chris, 'pending', 'Skills Academy runs Tuesdays and Thursdays.', stamp(-4))
  // The demo player needs an inbound invite so /player/requests has content.
  addInvite.run(city, coach, marcus, 'pending',
    "Hi! We'd love to invite you to join our 17U team and upcoming training sessions. Let me know if you're interested!",
    stamp(-3))

  // ---- Workouts + drills (003-player-training-workspace, 006-assigned-workouts) ----
  const insertWorkout = db.prepare(
    'INSERT INTO workouts (title, description, category, created_by, timer_mode, duration_seconds) VALUES (?,?,?,?,?,?)',
  )
  const insertDrill = db.prepare(
    'INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order, timer_mode) VALUES (?,?,?,?,?,?,?)',
  )
  const makeWorkout = (title, description, category, createdBy, drills) => {
    const total = drills.reduce((sum, [, seconds]) => sum + seconds, 0)
    const id = insertWorkout.run(title, description, category, createdBy, 'timed', total).lastInsertRowid
    drills.forEach(([name, seconds], index) => {
      insertDrill.run(id, name, null, category, seconds, index, 'timed')
    })
    return id
  }

  const finishing = makeWorkout('Finishing Focus', 'Contact finishing and touch around the rim.', 'Finishing', coach, [
    ['Mikan Series', 480], ['Reverse Layup Series', 600], ['Euro Step Finishes', 480],
    ['Floaters From Elbow', 540], ['Contact Finishing', 600],
  ])
  const handle = makeWorkout('Handle Under Pressure', 'Live-dribble decision making against pressure.', 'Ball Handling', coach, [
    ['Two Ball Pound', 300], ['Cone Snatchbacks', 420], ['Pressure Escapes', 480], ['Live Read Series', 600],
  ])
  const consistency = makeWorkout('Shooting Consistency', 'Rhythm and repeatability from catch and off the bounce.', 'Shooting', coach, [
    ['Form Shooting', 360], ['Catch And Shoot', 480], ['One Dribble Pull Up', 540], ['Range Finder', 420],
  ])
  // NOTE: drill categories must match SUBJECT_CATEGORIES in
  // app/api/progress/report/route.ts or the report grades them as zero volume.
  const offseason = makeWorkout('Off Season Strength', 'Lower body base and landing mechanics.', 'Strength & Conditioning', coach, [
    ['Tempo Squats', 480], ['Split Squat Series', 420], ['Landing Mechanics', 360],
  ])
  const footwork = makeWorkout('Footwork Fundamentals', 'Pivots, drop steps, and first-step quickness.', 'Footwork', coach, [
    ['Pivot Series', 360], ['Drop Step Ladder', 420], ['First Step Burst', 480],
  ])
  const mechanics = makeWorkout('Shooting Mechanics', 'Base, alignment, and follow through.', 'Shooting', coach2, [
    ['Wall Form', 300], ['One Hand Release', 420], ['Guide Hand Drill', 360], ['Free Throw Ladder', 480], ['Elbow Series', 840],
  ])
  const ballHandling = makeWorkout('Ball Handling Circuit', 'Full circuit of stationary and on-the-move handles.', 'Ball Handling', coach, [
    ['Stationary Pound', 300], ['Figure Eights', 300], ['Cross Series', 480], ['Full Court Attack', 720],
  ])
  const defensive = makeWorkout('Defensive Slides', 'Slides, closeouts, and recovery angles.', 'Defense', coach, [
    ['Lane Slides', 360], ['Closeout Ladder', 480], ['Recovery Angles', 420], ['Shell Drill', 540],
  ])

  // ---- Weekly plan (training plan card) ----
  const insertSchedule = db.prepare(
    'INSERT INTO schedule (player_id, workout_id, scheduled_date, completed, completed_at, item_type, item_id, title) VALUES (?,?,?,?,?,?,?,?)',
  )
  const plan = (player, workoutId, title, offset, completed) =>
    insertSchedule.run(player, workoutId, iso(offset), completed ? 1 : 0,
      completed ? stamp(offset, 18) : null, 'workout', workoutId, title)

  // Monday-anchored week for the primary player.
  const dow = today.getDay()
  const monday = -((dow + 6) % 7)
  plan(marcus, consistency, 'Shooting Session', monday, true)
  plan(marcus, ballHandling, 'Ball Handling', monday + 2, true)
  plan(marcus, finishing, 'Finishing Workout', monday + 4, false)
  plan(marcus, offseason, 'Mobility & Recovery', monday + 6, false)
  plan(marcus, finishing, 'Finishing Focus', 3, false)
  plan(marcus, handle, 'Handle Under Pressure', 6, false)
  plan(marcus, consistency, 'Shooting Consistency', 9, false)
  plan(marcus, offseason, 'Off Season Strength', 13, false)
  plan(marcus, mechanics, 'Shooting Mechanics', -2, false) // overdue

  for (const player of [jordan, tyler, eden, jaden, liam, noah]) {
    plan(player, finishing, 'Finishing Focus', 2, false)
    plan(player, ballHandling, 'Ball Handling Circuit', 4, false)
    plan(player, defensive, 'Defensive Footwork', -1, false)
    plan(player, consistency, 'Shooting Consistency', -6, true)
    plan(player, mechanics, 'Shooting Mechanics', -9, true)
  }

  // Completed history so progress reports have something to grade.
  for (let week = 1; week <= 8; week += 1) {
    for (const player of [marcus, jordan, tyler]) {
      plan(player, consistency, 'Shooting Session', -week * 7, true)
      plan(player, ballHandling, 'Ball Handling', -week * 7 - 2, true)
    }
  }

  // ---- Recordings (004-coach-activity-film-review) ----
  const drillFor = db.prepare('SELECT id FROM drills WHERE workout_id = ? ORDER BY drill_order LIMIT 1')
  const insertRecording = db.prepare(
    'INSERT INTO recordings (player_id, drill_id, duration_seconds, blob_key, recorded_at, title) VALUES (?,?,?,?,?,?)',
  )
  const clips = [
    [jordan, consistency, 45, 'Spot Up Shooting', -1],
    [marcus, finishing, 72, 'Finishing Circuit', -2],
    [tyler, handle, 30, 'Handle Under Pressure', -2],
    [eden, defensive, 25, 'Footwork Session', -3],
    [jordan, finishing, 51, 'Contact Finishing', -4],
    [marcus, consistency, 38, 'Catch And Shoot', -5],
    [tyler, mechanics, 64, 'Elbow Series', -6],
    [jaden, ballHandling, 41, 'Full Court Attack', -7],
  ]
  clips.forEach(([player, workoutId, seconds, title, offset], index) => {
    const drill = drillFor.get(workoutId)
    if (drill) {
      insertRecording.run(player, drill.id, seconds, `seed-clip-${index}`, stamp(offset, 10), title)
    }
  })
  // Volume so "recordings" counters read like the mockups.
  const marcusDrill = drillFor.get(consistency)
  for (let i = 0; i < 18; i += 1) {
    insertRecording.run(marcus, marcusDrill.id, 30 + i, `seed-marcus-${i}`, stamp(-i - 1, 17), 'Training Rep')
  }

  // Realistic training volume. /api/progress/report grades each subject on
  // HOURS in the period (5h ~= 70, 15h ~= 90), so short clips alone can only
  // ever grade F. These are full 30-50 minute sessions across the categories
  // the report actually reads, spread over the last two months.
  const VOLUME_PLAN = [
    // [workout, subject weighting per player] — differing totals give the
    // players distinct letter grades, as the comparison matrix shows.
    { workout: consistency, sessions: { [marcus]: 15, [jordan]: 13, [tyler]: 11, [eden]: 9 } },
    { workout: finishing, sessions: { [marcus]: 8, [jordan]: 10, [tyler]: 7, [eden]: 6 } },
    { workout: ballHandling, sessions: { [marcus]: 13, [jordan]: 15, [tyler]: 12, [eden]: 8 } },
    { workout: footwork, sessions: { [marcus]: 11, [jordan]: 9, [tyler]: 13, [eden]: 7 } },
    { workout: defensive, sessions: { [marcus]: 12, [jordan]: 11, [tyler]: 14, [eden]: 10 } },
    { workout: offseason, sessions: { [marcus]: 10, [jordan]: 8, [tyler]: 9, [eden]: 12 } },
  ]
  let volumeKey = 0
  for (const { workout, sessions } of VOLUME_PLAN) {
    const drill = drillFor.get(workout)
    if (!drill) continue
    for (const [playerId, sessionCount] of Object.entries(sessions)) {
      for (let i = 0; i < sessionCount; i += 1) {
        // 30-50 minute sessions, walked backwards roughly every other day.
        const seconds = 1800 + ((i * 7) % 21) * 60
        insertRecording.run(
          Number(playerId), drill.id, seconds, `seed-vol-${volumeKey}`,
          stamp(-(i * 2 + 1), 16), 'Training Session',
        )
        volumeKey += 1
      }
    }
  }

  // ---- Move library (007-player-move-library) ----
  const insertMove = db.prepare(
    'INSERT INTO player_moves (title, youtube_url, category, description, created_by, video_type) VALUES (?,?,?,?,?,?)',
  )
  const moves = [
    ['Euro Step Finish', 'Finishing', 'Change direction through contact to finish on the far side.'],
    ['Hesitation Pull Up', 'Shooting', 'Sell the drive, rise into rhythm.'],
    ['In And Out Cross', 'Ball Handling', 'Freeze the defender before attacking the gap.'],
    ['Snatchback Three', 'Shooting', 'Create separation off the retreat dribble.'],
    ['Floater From Elbow', 'Finishing', 'High release over rim protection.'],
    ['Closeout Slide', 'Defense', 'Short choppy steps into a live stance.'],
  ]
  for (const [title, category, description] of moves) {
    insertMove.run(title, '', category, description, coach, 'upload')
  }

  // ---- Classroom (010-player-classroom) ----
  const insertQuiz = db.prepare('INSERT INTO quizzes (title, type, created_by) VALUES (?,?,?)')
  const insertQuestion = db.prepare(
    'INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, question_order) VALUES (?,?,?,?,?)',
  )
  const footworkQuiz = insertQuiz.run('Footwork Quiz', 'multiple_choice', coach).lastInsertRowid
  const spacing = insertQuiz.run('Spacing And Reads', 'multiple_choice', coach).lastInsertRowid
  const questions = [
    [footworkQuiz, 'Which foot is the pivot after a jump stop?', ['Left', 'Right', 'Either', 'Neither'], 'Either'],
    [footworkQuiz, 'On a drop step you turn toward the...', ['Baseline', 'Sideline', 'Free throw line', 'Half court'], 'Baseline'],
    [spacing, 'Ideal spacing between perimeter players is about...', ['6 feet', '12-15 feet', '25 feet', '3 feet'], '12-15 feet'],
  ]
  questions.forEach(([quiz, text, options, answer], index) => {
    insertQuestion.run(quiz, text, JSON.stringify(options), answer, index)
  })
  db.prepare(
    'INSERT INTO quiz_attempts (quiz_id, player_id, score, answers, completed_at) VALUES (?,?,?,?,?)',
  ).run(footworkQuiz, eden, 92, JSON.stringify(['Either', 'Baseline']), stamp(-3, 15))

  // ---- Notifications so the bell shows an unread dot ----
  const insertNotification = db.prepare(
    'INSERT INTO notifications (player_id, message, type, scheduled_for, link_url) VALUES (?,?,?,?,?)',
  )
  insertNotification.run(marcus, 'Coach Mike assigned Finishing Focus', 'workout_assigned', stamp(-1, 9), '/player/workouts')
  insertNotification.run(marcus, 'You have a new team request', 'team_invite', stamp(-1, 8), '/player/requests')
  insertNotification.run(coach, 'Jordan Smith uploaded Spot Up Shooting', 'video_uploaded', stamp(-1, 10), '/coach/activity')

  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
}

const counts = ['users', 'coach_groups', 'coach_group_members', 'coach_group_invites',
  'workouts', 'drills', 'schedule', 'recordings', 'player_moves', 'quizzes']
  .map((table) => `${table}=${db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c}`)
console.log('Seeded:', counts.join(' '))
console.log('Coach login:  marcus@hooptrack.test / hooptrack')
console.log('Player login: marcus.williams@email.com / hooptrack')
