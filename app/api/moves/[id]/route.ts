import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { coachIdForSession } from '@/lib/access'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const coachId = session ? coachIdForSession(session) : null
  if (coachId == null) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const deleted = db.prepare('DELETE FROM player_moves WHERE id = ? AND created_by = ?').run(id, coachId)
  if (deleted.changes !== 1) return Response.json({ error: 'Move not found' }, { status: 404 })
  return Response.json({ success: true })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const coachId = session ? coachIdForSession(session) : null
  if (coachId == null) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!db.prepare('SELECT id FROM player_moves WHERE id = ? AND created_by = ?').get(id, coachId)) {
    return Response.json({ error: 'Move not found' }, { status: 404 })
  }
  const body = await request.json()

  // Partial: title-only rename
  if (
    typeof body.title === 'string' &&
    body.youtube_url === undefined &&
    body.category === undefined &&
    body.timer_mode === undefined &&
    body.clip_start === undefined &&
    body.default_playback_rate === undefined
  ) {
    const t = body.title.trim()
    if (!t) return Response.json({ error: 'Title cannot be empty' }, { status: 400 })
    db.prepare('UPDATE player_moves SET title = ? WHERE id = ?').run(t.slice(0, 200), id)
    return Response.json({ success: true })
  }

  // Partial: clip times only
  if (
    body.title === undefined &&
    body.timer_mode === undefined &&
    (body.clip_start !== undefined || body.clip_end !== undefined)
  ) {
    db.prepare(
      'UPDATE player_moves SET clip_start = ?, clip_end = ? WHERE id = ?'
    ).run(body.clip_start ?? null, body.clip_end ?? null, id)
    return Response.json({ success: true })
  }

  // Partial: timer fields only
  if (body.title === undefined && body.timer_mode !== undefined) {
    db.prepare(
      'UPDATE player_moves SET timer_mode = ?, duration_seconds = ?, target_reps = ? WHERE id = ?'
    ).run(
      body.timer_mode,
      body.duration_seconds ?? null,
      body.target_reps ?? null,
      id,
    )
    return Response.json({ success: true })
  }

  // Partial: playback rate only
  if (body.title === undefined && body.default_playback_rate !== undefined) {
    db.prepare('UPDATE player_moves SET default_playback_rate = ? WHERE id = ?')
      .run(body.default_playback_rate, id)
    return Response.json({ success: true })
  }

  // Full update
  if (body.title !== undefined) {
    db.prepare(
      'UPDATE player_moves SET title = ?, youtube_url = ?, category = ?, description = ?, assigned_to_player_id = ?, clip_start = ?, clip_end = ?, timer_mode = ?, duration_seconds = ?, target_reps = ?, default_playback_rate = ? WHERE id = ?'
    ).run(
      body.title,
      body.youtube_url || '',
      body.category,
      body.description || null,
      body.assigned_to_player_id || null,
      body.clip_start ?? null,
      body.clip_end ?? null,
      body.timer_mode ?? 'stopwatch',
      body.duration_seconds ?? null,
      body.target_reps ?? null,
      body.default_playback_rate ?? 1.0,
      id,
    )
  }

  return Response.json({ success: true })
}
