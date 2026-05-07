export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ count: 0 })

  const row = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE player_id = ? AND read_at IS NULL'
  ).get(session.id) as { c: number }

  return Response.json({ count: row.c })
}
