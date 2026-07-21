import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'player' || session.actual_id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const groupId = Number.parseInt(id, 10)
  if (!Number.isInteger(groupId)) return Response.json({ error: 'Invalid group' }, { status: 400 })

  const membership = db.prepare(`
    SELECT member.id, coach_group.coach_id, coach_group.name AS group_name
    FROM coach_group_members member
    JOIN coach_groups coach_group ON coach_group.id = member.group_id
    WHERE member.group_id = ? AND member.player_id = ? AND coach_group.archived_at IS NULL
  `).get(groupId, session.id) as { id: number; coach_id: number; group_name: string } | undefined
  if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 })

  db.prepare('DELETE FROM coach_group_members WHERE id = ?').run(membership.id)
  await createNotification({
    player_id: membership.coach_id,
    actor_id: session.id,
    type: 'system',
    message: `${session.name} left ${membership.group_name}.`,
    link_url: '/coach/teams',
    push_title: 'HoopTrack team update',
    push_now: true,
  })
  return Response.json({ success: true })
}
