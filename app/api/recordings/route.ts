import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { createNotification, notifyAllTrainers } from '@/lib/notifications'
import { resolvePlayerId } from '@/lib/access'

const createRecordingSchema = z.object({
  drillId: z.number().int(),
  blobKey: z.string().min(1),
  duration: z.number().int().nonnegative(),
  notes: z.string().optional(),
  rep_count: z.number().int().nonnegative().nullable().optional(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get('playerId')
  const drillId = searchParams.get('drillId')
  const effectivePlayerId = resolvePlayerId(session, playerId)
  if (effectivePlayerId instanceof Response) return effectivePlayerId

  let query = `
    SELECT r.*, d.name as drill_name, d.category as drill_category, w.title as workout_title,
           u.name as player_name
    FROM recordings r
    JOIN drills d ON d.id = r.drill_id
    JOIN workouts w ON w.id = d.workout_id
    LEFT JOIN users u ON u.id = r.player_id
  `
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (session.role === 'trainer' && playerId) {
    conditions.push('r.player_id = ?')
    params.push(effectivePlayerId)
  } else if (session.role === 'player') {
    conditions.push('r.player_id = ?')
    params.push(effectivePlayerId)
  }

  if (drillId) {
    conditions.push('r.drill_id = ?')
    params.push(parseInt(drillId))
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY r.recorded_at DESC'

  const recordings = db.prepare(query).all(...params)
  return Response.json({ recordings })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createRecordingSchema.parse(body)

    // Detect PR before insert
    type DrillRow = { name: string; timer_mode: string }
    const drill = db.prepare('SELECT name, timer_mode FROM drills WHERE id = ?').get(data.drillId) as DrillRow | undefined
    let isPr = false
    let prMessage = ''
    if (drill) {
      if (drill.timer_mode === 'stopwatch') {
        const best = db.prepare(
          'SELECT MIN(duration_seconds) as best FROM recordings WHERE drill_id = ? AND player_id = ?'
        ).get(data.drillId, session.id) as { best: number | null }
        if (best.best != null && data.duration < best.best) {
          isPr = true
          prMessage = `New PR on ${drill.name}: ${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')} (was ${Math.floor(best.best / 60)}:${String(best.best % 60).padStart(2, '0')})`
        }
      } else if (drill.timer_mode === 'reps' && data.rep_count != null) {
        const best = db.prepare(
          'SELECT MAX(rep_count) as best FROM recordings WHERE drill_id = ? AND player_id = ? AND rep_count IS NOT NULL'
        ).get(data.drillId, session.id) as { best: number | null }
        if (best.best != null && data.rep_count > best.best) {
          isPr = true
          prMessage = `New PR on ${drill.name}: ${data.rep_count} reps (was ${best.best})`
        }
      }
    }

    const result = db.prepare(
      'INSERT INTO recordings (player_id, drill_id, duration_seconds, blob_key, notes, rep_count) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      session.id,
      data.drillId,
      data.duration,
      data.blobKey,
      data.notes || null,
      data.rep_count ?? null,
    )

    const recordingId = result.lastInsertRowid as number

    if (isPr) {
      createNotification({
        player_id: session.id,
        actor_id: session.id,
        type: 'pr_set',
        message: prMessage,
        link_url: '/dashboard/progress',
      }).catch(() => {})
    }

    // Surface player activity to trainers
    if (session.role === 'player') {
      const playerName = (db
        .prepare('SELECT name FROM users WHERE id = ?')
        .get(session.id) as { name: string } | undefined)?.name || 'Player'
      const drillName = drill?.name || 'a drill'
      const repsStr = data.rep_count != null ? ` · ${data.rep_count} reps` : ''
      const durStr = data.duration > 0 ? ` · ${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}` : ''
      notifyAllTrainers({
        message: `${playerName} recorded ${drillName}${durStr}${repsStr}`,
        type: 'recording_created',
        actor_id: session.id,
        link_url: `/dashboard/players/${session.id}`,
        push_title: 'New recording',
      }).catch(() => {})

      if (isPr) {
        notifyAllTrainers({
          message: `${playerName} — ${prMessage}`,
          type: 'pr_set',
          actor_id: session.id,
          link_url: `/dashboard/players/${session.id}`,
          push_title: 'New PR!',
        }).catch(() => {})
      }
    }

    // Auto-log on calendar: if this drill belongs to the user's "Free Play"
    // workout, drop a completed entry on today so it shows up on the calendar.
    try {
      const drillContext = db.prepare(`
        SELECT w.id as workout_id, w.title as workout_title, w.created_by as workout_creator
        FROM drills d JOIN workouts w ON w.id = d.workout_id WHERE d.id = ?
      `).get(data.drillId) as { workout_id: number; workout_title: string; workout_creator: number } | undefined

      const isFreePlay = drillContext
        && drillContext.workout_title === 'Free Play'
        && drillContext.workout_creator === session.id

      if (isFreePlay && drillContext) {
        const today = new Date().toISOString().slice(0, 10)
        const now = new Date().toISOString()
        const drillName = (db.prepare('SELECT name FROM drills WHERE id = ?').get(data.drillId) as { name: string } | undefined)?.name || 'Free Play'
        const reps = data.rep_count != null ? ` · ${data.rep_count} reps` : ''
        const dur = data.duration > 0 ? ` · ${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}` : ''
        const title = `Free Play${dur}${reps}`

        db.prepare(
          "INSERT INTO schedule (player_id, workout_id, scheduled_date, completed, completed_at, item_type, item_id, title, notes) VALUES (?, ?, ?, 1, ?, 'workout', ?, ?, ?)"
        ).run(
          session.id,
          drillContext.workout_id,
          today,
          now,
          drillContext.workout_id,
          title,
          `Recording #${recordingId}: ${drillName}`,
        )
      }
    } catch (e) {
      console.error('Free play auto-log failed:', e)
    }

    return Response.json({ id: recordingId }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to save recording' }, { status: 500 })
  }
}
