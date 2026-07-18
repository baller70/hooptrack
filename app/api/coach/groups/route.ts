import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

const groupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  group_type: z.enum(['team', 'training_session']),
  player_limit: z.number().int().positive().max(500).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
})

type GroupRow = {
  id: number
  coach_id: number
  name: string
  group_type: 'team' | 'training_session'
  player_limit: number | null
  description: string | null
  created_at: string
  member_count: number
  pending_invite_count: number
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.actual_role || session.role) !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const groups = db.prepare(`
    SELECT
      g.*,
      COUNT(DISTINCT m.id) AS member_count,
      COUNT(DISTINCT i.id) AS pending_invite_count
    FROM coach_groups g
    LEFT JOIN coach_group_members m ON m.group_id = g.id
    LEFT JOIN coach_group_invites i ON i.group_id = g.id AND i.status = 'pending'
    WHERE g.coach_id = ? AND g.archived_at IS NULL
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(session.actual_id || session.id) as GroupRow[]

  const groupIds = groups.map((group) => group.id)
  const members = groupIds.length === 0
    ? []
    : db.prepare(`
      SELECT m.group_id, u.id, u.name, u.email, m.joined_at
      FROM coach_group_members m
      JOIN users u ON u.id = m.player_id
      WHERE m.group_id IN (${groupIds.map(() => '?').join(',')})
      ORDER BY u.name
    `).all(...groupIds)
  const invites = groupIds.length === 0
    ? []
    : db.prepare(`
      SELECT i.group_id, i.id, i.status, i.created_at, i.responded_at, u.id AS player_id, u.name, u.email
      FROM coach_group_invites i
      JOIN users u ON u.id = i.player_id
      WHERE i.group_id IN (${groupIds.map(() => '?').join(',')})
      ORDER BY i.created_at DESC
    `).all(...groupIds)

  return Response.json({ groups, members, invites })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.actual_role || session.role) !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const data = groupSchema.parse(await request.json())
    const result = db.prepare(`
      INSERT INTO coach_groups (coach_id, name, group_type, player_limit, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      session.actual_id || session.id,
      data.name,
      data.group_type,
      data.player_limit ?? null,
      data.description || null,
    )

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Could not create group' }, { status: 500 })
  }
}
