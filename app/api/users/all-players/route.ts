export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// Always returns the list of players, regardless of the caller's view-as role.
// Used by the trainer's view-as toggle while they're already impersonating.
export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const realRole = session.actual_role || session.role
  if (realRole !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const players = db.prepare(
    "SELECT id, name, role FROM users WHERE role = 'player' ORDER BY name"
  ).all()

  return Response.json({ players })
}
