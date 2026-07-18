import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { ArrowLeft, Video, Award, CalendarCheck, AlertCircle, Plus } from 'lucide-react'
import PlayerActivityFeed from '@/components/player-activity-feed'

interface Player {
  id: number
  name: string
  email: string
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const playerId = parseInt(id)
  // Trainers can view any player. Players can only view themselves (their own library).
  const isSelfView = session.role === 'player' && session.id === playerId
  if (session.role !== 'trainer' && !isSelfView) redirect('/player/progress')

  const player = db.prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'player'").get(id) as
    | Player
    | undefined
  if (!player) notFound()

  // Server component — Date.now() is stable per request, not a render-loop hazard.
  const today = new Date().toISOString().slice(0, 10)
  // eslint-disable-next-line react-hooks/purity -- server component, one Date.now() per request
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const totals = db.prepare(`
    SELECT COUNT(*) as total_recordings,
           SUM(CASE WHEN substr(recorded_at, 1, 10) >= ? THEN 1 ELSE 0 END) as recent_recordings,
           SUM(CASE WHEN substr(recorded_at, 1, 10) >= ? THEN duration_seconds ELSE 0 END) as recent_seconds
    FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL
  `).get(sevenAgo, sevenAgo, player.id) as {
    total_recordings: number
    recent_recordings: number
    recent_seconds: number | null
  }

  const lastQuiz = db.prepare(
    'SELECT score, completed_at FROM quiz_attempts WHERE player_id = ? ORDER BY completed_at DESC LIMIT 1'
  ).get(player.id) as { score: number; completed_at: string } | undefined

  const upcoming = db.prepare(`
    SELECT id, scheduled_date, title, item_type FROM schedule
    WHERE player_id = ? AND completed = 0 AND scheduled_date >= ?
    ORDER BY scheduled_date ASC LIMIT 10
  `).all(player.id, today) as Array<{ id: number; scheduled_date: string; title: string | null; item_type: string }>

  const overdue = db.prepare(`
    SELECT id, scheduled_date, title, item_type FROM schedule
    WHERE player_id = ? AND completed = 0 AND scheduled_date < ?
    ORDER BY scheduled_date DESC LIMIT 10
  `).all(player.id, today) as Array<{ id: number; scheduled_date: string; title: string | null; item_type: string }>

  const hours = Math.round(((totals.recent_seconds || 0) / 3600) * 10) / 10

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {!isSelfView && (
        <Link
          href="/dashboard/players"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Players
        </Link>
      )}

      <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-hoop-orange text-white flex items-center justify-center text-2xl font-bold">
            {player.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-russo)] text-2xl">
              {isSelfView ? 'My Library' : player.name}
            </h2>
            <p className="text-sm text-muted-foreground">{isSelfView ? player.name : player.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="border-2 border-black rounded-lg p-3 text-center">
            <Video className="h-5 w-5 mx-auto mb-1" />
            <div className="font-bold text-xl">{totals.total_recordings || 0}</div>
            <div className="text-xs text-muted-foreground">total recordings</div>
          </div>
          <div className="border-2 border-black rounded-lg p-3 text-center">
            <div className="font-bold text-xl">{totals.recent_recordings || 0}</div>
            <div className="text-xs text-muted-foreground">last 7 days</div>
          </div>
          <div className="border-2 border-black rounded-lg p-3 text-center">
            <div className="font-bold text-xl">{hours}h</div>
            <div className="text-xs text-muted-foreground">practice time (7d)</div>
          </div>
          <div className="border-2 border-black rounded-lg p-3 text-center">
            <Award className="h-5 w-5 mx-auto mb-1" />
            <div className="font-bold text-xl">{lastQuiz ? `${lastQuiz.score}%` : '–'}</div>
            <div className="text-xs text-muted-foreground">last quiz</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Link
            href={isSelfView ? '/dashboard/progress' : `/dashboard/progress?playerId=${player.id}`}
            className="flex items-center gap-1 bg-hoop-black text-white px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            <Award className="h-4 w-4" /> Progress report
          </Link>
          <Link
            href={isSelfView ? '/dashboard/calendar' : `/dashboard/calendar?playerId=${player.id}`}
            className="flex items-center gap-1 bg-white border-2 border-black px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <CalendarCheck className="h-4 w-4" /> Calendar
          </Link>
          <Link
            href={isSelfView ? '/dashboard/comparison' : `/dashboard/comparison?playerId=${player.id}`}
            className="flex items-center gap-1 bg-white border-2 border-black px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <Video className="h-4 w-4" /> Compare recordings
          </Link>
          <Link
            href="/dashboard/workouts"
            className="flex items-center gap-1 bg-white border-2 border-black px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <Video className="h-4 w-4" /> Workouts
          </Link>
          <Link
            href="/dashboard/moves"
            className="flex items-center gap-1 bg-white border-2 border-black px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            <Video className="h-4 w-4" /> Moves
          </Link>
          {!isSelfView && (
            <Link
              href={`/dashboard/calendar?playerId=${player.id}&assign=workout`}
              className="flex items-center gap-1 bg-hoop-orange text-white px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Assign work
            </Link>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-white border-2 border-red-700 rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4 mb-6">
          <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Overdue ({overdue.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {overdue.map((o) => (
              <li key={o.id} className="flex items-center justify-between border-t-2 border-red-100 pt-1 first:border-t-0 first:pt-0">
                <span>{o.title || o.item_type}</span>
                <span className="text-xs text-muted-foreground">due {o.scheduled_date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4 mb-6">
          <h3 className="font-bold mb-2">Upcoming ({upcoming.length})</h3>
          <ul className="space-y-1 text-sm">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center justify-between border-t-2 border-gray-100 pt-1 first:border-t-0 first:pt-0">
                <span>{u.title || u.item_type}</span>
                <span className="text-xs text-muted-foreground">{u.scheduled_date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="font-[family-name:var(--font-russo)] text-lg mb-3">
        {isSelfView ? 'My recordings & activity' : 'Activity'}
      </h3>
      <PlayerActivityFeed playerId={player.id} />
    </div>
  )
}
