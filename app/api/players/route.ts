import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const players = db.prepare("SELECT id, name, email FROM users WHERE role = 'player' ORDER BY name").all()
  return Response.json({ players })
}
