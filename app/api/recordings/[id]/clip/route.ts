import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const schema = z.object({
  clip_start: z.number().int().nonnegative(),
  clip_end: z.number().int().positive(),
  title: z.string().min(1).max(200),
})

interface ParentRow {
  id: number
  player_id: number
  drill_id: number
  blob_key: string
  video_path: string | null
  video_size_bytes: number | null
  video_mime: string | null
  duration_seconds: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parent = db.prepare(
    'SELECT id, player_id, drill_id, blob_key, video_path, video_size_bytes, video_mime, duration_seconds FROM recordings WHERE id = ?'
  ).get(id) as ParentRow | undefined
  if (!parent) return Response.json({ error: 'Source recording not found' }, { status: 404 })
  if (parent.player_id !== session.id && session.role !== 'trainer') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!parent.video_path) {
    return Response.json({ error: 'Source recording has no uploaded video' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const data = schema.parse(body)
    if (data.clip_end <= data.clip_start) {
      return Response.json({ error: 'clip_end must be after clip_start' }, { status: 400 })
    }
    if (data.clip_end > parent.duration_seconds) {
      return Response.json({ error: 'clip_end exceeds source duration' }, { status: 400 })
    }

    const clipDuration = data.clip_end - data.clip_start
    const newBlobKey = `${parent.blob_key}-clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const result = db.prepare(
      `INSERT INTO recordings (
        player_id, drill_id, duration_seconds, blob_key, notes, rep_count,
        video_path, video_size_bytes, video_mime,
        clip_start, clip_end, title, parent_recording_id
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      parent.player_id,
      parent.drill_id,
      clipDuration,
      newBlobKey,
      null,
      parent.video_path,
      parent.video_size_bytes,
      parent.video_mime,
      data.clip_start,
      data.clip_end,
      data.title,
      parent.id,
    )

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('Clip creation error:', err)
    return Response.json({ error: 'Clip creation failed' }, { status: 500 })
  }
}
