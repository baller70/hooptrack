import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.actual_role || session.role) !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id, inviteId } = await params
  const groupId = Number.parseInt(id, 10)
  const parsedInviteId = Number.parseInt(inviteId, 10)
  if (!Number.isInteger(groupId) || !Number.isInteger(parsedInviteId)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const coachId = session.actual_id || session.id
  const invite = db.prepare(`
    SELECT invite.id, invite.player_id, coach_group.name AS group_name
    FROM coach_group_invites invite
    JOIN coach_groups coach_group ON coach_group.id = invite.group_id
    WHERE invite.id = ? AND invite.group_id = ? AND invite.coach_id = ?
      AND coach_group.coach_id = ? AND coach_group.archived_at IS NULL
      AND invite.status = 'pending'
  `).get(parsedInviteId, groupId, coachId, coachId) as
    | { id: number; player_id: number; group_name: string }
    | undefined
  if (!invite) return Response.json({ error: 'Pending invite not found' }, { status: 404 })

  const updated = db.prepare(`
    UPDATE coach_group_invites
    SET status = 'cancelled', responded_at = datetime('now')
    WHERE id = ? AND status = 'pending'
  `).run(invite.id)
  if (updated.changes !== 1) return Response.json({ error: 'Invite is no longer pending' }, { status: 409 })

  await createNotification({
    player_id: invite.player_id,
    actor_id: coachId,
    type: 'system',
    message: `The request to join ${invite.group_name} was withdrawn.`,
    link_url: '/player/requests',
    push_title: 'HoopTrack request update',
    push_now: true,
  })
  return Response.json({ status: 'cancelled' })
}
