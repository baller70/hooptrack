import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { createNotification, type NotificationType } from '@/lib/notifications'

const TYPES = [
  'reminder', 'inspirational',
  'workout_assigned', 'move_assigned', 'quiz_assigned', 'quote_assigned',
  'workout_completed', 'pr_set', 'streak_milestone', 'system',
] as const

const createSchema = z.object({
  player_id: z.number().int(),
  message: z.string().min(1),
  type: z.enum(TYPES),
  scheduled_for: z.string().optional(),
  link_url: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread_only') === 'true'
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
  const targetPlayerId = session.role === 'player'
    ? session.id
    : parseInt(searchParams.get('playerId') || String(session.id))

  let query = 'SELECT * FROM notifications WHERE player_id = ?'
  const params: (number | string)[] = [targetPlayerId]
  if (unreadOnly) query += ' AND read_at IS NULL'
  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const notifications = db.prepare(query).all(...params)
  return Response.json({ notifications })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const id = await createNotification({
      player_id: data.player_id,
      message: data.message,
      type: data.type as NotificationType,
      link_url: data.link_url ?? null,
      actor_id: session.id,
    })

    return Response.json({ id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
