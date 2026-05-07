import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const now = new Date().toISOString()
  // Only update if it belongs to this user
  db.prepare(
    'UPDATE notifications SET read_at = ? WHERE id = ? AND player_id = ? AND read_at IS NULL'
  ).run(now, id, session.id)

  return Response.json({ success: true })
}
