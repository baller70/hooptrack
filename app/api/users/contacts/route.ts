export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Trainers can chat with players; players can chat with trainers
  const targetRole = session.role === 'trainer' ? 'player' : 'trainer'
  const contacts = db.prepare(
    'SELECT id, name, role FROM users WHERE role = ? ORDER BY name'
  ).all(targetRole)

  return Response.json({ contacts })
}
