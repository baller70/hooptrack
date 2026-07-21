import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { coachIdForSession } from '@/lib/access'

const TIMER_MODES = ['timed', 'stopwatch', 'reps'] as const

const createDrillSchema = z.object({
  workout_id: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  duration_seconds: z.number().int().positive().default(60),
  timer_mode: z.enum(TIMER_MODES).optional().default('timed'),
  target_reps: z.number().int().positive().nullable().optional(),
  rest_seconds: z.number().int().nonnegative().optional().default(0),
})

export async function POST(request: Request) {
  const session = await getSession()
  const coachId = session ? coachIdForSession(session) : null
  if (coachId == null) return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createDrillSchema.parse(body)
    if (!db.prepare('SELECT id FROM workouts WHERE id = ? AND created_by = ?').get(data.workout_id, coachId)) {
      return Response.json({ error: 'Workout not found' }, { status: 404 })
    }

    const maxOrder = db.prepare('SELECT MAX(drill_order) as m FROM drills WHERE workout_id = ?')
      .get(data.workout_id) as { m: number | null }
    const nextOrder = (maxOrder?.m ?? -1) + 1

    const result = db.prepare(
      'INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order, timer_mode, target_reps, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      data.workout_id,
      data.name,
      data.description || null,
      data.category,
      data.duration_seconds,
      nextOrder,
      data.timer_mode,
      data.target_reps ?? null,
      data.rest_seconds,
    )

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create drill' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  const coachId = session ? coachIdForSession(session) : null
  if (coachId == null) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { drillId, ...updates } = body
  if (!drillId) return Response.json({ error: 'Missing drillId' }, { status: 400 })
  if (!db.prepare('SELECT d.id FROM drills d JOIN workouts w ON w.id = d.workout_id WHERE d.id = ? AND w.created_by = ?').get(drillId, coachId)) {
    return Response.json({ error: 'Drill not found' }, { status: 404 })
  }

  // Name-only partial update (rename)
  const updateKeys = Object.keys(updates)
  const onlyName = updateKeys.length === 1 && typeof updates.name === 'string'
  if (onlyName) {
    const n = updates.name.trim()
    if (!n) return Response.json({ error: 'Name cannot be empty' }, { status: 400 })
    db.prepare('UPDATE drills SET name = ? WHERE id = ?').run(n.slice(0, 200), drillId)
    return Response.json({ success: true })
  }

  // Full update
  db.prepare(
    'UPDATE drills SET name = ?, description = ?, category = ?, duration_seconds = ?, timer_mode = ?, target_reps = ?, rest_seconds = ? WHERE id = ?'
  ).run(
    updates.name,
    updates.description || null,
    updates.category,
    updates.duration_seconds,
    updates.timer_mode ?? 'timed',
    updates.target_reps ?? null,
    updates.rest_seconds ?? 0,
    drillId,
  )

  return Response.json({ success: true })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  const coachId = session ? coachIdForSession(session) : null
  if (coachId == null) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing drill id' }, { status: 400 })
  if (!db.prepare('SELECT d.id FROM drills d JOIN workouts w ON w.id = d.workout_id WHERE d.id = ? AND w.created_by = ?').get(id, coachId)) {
    return Response.json({ error: 'Drill not found' }, { status: 404 })
  }

  db.prepare('DELETE FROM drills WHERE id = ?').run(id)
  return Response.json({ success: true })
}
