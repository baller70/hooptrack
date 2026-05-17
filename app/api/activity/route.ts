import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

type ActivityKind = 'recording' | 'video_uploaded' | 'quiz_attempt' | 'schedule_completed' | 'pr_set'

interface ActivityItem {
  kind: ActivityKind
  at: string
  player_id: number
  player_name: string
  title: string
  subtitle?: string
  meta?: Record<string, unknown>
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const playerIdRaw = searchParams.get('playerId')
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '100'))
  const playerId = playerIdRaw ? parseInt(playerIdRaw) : null

  const playerFilter = playerId ? 'AND player_id = ?' : ''
  const params: (number | string)[] = playerId ? [playerId] : []

  const recordings = db.prepare(`
    SELECT r.id, r.player_id, u.name as player_name, r.recorded_at as at,
           r.duration_seconds, r.rep_count, r.video_path, r.video_size_bytes,
           d.name as drill_name, w.title as workout_title
    FROM recordings r
    JOIN drills d ON d.id = r.drill_id
    JOIN workouts w ON w.id = d.workout_id
    JOIN users u ON u.id = r.player_id
    WHERE r.parent_recording_id IS NULL ${playerFilter}
    ORDER BY r.recorded_at DESC LIMIT ?
  `).all(...params, limit) as Array<{
    id: number
    player_id: number
    player_name: string
    at: string
    duration_seconds: number
    rep_count: number | null
    video_path: string | null
    video_size_bytes: number | null
    drill_name: string
    workout_title: string
  }>

  const attempts = db.prepare(`
    SELECT a.id, a.player_id, u.name as player_name, a.completed_at as at, a.score,
           q.title as quiz_title
    FROM quiz_attempts a
    JOIN quizzes q ON q.id = a.quiz_id
    JOIN users u ON u.id = a.player_id
    WHERE 1=1 ${playerFilter}
    ORDER BY a.completed_at DESC LIMIT ?
  `).all(...params, limit) as Array<{
    id: number
    player_id: number
    player_name: string
    at: string
    score: number
    quiz_title: string
  }>

  const completions = db.prepare(`
    SELECT s.id, s.player_id, u.name as player_name, s.completed_at as at,
           s.title, s.item_type
    FROM schedule s
    JOIN users u ON u.id = s.player_id
    WHERE s.completed = 1 AND s.completed_at IS NOT NULL ${playerFilter}
    ORDER BY s.completed_at DESC LIMIT ?
  `).all(...params, limit) as Array<{
    id: number
    player_id: number
    player_name: string
    at: string
    title: string | null
    item_type: string
  }>

  const items: ActivityItem[] = []

  for (const r of recordings) {
    items.push({
      kind: r.video_path ? 'video_uploaded' : 'recording',
      at: r.at,
      player_id: r.player_id,
      player_name: r.player_name,
      title: `${r.drill_name} (${r.workout_title})`,
      subtitle: `${Math.floor(r.duration_seconds / 60)}:${String(r.duration_seconds % 60).padStart(2, '0')}${r.rep_count != null ? ` · ${r.rep_count} reps` : ''}${r.video_path ? '' : ' · device-only'}`,
      meta: { recordingId: r.id, hasVideo: !!r.video_path },
    })
  }
  for (const a of attempts) {
    items.push({
      kind: 'quiz_attempt',
      at: a.at,
      player_id: a.player_id,
      player_name: a.player_name,
      title: a.quiz_title,
      subtitle: `${a.score}%`,
      meta: { score: a.score },
    })
  }
  for (const c of completions) {
    items.push({
      kind: 'schedule_completed',
      at: c.at,
      player_id: c.player_id,
      player_name: c.player_name,
      title: c.title || c.item_type,
      subtitle: 'completed',
      meta: { itemType: c.item_type },
    })
  }

  items.sort((a, b) => b.at.localeCompare(a.at))

  return Response.json({ items: items.slice(0, limit) })
}
