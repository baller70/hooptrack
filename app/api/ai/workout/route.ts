export const dynamic = "force-dynamic"
import { getSession } from '@/lib/session'
import { generateWorkout } from '@/lib/ai'
import { db } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const schema = z.object({
  playerName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} .,'’_-]+$/u).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  focusAreas: z.array(
    z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} &'’(),\/+_-]+$/u),
  ).min(1).max(10),
  duration: z.number().int().min(10).max(120),
  autoSave: z.boolean().optional(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = rateLimit(`ai-workout:${session.id}:${requestIp(request)}`, 20, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const data = schema.parse(body)

    const workout = await generateWorkout({
      playerName: data.playerName || session.name,
      skillLevel: data.skillLevel,
      focusAreas: data.focusAreas,
      duration: data.duration,
    })

    // Auto-save to DB if requested
    if (data.autoSave && session.role === 'trainer') {
      const saveWorkout = db.transaction(() => {
        const result = db.prepare(
          'INSERT INTO workouts (title, description, category, created_by) VALUES (?, ?, ?, ?)'
        ).run(workout.title, workout.description, workout.category, session.id)

        const workoutId = result.lastInsertRowid as number
        const insertDrill = db.prepare(
          'INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order) VALUES (?, ?, ?, ?, ?, ?)'
        )
        workout.drills?.forEach((drill: { name: string; description: string; category: string; duration_seconds: number }, index: number) => {
          insertDrill.run(workoutId, drill.name, drill.description, drill.category, drill.duration_seconds, index)
        })
        return workoutId
      })

      const workoutId = saveWorkout()
      return Response.json({ workout, saved: true, workoutId })
    }

    return Response.json({ workout })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('AI workout error:', err)
    return Response.json({ error: 'Failed to generate workout' }, { status: 500 })
  }
}
