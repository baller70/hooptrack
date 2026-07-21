export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'
import { blockedUserIdsFor, objectionableContentReason, usersAreBlocked } from '@/lib/content-safety'
import { usersShareActiveGroup } from '@/lib/access'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const CONTEXT_TYPES = ['workout', 'drill', 'move', 'quiz', 'recording', 'general'] as const

const sendSchema = z.object({
  recipient_id: z.number().int(),
  body: z.string().min(1).max(4000),
  context_type: z.enum(CONTEXT_TYPES).optional(),
  context_id: z.number().int().optional(),
  context_title: z.string().max(200).optional(),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withParam = searchParams.get('with')
  const since = searchParams.get('since')
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '100'))

  if (!withParam) {
    // Return conversation summaries: every user this session has chatted with, with last message + unread count
    const blockedIds = new Set(blockedUserIdsFor(session.id))
    const rows = (db.prepare(`
      SELECT
        CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other_id,
        MAX(created_at) AS last_at,
        SUM(CASE WHEN recipient_id = ? AND read_at IS NULL THEN 1 ELSE 0 END) AS unread
      FROM messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY other_id
      ORDER BY last_at DESC
    `).all(session.id, session.id, session.id, session.id) as Array<{ other_id: number; last_at: string; unread: number }>).filter(
      (row) => !blockedIds.has(row.other_id) && usersShareActiveGroup(session.id, row.other_id),
    )

    const userIds = rows.map((r) => r.other_id)
    const users: Record<number, { id: number; name: string; role: string }> = {}
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',')
      const userRows = db.prepare(`SELECT id, name, role FROM users WHERE id IN (${placeholders})`).all(...userIds) as Array<{ id: number; name: string; role: string }>
      for (const u of userRows) users[u.id] = u
    }

    const conversations = rows.map((r) => {
      const last = db.prepare('SELECT body, sender_id, created_at FROM messages WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) ORDER BY created_at DESC LIMIT 1')
        .get(session.id, r.other_id, r.other_id, session.id) as { body: string; sender_id: number; created_at: string } | undefined
      return {
        other: users[r.other_id] || { id: r.other_id, name: 'Unknown', role: 'unknown' },
        last_message: last,
        unread: r.unread,
      }
    })

    return Response.json({ conversations })
  }

  const otherId = parseInt(withParam)
  if (!Number.isInteger(otherId)) return Response.json({ error: 'Invalid user' }, { status: 400 })
  if (!usersShareActiveGroup(session.id, otherId)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (usersAreBlocked(session.id, otherId)) {
    return Response.json({ messages: [], other: null, blocked: true })
  }
  let query = `SELECT m.*, u.name as sender_name FROM messages m
               JOIN users u ON u.id = m.sender_id
               WHERE ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))`
  const params: (number | string)[] = [session.id, otherId, otherId, session.id]
  if (since) {
    query += ' AND m.created_at > ?'
    params.push(since)
  }
  query += ' ORDER BY m.created_at ASC LIMIT ?'
  params.push(limit)

  const messages = db.prepare(query).all(...params)
  const other = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(otherId)

  // Mark inbound as read on fetch
  db.prepare('UPDATE messages SET read_at = ? WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL')
    .run(new Date().toISOString(), session.id, otherId)

  return Response.json({ messages, other })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = rateLimit(`message-send:${session.id}:${requestIp(request)}`, 60, 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const data = sendSchema.parse(body)

    if (data.recipient_id === session.id) {
      return Response.json({ error: 'Cannot message yourself' }, { status: 400 })
    }
    const recipient = db.prepare('SELECT id, name FROM users WHERE id = ?').get(data.recipient_id) as { id: number; name: string } | undefined
    if (!recipient) return Response.json({ error: 'Recipient not found' }, { status: 404 })
    if (!usersShareActiveGroup(session.id, data.recipient_id)) {
      return Response.json({ error: 'Messaging requires an active team connection' }, { status: 403 })
    }
    if (usersAreBlocked(session.id, data.recipient_id)) {
      return Response.json({ error: 'Messaging is unavailable for this conversation' }, { status: 403 })
    }
    const unsafeReason = objectionableContentReason(data.body)
    if (unsafeReason) return Response.json({ error: unsafeReason }, { status: 422 })

    const result = db.prepare(
      'INSERT INTO messages (sender_id, recipient_id, body, context_type, context_id, context_title) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      session.id,
      data.recipient_id,
      data.body,
      data.context_type ?? null,
      data.context_id ?? null,
      data.context_title ?? null,
    )

    // Fire notification for recipient
    const ctx = data.context_title ? ` about ${data.context_title}` : ''
    const preview = data.body.length > 80 ? data.body.slice(0, 77) + '...' : data.body
    createNotification({
      player_id: data.recipient_id,
      actor_id: session.id,
      type: 'message_received',
      message: `${session.name}${ctx}: ${preview}`,
      link_url: `/dashboard/notifications`,
      push_title: `Message from ${session.name}`,
    }).catch(() => {})

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('Send message error:', err)
    return Response.json({ error: 'Failed to send' }, { status: 500 })
  }
}
