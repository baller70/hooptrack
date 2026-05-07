import { getSession } from '@/lib/session'
import { generateInspirationalMessage } from '@/lib/ai'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const playerName = body.playerName || session.name

    const message = await generateInspirationalMessage(playerName)
    return Response.json({ message })
  } catch (err) {
    console.error('AI inspiration error:', err)
    return Response.json({ error: 'Failed to generate message' }, { status: 500 })
  }
}
