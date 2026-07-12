import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { RECORDINGS_DIR } from '@/lib/constants'
import { unlink } from 'fs/promises'
import path from 'path'

interface RecordingFileRow {
  id: number
  video_path: string | null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id)
  if (!workout) return Response.json({ error: 'Not found' }, { status: 404 })

  const drills = db.prepare('SELECT * FROM drills WHERE workout_id = ? ORDER BY drill_order').all(id)

  return Response.json({ workout, drills })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  // Title-only partial update (rename)
  const onlyTitle = Object.keys(body).length === 1 && typeof body.title === 'string'
  if (onlyTitle) {
    const t = body.title.trim()
    if (!t) return Response.json({ error: 'Title cannot be empty' }, { status: 400 })
    db.prepare('UPDATE workouts SET title = ? WHERE id = ?').run(t.slice(0, 200), id)
    return Response.json({ success: true })
  }

  // Full update
  db.prepare(
    'UPDATE workouts SET title = ?, description = ?, category = ?, timer_mode = ?, duration_seconds = ? WHERE id = ?'
  ).run(
    body.title,
    body.description || null,
    body.category,
    body.timer_mode ?? null,
    body.duration_seconds ?? null,
    id,
  )

  return Response.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const workout = db.prepare('SELECT id FROM workouts WHERE id = ?').get(id)
  if (!workout) return Response.json({ error: 'Not found' }, { status: 404 })

  const recordings = db.prepare(`
    SELECT r.id, r.video_path
    FROM recordings r
    JOIN drills d ON d.id = r.drill_id
    WHERE d.workout_id = ?
  `).all(id) as RecordingFileRow[]
  const recordingIds = recordings.map((r) => r.id)

  const deleteWorkout = db.transaction((workoutId: string, ids: number[]) => {
    db.prepare("DELETE FROM messages WHERE context_type = 'workout' AND context_id = ?").run(workoutId)
    db.prepare("DELETE FROM messages WHERE context_type = 'drill' AND context_id IN (SELECT id FROM drills WHERE workout_id = ?)").run(workoutId)

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      db.prepare(`DELETE FROM messages WHERE context_type = 'recording' AND context_id IN (${placeholders})`).run(...ids)
      db.prepare(`UPDATE recordings SET parent_recording_id = NULL WHERE parent_recording_id IN (${placeholders})`).run(...ids)
      db.prepare(`DELETE FROM recordings WHERE id IN (${placeholders})`).run(...ids)
    }

    db.prepare('DELETE FROM schedule WHERE workout_id = ?').run(workoutId)
    db.prepare('DELETE FROM drills WHERE workout_id = ?').run(workoutId)
    db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId)
  })

  deleteWorkout(id, recordingIds)

  const uniqueVideoPaths = [...new Set(recordings.map((r) => r.video_path).filter((p): p is string => !!p))]
  if (uniqueVideoPaths.length > 0) {
    const dir = path.isAbsolute(RECORDINGS_DIR) ? RECORDINGS_DIR : path.join(process.cwd(), RECORDINGS_DIR)
    for (const videoPath of uniqueVideoPaths) {
      const remaining = db.prepare('SELECT COUNT(*) as c FROM recordings WHERE video_path = ?')
        .get(videoPath) as { c: number }
      if (remaining.c > 0) continue
      const fullPath = path.join(dir, videoPath)
      if (fullPath.startsWith(dir)) {
        try { await unlink(fullPath) } catch { /* file may already be gone */ }
      }
    }
  }

  return Response.json({ success: true })
}
