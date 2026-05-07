import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

const VIEW_AS_COOKIE = 'hooptrack_view_as'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('hooptrack_token')?.value
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await verifyToken(token)
  if (!session || session.role !== 'trainer') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const targetId = parseInt(body?.user_id)
  if (!Number.isFinite(targetId)) return Response.json({ error: 'Missing user_id' }, { status: 400 })

  const target = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(targetId) as { id: number; name: string; role: string } | undefined
  if (!target) return Response.json({ error: 'User not found' }, { status: 404 })

  // If they pick themselves (the real trainer), just clear the impersonation cookie.
  if (target.id === session.id) {
    cookieStore.delete(VIEW_AS_COOKIE)
    return Response.json({ success: true, viewing_as: { id: session.id, name: session.name, role: session.role } })
  }

  cookieStore.set(VIEW_AS_COOKIE, String(target.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })

  return Response.json({ success: true, viewing_as: { id: target.id, name: target.name, role: target.role } })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(VIEW_AS_COOKIE)
  return Response.json({ success: true })
}
