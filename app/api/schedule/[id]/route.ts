import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface ScheduleRow {
  id: number
  player_id: number
  workout_id: number | null
  scheduled_date: string
  item_type: string
  title: string | null
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (body.completed !== undefined) {
    const row = db.prepare('SELECT id, player_id, workout_id, scheduled_date, item_type, title FROM schedule WHERE id = ?').get(id) as ScheduleRow | undefined
    db.prepare('UPDATE schedule SET completed = ?, completed_at = ? WHERE id = ?')
      .run(body.completed ? 1 : 0, body.completed ? new Date().toISOString() : null, id)

    // If completing and the actor is the player themselves, notify their trainer(s)
    if (body.completed && row && row.player_id === session.id) {
      // Notify any trainer (broadcast to all trainers)
      const trainers = db.prepare("SELECT id FROM users WHERE role = 'trainer'").all() as { id: number }[]
      const playerName = (db.prepare('SELECT name FROM users WHERE id = ?').get(row.player_id) as { name: string } | undefined)?.name || 'Player'
      const titleStr = row.title || row.item_type
      for (const t of trainers) {
        if (t.id === session.id) continue
        createNotification({
          player_id: t.id,
          actor_id: session.id,
          type: 'workout_completed',
          message: `${playerName} completed: ${titleStr}`,
          link_url: '/dashboard/calendar',
        }).catch(() => {})
      }
    }
  }

  return Response.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  db.prepare('DELETE FROM schedule WHERE id = ?').run(id)
  return Response.json({ success: true })
}
