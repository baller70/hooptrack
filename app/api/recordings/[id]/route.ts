import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { canAccessPlayer } from '@/lib/access'
import { RECORDINGS_DIR } from '@/lib/constants'
import { resolveInside } from '@/lib/files'
import { unlink } from 'fs/promises'
import path from 'path'
import { z } from 'zod'

interface RecordingRow {
  id: number
  player_id: number
  video_path: string | null
  duration_seconds: number
}

const updateSchema = z.object({
  clip_start: z.number().int().nonnegative().nullable().optional(),
  clip_end: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
  title: z.string().max(200).nullable().optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = db.prepare('SELECT id, player_id, duration_seconds FROM recordings WHERE id = ?')
    .get(id) as RecordingRow | undefined
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessPlayer(session, row.player_id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    if (data.clip_start != null && data.clip_end != null && data.clip_end <= data.clip_start) {
      return Response.json({ error: 'clip_end must be after clip_start' }, { status: 400 })
    }

    const updates: string[] = []
    const args: (number | string | null)[] = []
    if ('clip_start' in data) { updates.push('clip_start = ?'); args.push(data.clip_start ?? null) }
    if ('clip_end' in data) { updates.push('clip_end = ?'); args.push(data.clip_end ?? null) }
    if ('notes' in data) { updates.push('notes = ?'); args.push(data.notes ?? null) }
    if ('title' in data) { updates.push('title = ?'); args.push(data.title ?? null) }
    if (updates.length === 0) return Response.json({ success: true })

    args.push(id)
    db.prepare(`UPDATE recordings SET ${updates.join(', ')} WHERE id = ?`).run(...args)
    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('Recording update error:', err)
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const row = db.prepare('SELECT id, player_id, video_path FROM recordings WHERE id = ?')
    .get(id) as RecordingRow | undefined
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessPlayer(session, row.player_id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Reference-count: if other recordings (clips) share this video_path, keep the file
  let canDeleteFile = false
  if (row.video_path) {
    const others = db.prepare(
      'SELECT COUNT(*) as c FROM recordings WHERE video_path = ? AND id != ?'
    ).get(row.video_path, row.id) as { c: number }
    canDeleteFile = others.c === 0
  }

  if (canDeleteFile && row.video_path) {
    const dir = path.isAbsolute(RECORDINGS_DIR) ? RECORDINGS_DIR : path.join(/* turbopackIgnore: true */ process.cwd(), RECORDINGS_DIR)
    const fullPath = resolveInside(dir, row.video_path)
    if (fullPath) {
      try { await unlink(fullPath) } catch { /* file may already be gone */ }
    }
  }

  // Null out parent_recording_id on derived clips that reference this row,
  // so they don't break (file may still exist via ref-count).
  db.prepare('UPDATE recordings SET parent_recording_id = NULL WHERE parent_recording_id = ?').run(id)
  db.prepare('DELETE FROM recordings WHERE id = ?').run(id)
  return Response.json({ success: true })
}
