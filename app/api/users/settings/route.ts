import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

const ALLOWED_MODELS = [
  'Claude Code (API)',
  'Codex CLI',
  'OpenAI',
  'OpenRouter',
  'MiniMax',
  'Local Model',
]

function normalizeAiModel(model: string | null | undefined) {
  if (!model || model === 'Claude Code CLI') return 'Codex CLI'
  if (model === 'Claude Code') return 'Claude Code (API)'
  return model
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'trainer') return Response.json({ error: 'Forbidden: Trainer access only' }, { status: 403 })

  const user = db.prepare('SELECT ai_model, ai_credentials FROM users WHERE id = ?').get(session.id) as { ai_model: string | null, ai_credentials: string | null } | undefined
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  let creds: Record<string, string> = {}
  try {
    if (user.ai_credentials) creds = JSON.parse(user.ai_credentials)
  } catch {
    // ignore parse errors
  }

  return Response.json({ ai_model: normalizeAiModel(user.ai_model), ai_credentials: creds })
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'trainer') return Response.json({ error: 'Forbidden: Trainer access only' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { ai_model, ai_credentials } = body

  const normalizedModel = normalizeAiModel(ai_model)
  if (!normalizedModel) return Response.json({ error: 'Missing ai_model' }, { status: 400 })
  if (!ALLOWED_MODELS.includes(normalizedModel)) return Response.json({ error: 'Invalid ai_model value' }, { status: 400 })

  const credsStr = ai_credentials ? JSON.stringify(ai_credentials) : null

  db.prepare('UPDATE users SET ai_model = ?, ai_credentials = ? WHERE id = ?').run(normalizedModel, credsStr, session.id)

  return Response.json({ success: true, ai_model: normalizedModel, ai_credentials })
}
