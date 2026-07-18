import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

const schema = z.object({
  message_id: z.number().int().positive(),
  reason: z.enum(['harassment', 'hate', 'threat', 'sexual', 'spam', 'other']).default('other'),
  details: z.string().trim().max(1000).optional(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = schema.parse(await request.json())
    const message = db.prepare(`
      SELECT id, sender_id, recipient_id
      FROM messages
      WHERE id = ? AND (sender_id = ? OR recipient_id = ?)
    `).get(data.message_id, session.id, session.id) as
      | { id: number; sender_id: number; recipient_id: number | null }
      | undefined
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })
    if (message.sender_id === session.id) return Response.json({ error: 'You cannot report your own message' }, { status: 400 })

    db.prepare(`
      INSERT INTO content_reports (reporter_id, reported_user_id, message_id, reason, details)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(reporter_id, message_id) WHERE message_id IS NOT NULL
      DO UPDATE SET reason = excluded.reason, details = excluded.details, status = 'open', created_at = datetime('now')
    `).run(session.id, message.sender_id, message.id, data.reason, data.details ?? null)

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0].message }, { status: 400 })
    console.error('Report message error:', error)
    return Response.json({ error: 'Could not submit report' }, { status: 500 })
  }
}
