import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

let cachedSecret: Uint8Array | undefined

function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be at least 32 characters. ' +
        'Refusing to sign or verify tokens with a missing or weak secret.'
    )
  }
  cachedSecret = new TextEncoder().encode(secret)
  return cachedSecret
}

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
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}
