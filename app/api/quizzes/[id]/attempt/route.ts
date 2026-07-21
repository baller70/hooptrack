import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { notifyConnectedCoaches } from '@/lib/notifications'

const attemptSchema = z.object({
  answers: z.array(z.string()),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const data = attemptSchema.parse(body)

  const questions = db.prepare(
    'SELECT correct_answer FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order'
  ).all(id) as Array<{ correct_answer: string }>

  let correct = 0
  questions.forEach((q, i) => {
    if (data.answers[i] === q.correct_answer) correct++
  })

  const score = Math.round((correct / questions.length) * 100)

  const result = db.prepare(
    'INSERT INTO quiz_attempts (quiz_id, player_id, score, answers) VALUES (?, ?, ?, ?)'
  ).run(id, session.id, score, JSON.stringify(data.answers))

  // Surface quiz attempts from players to trainers
  if (session.role === 'player') {
    const playerName = (db
      .prepare('SELECT name FROM users WHERE id = ?')
      .get(session.id) as { name: string } | undefined)?.name || 'Player'
    const quizTitle = (db
      .prepare('SELECT title FROM quizzes WHERE id = ?')
      .get(id) as { title: string } | undefined)?.title || 'a quiz'
    notifyConnectedCoaches(session.id, {
      message: `${playerName} scored ${score}% on ${quizTitle} (${correct}/${questions.length})`,
      type: 'quiz_attempt',
      actor_id: session.id,
      link_url: `/dashboard/players/${session.id}`,
      push_title: 'Quiz completed',
    }).catch(() => {})
  }

  return Response.json({
    id: result.lastInsertRowid,
    score,
    correct,
    total: questions.length,
  })
}
