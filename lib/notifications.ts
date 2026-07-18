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
  | 'recording_created'
  | 'video_uploaded'
  | 'quiz_attempt'
  | 'missed_deadlines'
  | 'calendar_event'

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
  scheduled_for?: string | null
  push_now?: boolean
}

function fallbackUrlForUser(userId: number, area: 'calendar' | 'notifications') {
  const row = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: 'trainer' | 'player' } | undefined
  const base = row?.role === 'trainer' ? '/coach' : '/player'
  return `${base}/${area}`
}

export async function createNotification(opts: CreateOpts): Promise<number> {
  const now = new Date().toISOString()
  const scheduledFor = opts.scheduled_for || now
  const shouldPushNow = opts.push_now ?? scheduledFor <= now
  const result = db.prepare(
    'INSERT INTO notifications (player_id, message, type, scheduled_for, sent, link_url, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    opts.player_id,
    opts.message,
    opts.type,
    scheduledFor,
    shouldPushNow ? 1 : 0,
    opts.link_url ?? null,
    opts.actor_id ?? null,
    now,
  )
  const id = result.lastInsertRowid as number

  if (shouldPushNow) {
    // Fire push (don't await — fire and forget so callers stay fast)
    sendPushToUser(opts.player_id, {
      title: opts.push_title || 'HoopTrack',
      body: opts.message,
      url: opts.link_url || fallbackUrlForUser(opts.player_id, 'notifications'),
      tag: `notif-${id}`,
    }).catch((e) => console.error('push fanout failed', e))
  }

  return id
}

export async function sendDuePushNotifications(userId: number): Promise<number> {
  const now = new Date().toISOString()
  const rows = db.prepare(
    `SELECT id, message, link_url
     FROM notifications
     WHERE player_id = ?
       AND sent = 0
       AND scheduled_for <= ?
     ORDER BY scheduled_for ASC
     LIMIT 10`
  ).all(userId, now) as { id: number; message: string; link_url: string | null }[]

  for (const row of rows) {
    await sendPushToUser(userId, {
      title: 'HoopTrack Reminder',
      body: row.message,
      url: row.link_url || fallbackUrlForUser(userId, 'calendar'),
      tag: `notif-${row.id}`,
    })
    db.prepare('UPDATE notifications SET sent = 1 WHERE id = ?').run(row.id)
  }

  return rows.length
}

interface FanoutOpts {
  message: string
  type: NotificationType
  link_url?: string | null
  actor_id?: number | null
  push_title?: string
  exclude_user_id?: number | null
}

// Fan out a notification to every trainer in the system. Used to surface
// player activity (recordings, quiz attempts, PRs, etc.) on the trainer side.
export async function notifyAllTrainers(opts: FanoutOpts): Promise<number[]> {
  const trainers = db
    .prepare("SELECT id FROM users WHERE role = 'trainer'")
    .all() as { id: number }[]
  const ids: number[] = []
  for (const t of trainers) {
    if (opts.exclude_user_id != null && t.id === opts.exclude_user_id) continue
    try {
      const id = await createNotification({
        player_id: t.id,
        message: opts.message,
        type: opts.type,
        link_url: opts.link_url ?? null,
        actor_id: opts.actor_id ?? null,
        push_title: opts.push_title,
      })
      ids.push(id)
    } catch (e) {
      console.error('notifyAllTrainers failed for trainer', t.id, e)
    }
  }
  return ids
}
