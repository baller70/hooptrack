import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'hooptrack-dev-secret-change-in-production'
)

export type UserPayload = {
  id: number
  email: string
  role: 'trainer' | 'player'
  name: string
  // When trainer is using "View as Player" mode, these track the real trainer
  // identity so we can revert. Set at session resolution time, NOT in the JWT.
  actual_id?: number
  actual_role?: 'trainer' | 'player'
  actual_name?: string
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createToken(payload: UserPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}
