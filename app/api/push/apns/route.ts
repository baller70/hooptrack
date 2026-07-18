import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const schema = z.object({
  device_token: z.string().regex(/^[a-f0-9]{64,200}$/i),
  environment: z.enum(['sandbox', 'production']),
  bundle_id: z.string().regex(/^[A-Za-z0-9.-]{3,255}$/),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = schema.parse(await request.json())
    db.prepare(
      `INSERT INTO apns_device_tokens (user_id, device_token, environment, bundle_id, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(device_token, environment, bundle_id) DO UPDATE SET
         user_id = excluded.user_id,
         updated_at = datetime('now')`
    ).run(session.id, data.device_token.toLowerCase(), data.environment, data.bundle_id)
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to register device' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.pick({ device_token: true, environment: true, bundle_id: true }).safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid device token' }, { status: 400 })
  db.prepare(
    'DELETE FROM apns_device_tokens WHERE user_id = ? AND device_token = ? AND environment = ? AND bundle_id = ?'
  ).run(session.id, parsed.data.device_token.toLowerCase(), parsed.data.environment, parsed.data.bundle_id)
  return Response.json({ success: true })
}
