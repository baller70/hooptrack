import { createNotification, type NotificationType } from '@/lib/notifications'

type NotifyOptions = {
  playerId: number
  actorId: number
  itemType: string
  title: string | null
  date: string
  startTime?: string | null
}

const TYPE_META: Record<string, { type: NotificationType; verb: string; url: string }> = {
  workout: { type: 'workout_assigned', verb: 'New workout assigned', url: '/dashboard/workouts' },
  move: { type: 'move_assigned', verb: 'New move to study', url: '/dashboard/moves' },
  quiz: { type: 'quiz_assigned', verb: 'New quiz to take', url: '/dashboard/classroom' },
  quote: { type: 'quote_assigned', verb: 'New message for you', url: '/dashboard/calendar' },
  event: { type: 'calendar_event', verb: 'New calendar event', url: '/dashboard/calendar' },
  film: { type: 'calendar_event', verb: 'New film session', url: '/dashboard/calendar' },
  game: { type: 'calendar_event', verb: 'New game scheduled', url: '/dashboard/calendar' },
}

function scheduledStart(date: string, startTime?: string | null) {
  const time = startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime : '15:00'
  return new Date(`${date}T${time}:00-04:00`)
}

function reminderTimes(start: Date) {
  const points = [
    { label: 'Tomorrow', at: new Date(start.getTime() - 24 * 60 * 60_000) },
    { label: '2-hour reminder', at: new Date(start.getTime() - 2 * 60 * 60_000) },
    { label: 'Now', at: start },
  ]
  const now = Date.now()
  return points.filter((point) => point.at.getTime() > now + 60_000)
}

export async function notifyScheduleAssignment(opts: NotifyOptions) {
  const meta = TYPE_META[opts.itemType] || TYPE_META.event
  const title = opts.title || opts.itemType || 'Calendar item'
  const dateLabel = opts.startTime ? `${opts.date} at ${opts.startTime}` : opts.date

  await createNotification({
    player_id: opts.playerId,
    actor_id: opts.actorId,
    type: meta.type,
    message: `${meta.verb}: ${title} (${dateLabel})`,
    link_url: meta.url,
    push_title: 'HoopTrack',
    push_now: true,
  })

  const start = scheduledStart(opts.date, opts.startTime)
  for (const reminder of reminderTimes(start)) {
    await createNotification({
      player_id: opts.playerId,
      actor_id: opts.actorId,
      type: 'reminder',
      message: `${reminder.label}: ${title} is scheduled for ${dateLabel}.`,
      link_url: meta.url,
      push_title: 'HoopTrack Reminder',
      scheduled_for: reminder.at.toISOString(),
      push_now: false,
    })
  }
}
