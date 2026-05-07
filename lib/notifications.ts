import { db } from '@/lib/db'
import webpush from 'web-push'

export type NotificationType =
  | 'reminder'
  | 'inspirational'
  | 'workout_assigned'
  | 'move_assigned'
  | 'quiz_assigned'
  | 'quote_assigned'
  | 'workout_completed'
  | 'pr_set'
  | 'streak_milestone'
  | 'message_received'
  | 'system'

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  if (!pub || !priv) return false
  try {
    webpush.setVapidDetails(subject, pub, priv)
    vapidConfigured = true
    return true
  } catch {
    return false
  }
}

interface PushSub {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

async function sendPushToUser(userId: number, payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!ensureVapid()) return
  const subs = db.prepare(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'
  ).all(userId) as PushSub[]
  if (subs.length === 0) return

  const data = JSON.stringify(payload)
  const deleteStale = db.prepare('DELETE FROM push_subscriptions WHERE id = ?')

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          // Subscription gone — clean up
          deleteStale.run(s.id)
        } else {
          console.error('Push failed:', err)
        }
      }
    })
  )
}

interface CreateOpts {
  player_id: number
  message: string
  type: NotificationType
  link_url?: string | null
  actor_id?: number | null
  push_title?: string
}

export async function createNotification(opts: CreateOpts): Promise<number> {
  const now = new Date().toISOString()
  const result = db.prepare(
    'INSERT INTO notifications (player_id, message, type, scheduled_for, sent, link_url, actor_id, created_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
  ).run(
    opts.player_id,
    opts.message,
    opts.type,
    now,
    opts.link_url ?? null,
    opts.actor_id ?? null,
    now,
  )
  const id = result.lastInsertRowid as number

  // Fire push (don't await — fire and forget so callers stay fast)
  sendPushToUser(opts.player_id, {
    title: opts.push_title || 'HoopTrack',
    body: opts.message,
    url: opts.link_url || '/dashboard/notifications',
    tag: `notif-${id}`,
  }).catch((e) => console.error('push fanout failed', e))

  return id
}
