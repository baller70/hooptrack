import { db } from '@/lib/db'

const DISALLOWED_PATTERNS: RegExp[] = [
  /\b(?:kill|hurt)\s+(?:you|yourself)\b/i,
  /\b(?:rape|lynch)\b/i,
  /\b(?:n[i1]gg(?:er|a)|f[a@]ggot)\b/i,
]

export function objectionableContentReason(value: string): string | null {
  const normalized = value.normalize('NFKC').replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  return DISALLOWED_PATTERNS.some((pattern) => pattern.test(normalized))
    ? 'This message may contain threatening or abusive language. Please revise it.'
    : null
}

export function usersAreBlocked(firstUserId: number, secondUserId: number): boolean {
  const row = db.prepare(`
    SELECT 1
    FROM blocked_users
    WHERE (blocker_id = ? AND blocked_id = ?)
       OR (blocker_id = ? AND blocked_id = ?)
    LIMIT 1
  `).get(firstUserId, secondUserId, secondUserId, firstUserId)
  return !!row
}

export function blockedUserIdsFor(userId: number): number[] {
  const rows = db.prepare(`
    SELECT CASE WHEN blocker_id = ? THEN blocked_id ELSE blocker_id END AS user_id
    FROM blocked_users
    WHERE blocker_id = ? OR blocked_id = ?
  `).all(userId, userId, userId) as Array<{ user_id: number }>
  return rows.map((row) => row.user_id)
}
