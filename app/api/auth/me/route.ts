export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/session'

import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }

  // Get freshest data from DB for trainers (like ai_model, ai_credentials)
  if (session.role === 'trainer') {
    const dbUser = db.prepare('SELECT ai_model, ai_credentials FROM users WHERE id = ?').get(session.id) as any
    if (dbUser) {
      Object.assign(session, dbUser)
    }
  }

  return Response.json({ user: session }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
