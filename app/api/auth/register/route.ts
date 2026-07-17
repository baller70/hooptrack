import { db } from '@/lib/db'
import { hashPassword, createToken, UserPayload } from '@/lib/auth'
import { cookies } from 'next/headers'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['trainer', 'player']),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)
    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(data.password)
    const result = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(data.name, data.email, passwordHash, data.role)

    const payload: UserPayload = {
      id: result.lastInsertRowid as number,
      email: data.email,
      role: data.role,
      name: data.name,
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
    console.error('REGISTRATION ERROR:', err)
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Registration failed' }, { status: 500 })
  }
}
