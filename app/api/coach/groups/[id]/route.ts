import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

/* PATCH exists so the at-capacity state on Teams
 * (design/hooptrack-raw-individual-screens/states/002-coach-roster-full-raw.png)
 * has a working INCREASE LIMIT — raising the limit is what unlocks the request
 * form, so the button needs a real endpoint rather than a stub. */

const patchSchema = z.object({
  player_limit: z.number().int().positive().max(500).nullable().optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
})

type GroupRow = {
  id: number
  player_limit: number | null
  member_count: number
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.actual_role || session.role) !== 'trainer') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const groupId = Number.parseInt(id, 10)
  if (!Number.isInteger(groupId)) return Response.json({ error: 'Bad id' }, { status: 400 })

  // Scope by coach_id so one trainer cannot retarget another's group.
  const group = db
    .prepare(
      `SELECT g.id, g.player_limit,
              (SELECT COUNT(*) FROM coach_group_members m WHERE m.group_id = g.id) AS member_count
         FROM coach_groups g
        WHERE g.id = ? AND g.coach_id = ? AND g.archived_at IS NULL`,
    )
    .get(groupId, session.id) as GroupRow | undefined
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 })

  let data: z.infer<typeof patchSchema>
  try {
    data = patchSchema.parse(await request.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  // A limit below the current roster would leave the group permanently over
  // capacity with no way back, so it is rejected rather than silently clamped.
  if (data.player_limit != null && data.player_limit < group.member_count) {
    return Response.json(
      { error: `Limit cannot be below the ${group.member_count} players already in this group.` },
      { status: 400 },
    )
  }

  const updates: string[] = []
  const args: (string | number | null)[] = []
  if (data.player_limit !== undefined) {
    updates.push('player_limit = ?')
    args.push(data.player_limit)
  }
  if (data.name !== undefined) {
    updates.push('name = ?')
    args.push(data.name)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    args.push(data.description)
  }
  if (updates.length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 })

  args.push(groupId)
  db.prepare(`UPDATE coach_groups SET ${updates.join(', ')} WHERE id = ?`).run(...args)

  const updated = db
    .prepare('SELECT id, name, group_type, player_limit, description FROM coach_groups WHERE id = ?')
    .get(groupId)
  return Response.json({ group: updated })
}
