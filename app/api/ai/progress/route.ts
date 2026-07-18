import { getSession } from '@/lib/session'
import { analyzePlayerProgress } from '@/lib/ai'
import { db } from '@/lib/db'
import { resolvePlayerId } from '@/lib/access'
import { rateLimit, requestIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = rateLimit(`ai-progress:${session.id}:${requestIp(request)}`, 20, 60 * 60 * 1000)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const playerId = resolvePlayerId(session, searchParams.get('playerId'))
  if (playerId instanceof Response) return playerId

  try {
    const player = db.prepare('SELECT name FROM users WHERE id = ?').get(playerId) as { name: string } | undefined
    if (!player) return Response.json({ error: 'Player not found' }, { status: 404 })

    const totalRecordings = (db.prepare('SELECT COUNT(*) as cnt FROM recordings WHERE player_id = ?').get(playerId) as { cnt: number }).cnt

    const categoryCounts = db.prepare(`
      SELECT d.category, COUNT(*) as cnt FROM recordings r
      JOIN drills d ON d.id = r.drill_id
      WHERE r.player_id = ?
      GROUP BY d.category
    `).all(playerId) as { category: string; cnt: number }[]

    const catMap: Record<string, number> = {}
    categoryCounts.forEach(c => { catMap[c.category] = c.cnt })

    // Calculate streak
    const completedDates = db.prepare(`
      SELECT scheduled_date FROM schedule WHERE player_id = ? AND completed = 1
      ORDER BY scheduled_date DESC
    `).all(playerId) as { scheduled_date: string }[]

    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    let checkDate = today
    for (const { scheduled_date } of completedDates) {
      if (scheduled_date === checkDate) {
        streak++
        const d = new Date(checkDate)
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().split('T')[0]
      } else break
    }

    // Quiz average
    const quizStats = db.prepare('SELECT AVG(score) as avg FROM quiz_attempts WHERE player_id = ?').get(playerId) as { avg: number | null }

    const analysis = await analyzePlayerProgress({
      playerName: player.name,
      totalRecordings,
      categoryCounts: catMap,
      streakDays: streak,
      quizAverage: Math.round(quizStats.avg || 0),
    })

    return Response.json(analysis)
  } catch (err) {
    console.error('AI progress error:', err)
    return Response.json({ error: 'Failed to analyze progress' }, { status: 500 })
  }
}
