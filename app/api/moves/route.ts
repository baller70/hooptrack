import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const TIMER_MODES = ['timed', 'stopwatch', 'reps'] as const

const createMoveSchema = z.object({
  title: z.string().min(1),
  youtube_url: z.string().optional().default(''),
  category: z.string().min(1),
  description: z.string().optional(),
  assigned_to_player_id: z.number().int().optional(),
  clip_start: z.number().int().nonnegative().optional(),
  clip_end: z.number().int().positive().optional(),
  video_type: z.enum(['youtube', 'upload']).optional().default('youtube'),
  video_path: z.string().optional(),
  timer_mode: z.enum(TIMER_MODES).optional().default('stopwatch'),
  duration_seconds: z.number().int().positive().nullable().optional(),
  target_reps: z.number().int().positive().nullable().optional(),
  default_playback_rate: z.number().min(0.1).max(2).optional().default(1),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const playerId = searchParams.get('playerId')

  let query = `
    SELECT pm.*, u.name as creator_name, p.name as assigned_player_name
    FROM player_moves pm
    JOIN users u ON u.id = pm.created_by
    LEFT JOIN users p ON p.id = pm.assigned_to_player_id
  `
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (category) {
    conditions.push('pm.category = ?')
    params.push(category)
  }
  if (playerId) {
    conditions.push('(pm.assigned_to_player_id = ? OR pm.assigned_to_player_id IS NULL)')
    params.push(parseInt(playerId))
  } else if (session.role === 'player') {
    conditions.push('(pm.assigned_to_player_id = ? OR pm.assigned_to_player_id IS NULL)')
    params.push(session.id)
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY pm.category, pm.created_at DESC'

  const moves = db.prepare(query).all(...params)
  return Response.json({ moves })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createMoveSchema.parse(body)

    const result = db.prepare(
      'INSERT INTO player_moves (title, youtube_url, category, description, assigned_to_player_id, created_by, clip_start, clip_end, video_type, video_path, timer_mode, duration_seconds, target_reps, default_playback_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      data.title,
      data.youtube_url || '',
      data.category,
      data.description || null,
      data.assigned_to_player_id || null,
      session.id,
      data.clip_start || null,
      data.clip_end || null,
      data.video_type,
      data.video_path || null,
      data.timer_mode,
      data.duration_seconds ?? null,
      data.target_reps ?? null,
      data.default_playback_rate,
    )

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create move' }, { status: 500 })
  }
}
