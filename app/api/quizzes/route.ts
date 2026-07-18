import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'

const TIMER_MODES = ['timed', 'stopwatch'] as const
const POSITIONS = ['point_guard', 'shooting_guard', 'small_forward', 'power_forward', 'center', 'any'] as const
const GAME_SITUATIONS = ['any', 'late_game', 'transition', 'half_court_offense', 'sideline_oob', 'press_break', 'zone_offense'] as const

const createQuizSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['multiple_choice', 'video_based', 'mixed']),
  timer_mode: z.enum(TIMER_MODES).optional().default('stopwatch'),
  duration_seconds: z.number().int().positive().nullable().optional(),
  position: z.enum(POSITIONS).nullable().optional(),
  game_situation: z.enum(GAME_SITUATIONS).nullable().optional(),
  questions: z.array(z.object({
    question_text: z.string().min(1),
    video_url: z.string().optional(),
    options: z.array(z.string().min(1)).min(2).max(4),
    correct_answer: z.string().min(1),
  })).min(1),
})

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const quizzes = db.prepare(`
    SELECT q.*, u.name as creator_name,
      (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
      (SELECT MAX(qa.score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.player_id = ?) as best_score,
      (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.player_id = ?) as attempt_count
    FROM quizzes q
    JOIN users u ON u.id = q.created_by
    ORDER BY q.created_at DESC
  `).all(session.id, session.id)

  return Response.json({ quizzes })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createQuizSchema.parse(body)

    const createQuiz = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO quizzes (title, type, created_by, timer_mode, duration_seconds, position, game_situation) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        data.title,
        data.type,
        session.id,
        data.timer_mode,
        data.duration_seconds ?? null,
        data.position ?? null,
        data.game_situation ?? null,
      )

      const quizId = result.lastInsertRowid as number
      const insertQ = db.prepare(
        'INSERT INTO quiz_questions (quiz_id, question_text, video_url, options, correct_answer, question_order) VALUES (?, ?, ?, ?, ?, ?)'
      )
      data.questions.forEach((q, i) => {
        insertQ.run(quizId, q.question_text, q.video_url || null, JSON.stringify(q.options), q.correct_answer, i)
      })
      return quizId
    })

    const quizId = createQuiz()
    return Response.json({ id: quizId }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create quiz' }, { status: 500 })
  }
}
