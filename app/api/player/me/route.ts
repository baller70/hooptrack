export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

/* Backs the Me screen (design/hooptrack-raw-individual-screens/ios/
 * 012-player-profile-me-raw.png): the roster fields added in schema v19 plus
 * the three counters the design puts under the identity card. */

type ProfileRow = {
  name: string
  email: string
  jersey_number: number | null
  position: string | null
  grade_level: string | null
  height: string | null
  class_year: string | null
  school: string | null
  roster_status: string
}

type CountRow = { count: number }

function count(sql: string, id: number) {
  return (db.prepare(sql).get(id) as CountRow | undefined)?.count ?? 0
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = db
    .prepare(
      `SELECT name, email, jersey_number, position, grade_level, height, class_year, school, roster_status
       FROM users WHERE id = ?`,
    )
    .get(session.id) as ProfileRow | undefined
  if (!profile) return Response.json({ error: 'User not found' }, { status: 404 })

  const recordings = count(
    'SELECT COUNT(*) AS count FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL',
    session.id,
  )
  const completed = count(
    'SELECT COUNT(*) AS count FROM schedule WHERE player_id = ? AND completed = 1',
    session.id,
  )

  // Consecutive days with a recording — same rule the coach roster uses so the
  // two screens can never disagree about a player's streak.
  const days = db
    .prepare(
      'SELECT DISTINCT substr(recorded_at, 1, 10) AS d FROM recordings WHERE player_id = ? ORDER BY d DESC LIMIT 60',
    )
    .all(session.id) as Array<{ d: string }>
  let streak = 0
  if (days.length > 0) {
    const has = new Set(days.map((row) => row.d))
    const cursor = new Date()
    if (!has.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1)
    while (has.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
  }

  return Response.json(
    { profile, stats: { recordings, completed, streak } },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
