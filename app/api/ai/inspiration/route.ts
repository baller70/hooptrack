import { getSession } from '@/lib/session'
import { generateInspirationalMessage } from '@/lib/ai'
import { rateLimit, requestIp } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  playerName: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} .,'’_-]+$/u).optional(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = rateLimit(`ai-inspiration:${session.id}:${requestIp(request)}`, 20, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const data = schema.parse(body)
    const playerName = data.playerName || session.name

    const message = await generateInspirationalMessage(playerName)
    return Response.json({ message })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('AI inspiration error:', err)
    return Response.json({ error: 'Failed to generate message' }, { status: 500 })
  }
}
