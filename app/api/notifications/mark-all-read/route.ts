import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const result = db.prepare(
    'UPDATE notifications SET read_at = ? WHERE player_id = ? AND read_at IS NULL AND scheduled_for <= ?'
  ).run(now, session.id, now)

  return Response.json({ success: true, updated: result.changes })
}
