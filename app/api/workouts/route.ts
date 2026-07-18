import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const TIMER_MODES = ['timed', 'stopwatch', 'reps'] as const

const drillInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  duration_seconds: z.number().int().positive().default(60),
  timer_mode: z.enum(TIMER_MODES).optional().default('timed'),
  target_reps: z.number().int().positive().nullable().optional(),
  rest_seconds: z.number().int().nonnegative().optional().default(0),
})

const createWorkoutSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  timer_mode: z.enum(TIMER_MODES).nullable().optional(),
  duration_seconds: z.number().int().positive().nullable().optional(),
  drills: z.array(drillInput).optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workouts = db.prepare(`
    SELECT w.*, u.name as creator_name,
      (SELECT COUNT(*) FROM drills d WHERE d.workout_id = w.id) as drill_count
    FROM workouts w
    JOIN users u ON u.id = w.created_by
    ORDER BY w.category, w.created_at DESC
  `).all()

  return Response.json({ workouts })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createWorkoutSchema.parse(body)

    const createWorkout = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO workouts (title, description, category, created_by, timer_mode, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)')
        .run(
          data.title,
          data.description || null,
          data.category,
          session.id,
          data.timer_mode ?? null,
          data.duration_seconds ?? null,
        )

      const workoutId = result.lastInsertRowid as number
      const insertDrill = db.prepare(
        'INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order, timer_mode, target_reps, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      data.drills?.forEach((drill, index) => {
        insertDrill.run(
          workoutId,
          drill.name,
          drill.description || null,
          drill.category,
          drill.duration_seconds,
          index,
          drill.timer_mode,
          drill.target_reps ?? null,
          drill.rest_seconds,
        )
      })
      return workoutId
    })

    const workoutId = createWorkout()

    return Response.json({ id: workoutId }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create workout' }, { status: 500 })
  }
}
