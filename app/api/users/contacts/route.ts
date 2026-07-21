export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { coachIdForSession } from '@/lib/access'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const coachId = coachIdForSession(session)
  const contacts = coachId != null
    ? db.prepare(`
      SELECT DISTINCT user.id, user.name, user.role
      FROM users user
      JOIN coach_group_members member ON member.player_id = user.id
      JOIN coach_groups coach_group ON coach_group.id = member.group_id
      WHERE coach_group.coach_id = ? AND coach_group.archived_at IS NULL
      ORDER BY user.name
    `).all(coachId)
    : db.prepare(`
      SELECT DISTINCT coach.id, coach.name, coach.role
      FROM users coach
      JOIN coach_groups coach_group ON coach_group.coach_id = coach.id
      JOIN coach_group_members member ON member.group_id = coach_group.id
      WHERE member.player_id = ? AND coach_group.archived_at IS NULL
      ORDER BY coach.name
    `).all(session.id)

  return Response.json({ contacts })
}
