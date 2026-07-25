export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/session'

import { db } from '@/lib/db'

interface TrainerAiSettingsRow {
  ai_model: string | null
  ai_credentials: string | null
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }

  // Avatars are not in the JWT, so every caller that renders the signed-in user
  // would otherwise have to make a second request for them.
  const avatar = db
    .prepare('SELECT avatar_path FROM users WHERE id = ?')
    .get(session.id) as { avatar_path: string | null } | undefined
  Object.assign(session, { avatar_path: avatar?.avatar_path ?? null })

  // Get freshest data from DB for trainers (like ai_model, ai_credentials)
  if (session.role === 'trainer') {
    const dbUser = db
      .prepare('SELECT ai_model, ai_credentials FROM users WHERE id = ?')
      .get(session.id) as TrainerAiSettingsRow | undefined
    if (dbUser) {
      Object.assign(session, dbUser)
    }
  }

  return Response.json({ user: session }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
