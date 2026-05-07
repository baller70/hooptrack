import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { createNotification, type NotificationType } from '@/lib/notifications'

function notifyForItem(playerId: number, actorId: number, itemType: string, title: string | null, dateStr: string) {
  const titleStr = title || itemType
  const map: Record<string, { type: NotificationType; verb: string; url: string }> = {
    workout: { type: 'workout_assigned', verb: 'New workout assigned', url: '/dashboard/workouts' },
    move: { type: 'move_assigned', verb: 'New move to study', url: '/dashboard/moves' },
    quiz: { type: 'quiz_assigned', verb: 'New quiz to take', url: '/dashboard/classroom' },
    quote: { type: 'quote_assigned', verb: 'New message for you', url: '/dashboard/calendar' },
  }
  const m = map[itemType]
  if (!m) return
  createNotification({
    player_id: playerId,
    actor_id: actorId,
    type: m.type,
    message: `${m.verb}: ${titleStr} (${dateStr})`,
    link_url: m.url,
    push_title: 'HoopTrack',
  }).catch((e) => console.error('notify failed', e))
}

const createScheduleSchema = z.object({
  player_id: z.number().int(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  item_type: z.enum(['workout', 'move', 'quiz', 'quote']),
  item_id: z.number().int().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  workout_id: z.number().int().optional(), // backward compat
})

const bulkSchema = z.object({
  player_id: z.number().int(),
  items: z.array(z.object({
    item_type: z.enum(['workout', 'move', 'quiz', 'quote']),
    item_id: z.number().int().optional(),
    title: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const week = searchParams.get('week') // e.g. 2026-05-05
  const day = searchParams.get('day') // e.g. 2026-05-06
  const playerId = searchParams.get('playerId')

  let query = `
    SELECT s.*, w.title as workout_title, w.category as workout_category, u.name as player_name
    FROM schedule s
    LEFT JOIN workouts w ON w.id = s.workout_id
    JOIN users u ON u.id = s.player_id
  `
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (playerId) {
    conditions.push('s.player_id = ?')
    params.push(parseInt(playerId))
  } else if (session.role === 'player') {
    conditions.push('s.player_id = ?')
    params.push(session.id)
  }

  if (day) {
    conditions.push('s.scheduled_date = ?')
    params.push(day)
  } else if (week) {
    const endDate = new Date(week)
    endDate.setDate(endDate.getDate() + 7)
    conditions.push('s.scheduled_date >= ? AND s.scheduled_date < ?')
    params.push(week, endDate.toISOString().split('T')[0])
  } else if (month) {
    conditions.push("s.scheduled_date LIKE ?")
    params.push(`${month}%`)
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY s.scheduled_date, s.id'

  const items = db.prepare(query).all(...params)
  return Response.json({ schedule: items })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()

    // Bulk assign
    if (body.bulk) {
      const data = bulkSchema.parse(body)
      const insert = db.prepare(
        'INSERT INTO schedule (player_id, workout_id, scheduled_date, item_type, item_id, title, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      let count = 0
      for (const date of data.dates) {
        for (const item of data.items) {
          // Only set workout_id if it's a workout AND the workout exists
          let workoutId = null
          if (item.item_type === 'workout' && item.item_id) {
            const exists = db.prepare('SELECT id FROM workouts WHERE id = ?').get(item.item_id)
            if (exists) workoutId = item.item_id
          }
          insert.run(data.player_id, workoutId, date, item.item_type, item.item_id || null, item.title || null, item.notes || null)
          count++
          if (data.player_id !== session.id) {
            notifyForItem(data.player_id, session.id, item.item_type, item.title || null, date)
          }
        }
      }
      return Response.json({ count }, { status: 201 })
    }

    // Single assign
    const data = createScheduleSchema.parse(body)
    let workoutId = null
    const candidateWkId = data.workout_id || (data.item_type === 'workout' ? data.item_id : null)
    if (candidateWkId) {
      const exists = db.prepare('SELECT id FROM workouts WHERE id = ?').get(candidateWkId)
      if (exists) workoutId = candidateWkId
    }
    const result = db.prepare(
      'INSERT INTO schedule (player_id, workout_id, scheduled_date, item_type, item_id, title, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(data.player_id, workoutId, data.scheduled_date, data.item_type, data.item_id || null, data.title || null, data.notes || null)

    if (data.player_id !== session.id) {
      notifyForItem(data.player_id, session.id, data.item_type, data.title || null, data.scheduled_date)
    }

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('Schedule error:', err)
    return Response.json({ error: 'Failed to schedule' }, { status: 500 })
  }
}
