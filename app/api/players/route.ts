import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

interface PlayerActivity {
  id: number
  name: string
  email: string
  last_recording_at: string | null
  total_recordings: number
  recordings_last_7d: number
  hours_last_7d: number
  current_streak_days: number
  last_quiz_score: number | null
  last_quiz_at: string | null
  upcoming_count: number
  overdue_count: number
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const wantActivity = searchParams.get('activity') === 'true'

  if (!wantActivity) {
    const players = db.prepare(
      "SELECT id, name, email FROM users WHERE role = 'player' ORDER BY name"
    ).all()
    return Response.json({ players })
  }

  // Trainer-only aggregate view
  if (session.role !== 'trainer') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const players = db.prepare(
    "SELECT id, name, email FROM users WHERE role = 'player' ORDER BY name"
  ).all() as Array<{ id: number; name: string; email: string }>

  const today = new Date().toISOString().slice(0, 10)
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const enriched: PlayerActivity[] = players.map((p) => {
    const recAgg = db.prepare(`
      SELECT
        MAX(recorded_at) AS last_recording_at,
        COUNT(*) AS total_recordings,
        SUM(CASE WHEN substr(recorded_at, 1, 10) >= ? THEN 1 ELSE 0 END) AS recordings_last_7d,
        SUM(CASE WHEN substr(recorded_at, 1, 10) >= ? THEN duration_seconds ELSE 0 END) AS seconds_last_7d
      FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL
    `).get(sevenAgo, sevenAgo, p.id) as {
      last_recording_at: string | null
      total_recordings: number
      recordings_last_7d: number
      seconds_last_7d: number | null
    }

    const quiz = db.prepare(`
      SELECT score, completed_at FROM quiz_attempts
      WHERE player_id = ? ORDER BY completed_at DESC LIMIT 1
    `).get(p.id) as { score: number; completed_at: string } | undefined

    const upcoming = (db.prepare(`
      SELECT COUNT(*) as c FROM schedule
      WHERE player_id = ? AND completed = 0 AND scheduled_date >= ?
    `).get(p.id, today) as { c: number }).c

    const overdue = (db.prepare(`
      SELECT COUNT(*) as c FROM schedule
      WHERE player_id = ? AND completed = 0 AND scheduled_date < ?
    `).get(p.id, today) as { c: number }).c

    // Streak: consecutive prior days (ending today or yesterday) with at least one recording
    const days = db.prepare(`
      SELECT DISTINCT substr(recorded_at, 1, 10) AS d FROM recordings
      WHERE player_id = ? ORDER BY d DESC LIMIT 60
    `).all(p.id) as Array<{ d: string }>
    let streak = 0
    if (days.length > 0) {
      const cursor = new Date()
      // Allow either today or yesterday to anchor the streak
      const has = new Set(days.map((x) => x.d))
      if (!has.has(cursor.toISOString().slice(0, 10))) {
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      }
      while (has.has(cursor.toISOString().slice(0, 10))) {
        streak++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      }
    }

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      last_recording_at: recAgg.last_recording_at,
      total_recordings: recAgg.total_recordings || 0,
      recordings_last_7d: recAgg.recordings_last_7d || 0,
      hours_last_7d: Math.round(((recAgg.seconds_last_7d || 0) / 3600) * 10) / 10,
      current_streak_days: streak,
      last_quiz_score: quiz?.score ?? null,
      last_quiz_at: quiz?.completed_at ?? null,
      upcoming_count: upcoming,
      overdue_count: overdue,
    }
  })

  // Sort by most-recent activity first
  enriched.sort((a, b) => {
    const aT = a.last_recording_at || ''
    const bT = b.last_recording_at || ''
    return bT.localeCompare(aT)
  })

  return Response.json({ players: enriched })
}
