import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'player') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const invites = db.prepare(`
    SELECT
      i.id,
      i.status,
      i.message,
      i.created_at,
      i.expires_at,
      i.responded_at,
      g.id AS group_id,
      g.name AS group_name,
      g.group_type,
      g.player_limit,
      coach.id AS coach_id,
      coach.name AS coach_name,
      coach.email AS coach_email,
      COUNT(m.id) AS member_count
    FROM coach_group_invites i
    JOIN coach_groups g ON g.id = i.group_id
    JOIN users coach ON coach.id = i.coach_id
    LEFT JOIN coach_group_members m ON m.group_id = g.id
    WHERE i.player_id = ?
      AND (i.status != 'pending' OR i.expires_at > datetime('now'))
    GROUP BY i.id
    ORDER BY CASE i.status WHEN 'pending' THEN 0 ELSE 1 END, i.created_at DESC
  `).all(session.id)

  const memberships = db.prepare(`
    SELECT
      g.id,
      g.name,
      g.group_type,
      g.player_limit,
      g.description,
      m.joined_at,
      coach.id AS coach_id,
      coach.name AS coach_name,
      COUNT(all_members.id) AS member_count
    FROM coach_group_members m
    JOIN coach_groups g ON g.id = m.group_id
    JOIN users coach ON coach.id = g.coach_id
    LEFT JOIN coach_group_members all_members ON all_members.group_id = g.id
    WHERE m.player_id = ? AND g.archived_at IS NULL
    GROUP BY g.id
    ORDER BY m.joined_at DESC
  `).all(session.id)

  return Response.json({ invites, memberships })
}
