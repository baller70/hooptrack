import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.actual_role || session.role) !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id, playerId } = await params
  const groupId = Number.parseInt(id, 10)
  const parsedPlayerId = Number.parseInt(playerId, 10)
  if (!Number.isInteger(groupId) || !Number.isInteger(parsedPlayerId)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const coachId = session.actual_id || session.id
  const membership = db.prepare(`
    SELECT member.id, coach_group.name AS group_name
    FROM coach_group_members member
    JOIN coach_groups coach_group ON coach_group.id = member.group_id
    WHERE member.group_id = ? AND member.player_id = ?
      AND coach_group.coach_id = ? AND coach_group.archived_at IS NULL
  `).get(groupId, parsedPlayerId, coachId) as { id: number; group_name: string } | undefined
  if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 })

  db.prepare('DELETE FROM coach_group_members WHERE id = ?').run(membership.id)
  await createNotification({
    player_id: parsedPlayerId,
    actor_id: coachId,
    type: 'system',
    message: `You were removed from ${membership.group_name}.`,
    link_url: '/player/requests',
    push_title: 'HoopTrack team update',
    push_now: true,
  })
  return Response.json({ success: true })
}
