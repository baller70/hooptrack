import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'

const RECURRENCE_RULES = ['weekly', 'weekdays', 'daily'] as const
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const schema = z.object({
  scheduled_dates: z.array(z.string().regex(ISO_DATE)).optional(),
  recurrence: z.object({
    rule: z.enum(RECURRENCE_RULES),
    count: z.number().int().min(1).max(52),
    start_date: z.string().regex(ISO_DATE),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  }).optional(),
  player_id: z.number().int().optional(),
  title_suffix: z.string().optional(),
})

function expandRecurrence(rule: string, startDate: string, count: number, weekdays?: number[]): string[] {
  const start = new Date(startDate + 'T00:00:00')
  const out: string[] = []
  if (rule === 'daily') {
    for (let i = 0; i < count; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push(d.toISOString().slice(0, 10))
    }
  } else if (rule === 'weekdays') {
    const d = new Date(start)
    let added = 0
    while (added < count) {
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) {
        out.push(d.toISOString().slice(0, 10))
        added++
      }
      d.setDate(d.getDate() + 1)
    }
  } else if (rule === 'weekly') {
    // Match start date's weekday by default; otherwise use provided weekdays array
    const targetDays = weekdays && weekdays.length > 0 ? weekdays : [start.getDay()]
    const d = new Date(start)
    let weeksAdded = 0
    while (out.length < count) {
      for (let i = 0; i < 7 && out.length < count; i++) {
        const cur = new Date(d)
        cur.setDate(d.getDate() + i)
        if (targetDays.includes(cur.getDay()) && cur >= start) {
          out.push(cur.toISOString().slice(0, 10))
        }
      }
      weeksAdded++
      d.setDate(d.getDate() + 7)
      if (weeksAdded > 60) break
    }
  }
  return out
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  try {
    const body = await request.json()
    const data = schema.parse(body)

    type WorkoutRow = { id: number; title: string; description: string | null; category: string; timer_mode: string | null; duration_seconds: number | null }
    const source = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id) as WorkoutRow | undefined
    if (!source) return Response.json({ error: 'Source workout not found' }, { status: 404 })

    type DrillRow = { name: string; description: string | null; category: string; duration_seconds: number; drill_order: number; timer_mode: string; target_reps: number | null; rest_seconds: number }
    const sourceDrills = db.prepare('SELECT * FROM drills WHERE workout_id = ? ORDER BY drill_order').all(id) as DrillRow[]

    const newTitle = source.title + (data.title_suffix ?? ' (copy)')

    // Collect target dates
    const dates = new Set<string>()
    if (data.scheduled_dates) data.scheduled_dates.forEach((d) => dates.add(d))
    if (data.recurrence) {
      expandRecurrence(data.recurrence.rule, data.recurrence.start_date, data.recurrence.count, data.recurrence.weekdays).forEach((d) => dates.add(d))
    }

    const tx = db.transaction(() => {
      const insertWorkout = db.prepare(
        'INSERT INTO workouts (title, description, category, created_by, timer_mode, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)'
      )
      const result = insertWorkout.run(
        newTitle,
        source.description,
        source.category,
        session.id,
        source.timer_mode,
        source.duration_seconds,
      )
      const newWorkoutId = result.lastInsertRowid as number

      const insertDrill = db.prepare(
        'INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order, timer_mode, target_reps, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      sourceDrills.forEach((d) => {
        insertDrill.run(
          newWorkoutId,
          d.name,
          d.description,
          d.category,
          d.duration_seconds,
          d.drill_order,
          d.timer_mode,
          d.target_reps,
          d.rest_seconds,
        )
      })

      if (dates.size > 0) {
        const playerId = data.player_id ?? session.id
        const insertSchedule = db.prepare(
          "INSERT INTO schedule (player_id, workout_id, scheduled_date, item_type, item_id, title) VALUES (?, ?, ?, 'workout', ?, ?)"
        )
        for (const date of dates) {
          insertSchedule.run(playerId, newWorkoutId, date, newWorkoutId, newTitle)
        }
      }

      return newWorkoutId
    })

    const newWorkoutId = tx()

    // Fire notifications for each scheduled date when assigning to another player
    if (dates.size > 0) {
      const playerId = data.player_id ?? session.id
      if (playerId !== session.id) {
        for (const date of dates) {
          createNotification({
            player_id: playerId,
            actor_id: session.id,
            type: 'workout_assigned',
            message: `New workout assigned: ${newTitle} (${date})`,
            link_url: '/dashboard/workouts',
          }).catch(() => {})
        }
      }
    }

    return Response.json({
      id: newWorkoutId,
      title: newTitle,
      scheduled_count: dates.size,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('Duplicate workout error:', err)
    return Response.json({ error: 'Failed to duplicate workout' }, { status: 500 })
  }
}
