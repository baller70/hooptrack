export const dynamic = "force-dynamic"
import { getSession } from '@/lib/session'
import { generateCoachFeedback } from '@/lib/ai'
import { db } from '@/lib/db'
import { rateLimit, requestIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = rateLimit(`ai-feedback:${session.id}:${requestIp(request)}`, 30, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const { drillId, duration } = body

    const drill = db.prepare(`
      SELECT d.name, d.category, d.duration_seconds,
        (SELECT COUNT(*) FROM recordings r WHERE r.drill_id = d.id AND r.player_id = ?) as previous_attempts
      FROM drills d WHERE d.id = ?
    `).get(session.id, drillId) as { name: string; category: string; duration_seconds: number; previous_attempts: number } | undefined

    if (!drill) return Response.json({ error: 'Drill not found' }, { status: 404 })

    const feedback = await generateCoachFeedback({
      playerName: session.name,
      drillName: drill.name,
      drillCategory: drill.category,
      duration,
      targetDuration: drill.duration_seconds,
      previousAttempts: drill.previous_attempts,
    })

    return Response.json({ feedback })
  } catch (err) {
    console.error('AI feedback error:', err)
    return Response.json({ error: 'Failed to generate feedback' }, { status: 500 })
  }
}
