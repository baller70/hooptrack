import { cookies } from 'next/headers'
import { verifyToken, UserPayload } from './auth'

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

  let target: { id: number; name: string; email: string; role: 'trainer' | 'player' } | undefined
  try {
    const { db } = await import('./db')
    target = db.prepare(
      "SELECT id, name, email, role FROM users WHERE id = ? AND role = 'player'"
    ).get(viewAsId) as { id: number; name: string; email: string; role: 'trainer' | 'player' } | undefined
  } catch (error) {
    console.error('Trainer view-as session lookup failed', error)
    return real
  }
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
