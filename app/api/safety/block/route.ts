import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({ user_id: z.number().int().positive() })

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { user_id } = schema.parse(await request.json())
    if (user_id === session.id) return Response.json({ error: 'You cannot block yourself' }, { status: 400 })
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id)
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    db.prepare('INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)').run(session.id, user_id)
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0].message }, { status: 400 })
    console.error('Block user error:', error)
    return Response.json({ error: 'Could not block user' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { user_id } = schema.parse(await request.json())
    db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').run(session.id, user_id)
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0].message }, { status: 400 })
    console.error('Unblock user error:', error)
    return Response.json({ error: 'Could not unblock user' }, { status: 500 })
  }
}
