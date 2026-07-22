import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { resolveLocalModelBaseUrl } from '@/lib/ai'

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

type CredentialResult =
  | { ok: true; credentials: Record<string, string> | null }
  | { ok: false; error: string }

function normalizeAiCredentials(model: string, credentials: unknown): CredentialResult {
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    return { ok: true, credentials: null }
  }

  const normalized = Object.fromEntries(
    Object.entries(credentials as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
  if (model !== 'Local Model') return { ok: true, credentials: normalized }

  try {
    normalized.local_base_url = resolveLocalModelBaseUrl(normalized.local_base_url)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid Local Model base URL',
    }
  }
  return { ok: true, credentials: normalized }
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

  const normalizedCredentials = normalizeAiCredentials(normalizedModel, ai_credentials)
  if (!normalizedCredentials.ok) {
    return Response.json({ error: normalizedCredentials.error }, { status: 400 })
  }

  const credsStr = normalizedCredentials.credentials ? JSON.stringify(normalizedCredentials.credentials) : null

  db.prepare('UPDATE users SET ai_model = ?, ai_credentials = ? WHERE id = ?').run(normalizedModel, credsStr, session.id)

  return Response.json({ success: true, ai_model: normalizedModel, ai_credentials: normalizedCredentials.credentials })
}
