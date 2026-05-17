import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

type ActivityKind = 'recording' | 'quiz_attempt' | 'schedule_completed' | 'schedule_overdue'

interface ActivityItem {
  kind: ActivityKind
  at: string
  title: string
  subtitle?: string
  link?: string
  meta?: Record<string, unknown>
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'trainer' && session.id.toString() !== (await params).id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const playerId = parseInt(id)
  if (Number.isNaN(playerId)) return Response.json({ error: 'Bad id' }, { status: 400 })

  const player = db.prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'player'").get(playerId) as
    | { id: number; name: string; email: string }
    | undefined
  if (!player) return Response.json({ error: 'Player not found' }, { status: 404 })

  const recordings = db.prepare(`
    SELECT r.id, r.recorded_at, r.duration_seconds, r.rep_count, r.video_path,
           d.name as drill_name, w.title as workout_title
    FROM recordings r
    JOIN drills d ON d.id = r.drill_id
    JOIN workouts w ON w.id = d.workout_id
    WHERE r.player_id = ?
    ORDER BY r.recorded_at DESC LIMIT 50
  `).all(playerId) as Array<{
    id: number
    recorded_at: string
    duration_seconds: number
    rep_count: number | null
    video_path: string | null
    drill_name: string
    workout_title: string
  }>

  const attempts = db.prepare(`
    SELECT a.id, a.score, a.completed_at, q.title as quiz_title
    FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id
    WHERE a.player_id = ? ORDER BY a.completed_at DESC LIMIT 50
  `).all(playerId) as Array<{ id: number; score: number; completed_at: string; quiz_title: string }>

  const completions = db.prepare(`
    SELECT id, title, completed_at, item_type FROM schedule
    WHERE player_id = ? AND completed = 1 ORDER BY completed_at DESC LIMIT 50
  `).all(playerId) as Array<{ id: number; title: string | null; completed_at: string; item_type: string }>

  const today = new Date().toISOString().slice(0, 10)
  const overdue = db.prepare(`
    SELECT id, title, scheduled_date, item_type FROM schedule
    WHERE player_id = ? AND completed = 0 AND scheduled_date < ?
    ORDER BY scheduled_date DESC LIMIT 50
  `).all(playerId, today) as Array<{ id: number; title: string | null; scheduled_date: string; item_type: string }>

  const items: ActivityItem[] = []
  for (const r of recordings) {
    items.push({
      kind: 'recording',
      at: r.recorded_at,
      title: `${r.drill_name} (${r.workout_title})`,
      subtitle: `${Math.floor(r.duration_seconds / 60)}:${String(r.duration_seconds % 60).padStart(2, '0')}${r.rep_count != null ? ` · ${r.rep_count} reps` : ''}${r.video_path ? '' : ' · device-only'}`,
      meta: { recordingId: r.id, hasVideo: !!r.video_path },
    })
  }
  for (const a of attempts) {
    items.push({
      kind: 'quiz_attempt',
      at: a.completed_at,
      title: a.quiz_title,
      subtitle: `${a.score}%`,
      meta: { score: a.score, quizId: a.id },
    })
  }
  for (const c of completions) {
    items.push({
      kind: 'schedule_completed',
      at: c.completed_at,
      title: c.title || c.item_type,
      subtitle: 'completed',
      meta: { scheduleId: c.id, itemType: c.item_type },
    })
  }
  for (const o of overdue) {
    items.push({
      kind: 'schedule_overdue',
      at: `${o.scheduled_date}T23:59:59`,
      title: o.title || o.item_type,
      subtitle: `due ${o.scheduled_date}`,
      meta: { scheduleId: o.id, itemType: o.item_type },
    })
  }

  items.sort((a, b) => b.at.localeCompare(a.at))

  return Response.json({
    player,
    items: items.slice(0, 100),
  })
}
