import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

type ScheduleRow = {
  id: number
  player_id: number
  scheduled_date: string
  item_type: string | null
  title: string | null
  notes: string | null
  start_time: string | null
  end_time: string | null
  workout_title: string | null
  player_name: string
}

function escapeIcs(value: string | null) {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function toUtcStamp(date: string, time: string) {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : '15:00'
  return new Date(`${date}T${safeTime}:00-04:00`)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export async function GET() {
  const session = await getSession()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (session?.role === 'player') {
    conditions.push('s.player_id = ?')
    params.push(session.id)
  }

  let query = `
    SELECT
      s.id,
      s.player_id,
      s.scheduled_date,
      s.item_type,
      s.title,
      s.notes,
      s.start_time,
      s.end_time,
      w.title AS workout_title,
      u.name AS player_name
    FROM schedule s
    JOIN users u ON u.id = s.player_id
    LEFT JOIN workouts w ON w.id = s.workout_id
  `
  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`
  query += ' ORDER BY s.scheduled_date ASC, s.id ASC'

  const rows = db.prepare(query).all(...params) as ScheduleRow[]
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HoopTrack//CoachAI Calendar Copy//EN',
    'CALSCALE:GREGORIAN',
  ]

  for (const row of rows) {
    const title = row.title || row.workout_title || `${row.player_name} ${row.item_type || 'event'}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:hooptrack-schedule-${row.id}@hooptrack`,
      `DTSTAMP:${now}`,
      `DTSTART:${toUtcStamp(row.scheduled_date, row.start_time || '15:00')}`,
      `DTEND:${toUtcStamp(row.scheduled_date, row.end_time || (row.item_type === 'workout' ? '16:30' : '15:30'))}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(row.notes)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
