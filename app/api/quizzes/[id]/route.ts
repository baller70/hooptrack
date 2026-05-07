import { db, parseJSON } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id)
  if (!quiz) return Response.json({ error: 'Not found' }, { status: 404 })

  const questions = db.prepare(
    'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order'
  ).all(id) as Array<{ id: number; quiz_id: number; question_text: string; video_url: string | null; options: string; correct_answer: string; question_order: number }>

  const parsed = questions.map((q) => ({
    ...q,
    options: parseJSON<string[]>(q.options) || [],
  }))

  return Response.json({ quiz, questions: parsed })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const updates: string[] = []
  const args: (string | number | null)[] = []
  if (typeof body.title === 'string' && body.title.trim().length > 0) {
    updates.push('title = ?')
    args.push(body.title.trim().slice(0, 200))
  }
  if (typeof body.position === 'string' || body.position === null) {
    updates.push('position = ?')
    args.push(body.position ?? null)
  }
  if (typeof body.game_situation === 'string' || body.game_situation === null) {
    updates.push('game_situation = ?')
    args.push(body.game_situation ?? null)
  }
  if (updates.length === 0) return Response.json({ success: true })

  args.push(id)
  db.prepare(`UPDATE quizzes SET ${updates.join(', ')} WHERE id = ?`).run(...args)
  return Response.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(id)
  return Response.json({ success: true })
}
