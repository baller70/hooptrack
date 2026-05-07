export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

interface DrillRow {
  id: number
  name: string
  duration_seconds: number
  timer_mode: 'timed' | 'stopwatch' | 'reps'
  target_reps: number | null
}

const FREE_PLAY_TITLE = 'Free Play'
const FREE_PLAY_DRILL_NAME = 'Free Play Session'

// Returns (or lazily creates) a per-user "Free Play" drill so unattached
// recordings still have a valid drill_id (recordings.drill_id is NOT NULL).
export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Find or create the workout
  let workoutRow = db.prepare(
    "SELECT id FROM workouts WHERE created_by = ? AND title = ?"
  ).get(session.id, FREE_PLAY_TITLE) as { id: number } | undefined

  if (!workoutRow) {
    const result = db.prepare(
      "INSERT INTO workouts (title, description, category, created_by) VALUES (?, ?, ?, ?)"
    ).run(
      FREE_PLAY_TITLE,
      'Recordings made without attaching to a structured drill.',
      'General',
      session.id,
    )
    workoutRow = { id: result.lastInsertRowid as number }
  }

  // Find or create the drill
  let drillRow = db.prepare(
    "SELECT id, name, duration_seconds, timer_mode, target_reps FROM drills WHERE workout_id = ? AND name = ?"
  ).get(workoutRow.id, FREE_PLAY_DRILL_NAME) as DrillRow | undefined

  if (!drillRow) {
    const result = db.prepare(
      "INSERT INTO drills (workout_id, name, description, category, duration_seconds, drill_order, timer_mode, target_reps, rest_seconds) VALUES (?, ?, ?, ?, ?, 0, 'stopwatch', NULL, 0)"
    ).run(
      workoutRow.id,
      FREE_PLAY_DRILL_NAME,
      'Catch-all for unattached recordings.',
      'General',
      0,
    )
    const id = result.lastInsertRowid as number
    drillRow = { id, name: FREE_PLAY_DRILL_NAME, duration_seconds: 0, timer_mode: 'stopwatch', target_reps: null }
  }

  return Response.json({ drill: drillRow })
}
