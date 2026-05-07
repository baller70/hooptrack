export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

interface DrillOption {
  id: number
  name: string
  workout_title: string | null
  category: string
}

interface DrillFull {
  id: number
  name: string
  duration_seconds: number
  timer_mode: 'timed' | 'stopwatch' | 'reps'
  target_reps: number | null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const drillId = searchParams.get('drillId')

  if (drillId) {
    const drill = db.prepare(
      'SELECT id, name, duration_seconds, timer_mode, target_reps FROM drills WHERE id = ?'
    ).get(drillId) as DrillFull | undefined
    if (!drill) return Response.json({ error: 'Drill not found' }, { status: 404 })

    const history = db.prepare(
      'SELECT duration_seconds, rep_count FROM recordings WHERE drill_id = ? AND player_id = ? ORDER BY recorded_at DESC'
    ).all(drill.id, session.id) as Array<{ duration_seconds: number; rep_count: number | null }>

    const pr = {
      previous_seconds: history[0]?.duration_seconds ?? null,
      best_seconds: history.length > 0 ? Math.min(...history.map((h) => h.duration_seconds)) : null,
      previous_reps: history[0]?.rep_count ?? null,
      best_reps: history.some((h) => h.rep_count != null)
        ? Math.max(...history.filter((h) => h.rep_count != null).map((h) => h.rep_count as number))
        : null,
    }
    return Response.json({ drill, pr })
  }

  const drills = db.prepare(`
    SELECT d.id, d.name, d.category, w.title as workout_title
    FROM drills d
    JOIN workouts w ON w.id = d.workout_id
    ORDER BY w.title, d.drill_order
  `).all() as DrillOption[]

  return Response.json({ drills })
}
