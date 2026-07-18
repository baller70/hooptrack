import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

const responseSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

type InviteRow = {
  id: number
  group_id: number
  coach_id: number
  player_id: number
  status: string
  group_name: string
  player_limit: number | null
  member_count: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'player') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const inviteId = parseInt(id)
  if (!Number.isFinite(inviteId)) return Response.json({ error: 'Bad invite id' }, { status: 400 })

  try {
    const data = responseSchema.parse(await request.json())
    const invite = db.prepare(`
      SELECT i.*, g.name AS group_name, g.player_limit, COUNT(m.id) AS member_count
      FROM coach_group_invites i
      JOIN coach_groups g ON g.id = i.group_id
      LEFT JOIN coach_group_members m ON m.group_id = g.id
      WHERE i.id = ? AND i.player_id = ?
      GROUP BY i.id
    `).get(inviteId, session.id) as InviteRow | undefined
    if (!invite) return Response.json({ error: 'Invite not found' }, { status: 404 })
    if (invite.status !== 'pending') return Response.json({ error: 'Invite already answered' }, { status: 409 })

    if (data.action === 'decline') {
      db.prepare("UPDATE coach_group_invites SET status = 'declined', responded_at = datetime('now') WHERE id = ?").run(invite.id)
      await createNotification({
        player_id: invite.coach_id,
        actor_id: session.id,
        type: 'system',
        message: `${session.name} declined the request to join ${invite.group_name}.`,
        link_url: '/coach/teams',
        push_title: 'HoopTrack request update',
        push_now: true,
      })
      return Response.json({ status: 'declined' })
    }

    if (invite.player_limit != null && invite.member_count >= invite.player_limit) {
      return Response.json({ error: 'This group is already full' }, { status: 409 })
    }

    const acceptInvite = db.transaction(() => {
      db.prepare(`
        INSERT OR IGNORE INTO coach_group_members (group_id, player_id, added_by)
        VALUES (?, ?, ?)
      `).run(invite.group_id, session.id, invite.coach_id)
      db.prepare("UPDATE coach_group_invites SET status = 'accepted', responded_at = datetime('now') WHERE id = ?").run(invite.id)
    })
    acceptInvite()

    await createNotification({
      player_id: invite.coach_id,
      actor_id: session.id,
      type: 'system',
      message: `${session.name} accepted the request to join ${invite.group_name}.`,
      link_url: '/coach/teams',
      push_title: 'HoopTrack request accepted',
      push_now: true,
    })

    return Response.json({ status: 'accepted' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Could not answer invite' }, { status: 500 })
  }
}
