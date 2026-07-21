import { cookies } from 'next/headers'
import { verifyToken, UserPayload } from './auth'
import { db } from './db'

const VIEW_AS_COOKIE = 'hooptrack_view_as'

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('hooptrack_token')?.value
  if (!token) return null
  const real = await verifyToken(token)
  if (!real) return null

  // Only trainers can impersonate
  if (real.role !== 'trainer') return real

  const viewAsRaw = cookieStore.get(VIEW_AS_COOKIE)?.value
  if (!viewAsRaw) return real
  const viewAsId = parseInt(viewAsRaw)
  if (!Number.isFinite(viewAsId)) return real
  if (viewAsId === real.id) return real // viewing as self = no-op

  const target = db.prepare(`
    SELECT DISTINCT u.id, u.name, u.email, u.role
    FROM users u
    JOIN coach_group_members gm ON gm.player_id = u.id
    JOIN coach_groups g ON g.id = gm.group_id
    WHERE u.id = ? AND u.role = 'player' AND g.coach_id = ?
  `).get(viewAsId, real.id) as { id: number; name: string; email: string; role: 'trainer' | 'player' } | undefined
  if (!target) return real

  return {
    id: target.id,
    name: target.name,
    email: target.email,
    role: target.role,
    actual_id: real.id,
    actual_role: real.role,
    actual_name: real.name,
  }
}
