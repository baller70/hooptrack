export const dynamic = "force-dynamic"
import { getSession } from '@/lib/session'
import { generateQuiz } from '@/lib/ai'
import { db } from '@/lib/db'
import { z } from 'zod'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const POSITIONS = ['point_guard', 'shooting_guard', 'small_forward', 'power_forward', 'center', 'any'] as const
const GAME_SITUATIONS = ['any', 'late_game', 'transition', 'half_court_offense', 'sideline_oob', 'press_break', 'zone_offense'] as const

const schema = z.object({
  topic: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.number().int().min(3).max(15),
  position: z.enum(POSITIONS).optional(),
  game_situation: z.enum(GAME_SITUATIONS).optional(),
  autoSave: z.boolean().optional(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })
  const limited = rateLimit(`ai-quiz:${session.id}:${requestIp(request)}`, 20, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const body = await request.json()
    const data = schema.parse(body)

    const quiz = await generateQuiz({
      topic: data.topic,
      difficulty: data.difficulty,
      questionCount: data.questionCount,
      position: data.position,
      gameSituation: data.game_situation,
    })

    if (data.autoSave) {
      const saveQuiz = db.transaction(() => {
        const result = db.prepare(
          'INSERT INTO quizzes (title, type, created_by, position, game_situation) VALUES (?, ?, ?, ?, ?)'
        ).run(
          quiz.title,
          'multiple_choice',
          session.id,
          data.position && data.position !== 'any' ? data.position : null,
          data.game_situation && data.game_situation !== 'any' ? data.game_situation : null,
        )

        const quizId = result.lastInsertRowid as number
        const insertQ = db.prepare(
          'INSERT INTO quiz_questions (quiz_id, question_text, video_url, options, correct_answer, question_order) VALUES (?, ?, ?, ?, ?, ?)'
        )
        quiz.questions.forEach((q: { question_text: string; options: string[]; correct_answer: string }, i: number) => {
          insertQ.run(quizId, q.question_text, null, JSON.stringify(q.options), q.correct_answer, i)
        })
        return quizId
      })

      const quizId = saveQuiz()
      return Response.json({ quiz, saved: true, quizId })
    }

    return Response.json({ quiz })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('AI quiz error:', err)
    return Response.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}
