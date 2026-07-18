import { db } from './db'
import type { UserPayload } from './auth'

export function parsePositiveInt(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function resolvePlayerId(session: UserPayload, requested: string | number | null | undefined): number | Response {
  const requestedId = parsePositiveInt(requested)
  if (session.role === 'trainer') return requestedId ?? session.id
  if (requestedId != null && requestedId !== session.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session.id
}

export function canAccessPlayer(session: UserPayload, playerId: number): boolean {
  return session.role === 'trainer' || session.id === playerId
}

export function getContextParticipants(contextType: string, contextId: number): Set<number> | null {
  const participants = new Set<number>()

  if (contextType === 'general') return participants

  if (contextType === 'workout') {
    const row = db.prepare('SELECT created_by FROM workouts WHERE id = ?').get(contextId) as { created_by: number } | undefined
    if (!row) return null
    participants.add(row.created_by)
  } else if (contextType === 'drill') {
    const row = db
      .prepare('SELECT w.created_by FROM drills d JOIN workouts w ON w.id = d.workout_id WHERE d.id = ?')
      .get(contextId) as { created_by: number } | undefined
    if (!row) return null
    participants.add(row.created_by)
  } else if (contextType === 'move') {
    const row = db
      .prepare('SELECT created_by, assigned_to_player_id FROM player_moves WHERE id = ?')
      .get(contextId) as { created_by: number; assigned_to_player_id: number | null } | undefined
    if (!row) return null
    participants.add(row.created_by)
    if (row.assigned_to_player_id) participants.add(row.assigned_to_player_id)
  } else if (contextType === 'quiz') {
    const row = db.prepare('SELECT created_by FROM quizzes WHERE id = ?').get(contextId) as { created_by: number } | undefined
    if (!row) return null
    participants.add(row.created_by)
  } else if (contextType === 'recording') {
    const row = db
      .prepare('SELECT r.player_id, w.created_by FROM recordings r JOIN drills d ON d.id = r.drill_id JOIN workouts w ON w.id = d.workout_id WHERE r.id = ?')
      .get(contextId) as { player_id: number; created_by: number } | undefined
    if (!row) return null
    participants.add(row.player_id)
    participants.add(row.created_by)
  } else {
    return null
  }

  const past = db
    .prepare('SELECT DISTINCT sender_id, recipient_id FROM messages WHERE context_type = ? AND context_id = ?')
    .all(contextType, contextId) as { sender_id: number; recipient_id: number | null }[]
  for (const row of past) {
    participants.add(row.sender_id)
    if (row.recipient_id) participants.add(row.recipient_id)
  }

  return participants
}

export function canAccessContext(session: UserPayload, contextType: string, contextId: number): boolean {
  if (session.role === 'trainer') return true
  const participants = getContextParticipants(contextType, contextId)
  return participants != null && participants.has(session.id)
}
