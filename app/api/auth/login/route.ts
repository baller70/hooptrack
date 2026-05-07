import { db } from '@/lib/db'
import { verifyPassword, createToken, UserPayload } from '@/lib/auth'
import { cookies } from 'next/headers'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

    const user = db
      .prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?')
      .get(data.email) as { id: number; name: string; email: string; password_hash: string; role: 'trainer' | 'player' } | undefined

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(data.password, user.password_hash)
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }

    const token = await createToken(payload)
    const cookieStore = await cookies()
    cookieStore.set('hooptrack_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return Response.json({ user: payload })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Login failed' }, { status: 500 })
  }
}
