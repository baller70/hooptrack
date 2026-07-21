import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const inviteSchema = z.object({
  email: z.string().trim().email(),
  message: z.string().trim().max(400).optional(),
})

type GroupRow = {
  id: number
  coach_id: number
  name: string
  group_type: 'team' | 'training_session'
  player_limit: number | null
  member_count: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.actual_role || session.role) !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const coachId = session.actual_id || session.id
  const limited = rateLimit(`group-invite:${coachId}:${requestIp(request)}`, 30, 60 * 60 * 1000)
  if (limited) return limited

  const { id } = await params
  const groupId = parseInt(id)
  if (!Number.isFinite(groupId)) return Response.json({ error: 'Bad group id' }, { status: 400 })

  try {
    const data = inviteSchema.parse(await request.json())
    const group = db.prepare(`
      SELECT g.*, COUNT(m.id) AS member_count
      FROM coach_groups g
      LEFT JOIN coach_group_members m ON m.group_id = g.id
      WHERE g.id = ? AND g.coach_id = ? AND g.archived_at IS NULL
      GROUP BY g.id
    `).get(groupId, coachId) as GroupRow | undefined
    if (!group) return Response.json({ error: 'Group not found' }, { status: 404 })
    if (group.player_limit != null && group.member_count >= group.player_limit) {
      return Response.json({ error: 'This group is already full' }, { status: 409 })
    }

    const player = db.prepare(
      "SELECT id, name, email FROM users WHERE lower(email) = lower(?) AND role = 'player'"
    ).get(data.email) as { id: number; name: string; email: string } | undefined
    // Return the same accepted response for an unknown address. This prevents
    // coaches (or a compromised Coach account) from enumerating Player emails.
    if (!player) return Response.json({ id: 0, status: 'queued' }, { status: 202 })

    const existingMember = db.prepare(
      'SELECT id FROM coach_group_members WHERE group_id = ? AND player_id = ?'
    ).get(groupId, player.id)
    if (existingMember) return Response.json({ error: 'Player is already in this group' }, { status: 409 })

    const result = db.prepare(`
      INSERT INTO coach_group_invites (group_id, coach_id, player_id, message, expires_at)
      VALUES (?, ?, ?, ?, datetime('now', '+7 days'))
    `).run(groupId, coachId, player.id, data.message || null)

    await createNotification({
      player_id: player.id,
      actor_id: coachId,
      type: 'team_invite',
      message: `${session.actual_name || session.name} invited you to join ${group.name}.`,
      link_url: '/player/requests',
      push_title: 'HoopTrack request',
      push_now: true,
    })

    return Response.json({ id: result.lastInsertRowid, player }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : ''
    if (message.includes('UNIQUE constraint failed')) {
      return Response.json({ error: 'A pending request already exists for this player' }, { status: 409 })
    }
    return Response.json({ error: 'Could not send request' }, { status: 500 })
  }
}
