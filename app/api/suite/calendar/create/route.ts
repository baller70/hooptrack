import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { notifyScheduleAssignment } from '@/lib/schedule-notifications'
import { z } from 'zod'
import { canAccessPlayer } from '@/lib/access'

export const dynamic = 'force-dynamic'

const createCalendarEventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  type: z.enum(['PRACTICE', 'GAME', 'FILM', 'OTHER']).default('OTHER'),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
  location: z.string().trim().max(240).optional(),
  opponent: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  player_id: z.number().int().positive().optional(),
})

function scheduleType(type: string) {
  if (type === 'PRACTICE') return 'workout'
  if (type === 'GAME') return 'game'
  if (type === 'FILM') return 'film'
  return 'event'
}

function datePart(stamp: string) {
  return stamp.slice(0, 10)
}

function timePart(stamp: string) {
  return stamp.slice(11, 16)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = createCalendarEventSchema.parse(await request.json())
    const actorId = session.actual_id || session.id
    let playerId = session.role === 'player' ? session.id : data.player_id

    if (session.role === 'trainer' && !playerId) {
      return Response.json({ error: 'Choose a player before adding this to the calendar.' }, { status: 400 })
    }

    if (!playerId) playerId = session.id

    const player = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'player'").get(playerId)
    if (!player) return Response.json({ error: 'Player not found.' }, { status: 404 })
    if (!canAccessPlayer(session, playerId)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const scheduledDate = datePart(data.startsAt)
    const startTime = timePart(data.startsAt)
    const endTime = data.endsAt ? timePart(data.endsAt) : null
    const itemType = scheduleType(data.type)
    const notes = [data.notes, data.location ? `Location: ${data.location}` : null, data.opponent ? `Opponent: ${data.opponent}` : null]
      .filter(Boolean)
      .join('\n')

    const result = db.prepare(
      `INSERT INTO schedule
        (player_id, workout_id, scheduled_date, item_type, item_id, title, notes, start_time, end_time)
       VALUES (?, NULL, ?, ?, NULL, ?, ?, ?, ?)`
    ).run(playerId, scheduledDate, itemType, data.title, notes || null, startTime, endTime)

    if (playerId !== actorId) {
      await notifyScheduleAssignment({
        playerId,
        actorId,
        itemType,
        title: data.title,
        date: scheduledDate,
        startTime,
      })
    }

    return Response.json({ id: result.lastInsertRowid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message || 'Invalid calendar event.' }, { status: 400 })
    }
    console.error('Calendar create error:', err)
    return Response.json({ error: 'Failed to create calendar event.' }, { status: 500 })
  }
}
