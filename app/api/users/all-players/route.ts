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

  const coachId = session.actual_id || session.id

  const players = db.prepare(`
    SELECT DISTINCT user.id, user.name, user.email, user.role
    FROM users user
    JOIN coach_group_members member ON member.player_id = user.id
    JOIN coach_groups coach_group ON coach_group.id = member.group_id
    WHERE coach_group.coach_id = ? AND coach_group.archived_at IS NULL
    ORDER BY user.name, user.email
  `).all(coachId)

  return Response.json({ players })
}
