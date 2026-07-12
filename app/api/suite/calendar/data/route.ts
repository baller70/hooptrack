import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

type ScheduleRow = {
  id: number
  player_id: number
  scheduled_date: string
  item_type: string | null
  item_id: number | null
  title: string | null
  notes: string | null
  start_time: string | null
  end_time: string | null
  workout_title: string | null
  player_name: string
}

function toIsoDate(date: string, time = '15:00') {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : '15:00'
  return new Date(`${date}T${safeTime}:00-04:00`).toISOString()
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

function mapType(itemType: string | null): 'practice' | 'game' | 'event' {
  if (itemType === 'workout') return 'practice'
  if (itemType === 'game') return 'game'
  if (itemType === 'move' || itemType === 'quiz') return 'event'
  return 'event'
}

export async function GET(request: Request) {
  const session = await getSession()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (session?.role === 'player') {
    conditions.push('s.player_id = ?')
    params.push(session.id)
  }

  if (from) {
    conditions.push('s.scheduled_date >= ?')
    params.push(from.slice(0, 10))
  }

  if (to) {
    conditions.push('s.scheduled_date < ?')
    params.push(to.slice(0, 10))
  }

  let query = `
    SELECT
      s.id,
      s.player_id,
      s.scheduled_date,
      s.item_type,
      s.item_id,
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
  const events = rows.map((row) => {
    const start = toIsoDate(row.scheduled_date, row.start_time || '15:00')
    const end = row.end_time
      ? toIsoDate(row.scheduled_date, row.end_time)
      : addMinutes(start, row.item_type === 'workout' ? 90 : 30)
    const title = row.title || row.workout_title || `${row.player_name} ${row.item_type || 'event'}`
    return {
      id: `schedule-${row.id}`,
      source: 'event',
      type: mapType(row.item_type),
      title,
      start,
      end,
      arrival: null,
      location: null,
      opponent: null,
      home: null,
      fixed: false,
      recurrence: null,
      venueId: null,
      notes: row.notes,
      playerId: String(row.player_id),
      playerName: row.player_name,
      rsvp: { going: 0, maybe: 0, no: 0, noResponse: 0 },
    }
  })

  return Response.json({ events, venues: [] }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
