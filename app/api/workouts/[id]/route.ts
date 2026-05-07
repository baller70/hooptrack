import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  db.prepare('DELETE FROM workouts WHERE id = ?').run(id)

  return Response.json({ success: true })
}
