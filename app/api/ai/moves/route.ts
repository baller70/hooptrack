export const dynamic = "force-dynamic"
import { getSession } from '@/lib/session'
import { generateMoveRecommendations } from '@/lib/ai'
import { db } from '@/lib/db'
import { resolvePlayerId } from '@/lib/access'
import { rateLimit, requestIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const limited = rateLimit(`ai-moves:${session.id}:${requestIp(request)}`, 20, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const playerId = resolvePlayerId(session, body.playerId)
    if (playerId instanceof Response) return playerId

    // Get player's recent drill history
    const recentDrills = db.prepare(`
      SELECT DISTINCT d.name FROM recordings r
      JOIN drills d ON d.id = r.drill_id
      WHERE r.player_id = ?
      ORDER BY r.recorded_at DESC LIMIT 10
    `).all(playerId) as { name: string }[]

    // Get categories with fewest recordings (weak areas)
    const categoryCounts = db.prepare(`
      SELECT d.category, COUNT(*) as cnt FROM recordings r
      JOIN drills d ON d.id = r.drill_id
      WHERE r.player_id = ?
      GROUP BY d.category ORDER BY cnt ASC
    `).all(playerId) as { category: string; cnt: number }[]

    const player = db.prepare('SELECT name FROM users WHERE id = ?').get(playerId) as { name: string } | undefined

    const recommendations = await generateMoveRecommendations({
      playerName: player?.name || session.name,
      skillLevel: body.skillLevel || 'intermediate',
      recentDrills: recentDrills.map(d => d.name),
      weakAreas: categoryCounts.slice(0, 3).map(c => c.category),
    })

    return Response.json(recommendations)
  } catch (err) {
    console.error('AI moves error:', err)
    return Response.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
