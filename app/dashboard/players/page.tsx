import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Award, Flame, Video, AlertCircle, ChevronRight } from 'lucide-react'

interface PlayerRow {
  id: number
  name: string
  email: string
  last_recording_at: string | null
  total_recordings: number
  recordings_last_7d: number
  hours_last_7d: number
  current_streak_days: number
  last_quiz_score: number | null
  last_quiz_at: string | null
  upcoming_count: number
  overdue_count: number
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

async function loadPlayers(): Promise<PlayerRow[]> {
  // Reuse the same logic as /api/players?activity=true but inline so this stays SSR.
  const players = db.prepare(
    "SELECT id, name, email FROM users WHERE role = 'player' ORDER BY name"
  ).all() as Array<{ id: number; name: string; email: string }>

  const today = new Date().toISOString().slice(0, 10)
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const rows: PlayerRow[] = players.map((p) => {
    const recAgg = db.prepare(`
      SELECT
        MAX(recorded_at) AS last_recording_at,
        COUNT(*) AS total_recordings,
        SUM(CASE WHEN substr(recorded_at, 1, 10) >= ? THEN 1 ELSE 0 END) AS recordings_last_7d,
        SUM(CASE WHEN substr(recorded_at, 1, 10) >= ? THEN duration_seconds ELSE 0 END) AS seconds_last_7d
      FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL
    `).get(sevenAgo, sevenAgo, p.id) as {
      last_recording_at: string | null
      total_recordings: number
      recordings_last_7d: number
      seconds_last_7d: number | null
    }
    const quiz = db.prepare(
      'SELECT score, completed_at FROM quiz_attempts WHERE player_id = ? ORDER BY completed_at DESC LIMIT 1'
    ).get(p.id) as { score: number; completed_at: string } | undefined
    const upcoming = (db.prepare(
      'SELECT COUNT(*) as c FROM schedule WHERE player_id = ? AND completed = 0 AND scheduled_date >= ?'
    ).get(p.id, today) as { c: number }).c
    const overdue = (db.prepare(
      'SELECT COUNT(*) as c FROM schedule WHERE player_id = ? AND completed = 0 AND scheduled_date < ?'
    ).get(p.id, today) as { c: number }).c

    const days = db.prepare(
      'SELECT DISTINCT substr(recorded_at, 1, 10) AS d FROM recordings WHERE player_id = ? ORDER BY d DESC LIMIT 60'
    ).all(p.id) as Array<{ d: string }>
    let streak = 0
    if (days.length > 0) {
      const has = new Set(days.map((x) => x.d))
      const cursor = new Date()
      if (!has.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1)
      while (has.has(cursor.toISOString().slice(0, 10))) {
        streak++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      }
    }

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      last_recording_at: recAgg.last_recording_at,
      total_recordings: recAgg.total_recordings || 0,
      recordings_last_7d: recAgg.recordings_last_7d || 0,
      hours_last_7d: Math.round(((recAgg.seconds_last_7d || 0) / 3600) * 10) / 10,
      current_streak_days: streak,
      last_quiz_score: quiz?.score ?? null,
      last_quiz_at: quiz?.completed_at ?? null,
      upcoming_count: upcoming,
      overdue_count: overdue,
    }
  })

  rows.sort((a, b) => (b.last_recording_at || '').localeCompare(a.last_recording_at || ''))
  return rows
}

export default async function PlayersRosterPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'trainer') redirect('/player/progress')

  const players = await loadPlayers()

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-1">Players</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {players.length} {players.length === 1 ? 'player' : 'players'} · sorted by recent activity
      </p>

      {players.length === 0 && (
        <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-6 text-center text-muted-foreground">
          No players yet.
        </div>
      )}

      <div className="grid gap-3">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/players/${p.id}`}
            className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4 flex items-center gap-4 hover:shadow-[5px_5px_0px_0px_#0A0A0A] transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-hoop-orange text-white flex items-center justify-center font-bold text-lg shrink-0">
              {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{p.name}</h3>
                {p.overdue_count > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 border-2 border-red-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {p.overdue_count} overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                <span className="flex items-center gap-1" title="Last recording">
                  <Video className="h-3 w-3" /> {timeAgo(p.last_recording_at)}
                </span>
                <span className="flex items-center gap-1" title="Recordings in last 7 days">
                  · {p.recordings_last_7d} this week
                </span>
                <span className="flex items-center gap-1" title="Hours practiced (7d)">
                  · {p.hours_last_7d}h
                </span>
                {p.current_streak_days > 0 && (
                  <span className="flex items-center gap-1 text-orange-600" title="Current streak">
                    <Flame className="h-3 w-3" /> {p.current_streak_days}d streak
                  </span>
                )}
                {p.last_quiz_score != null && (
                  <span className="flex items-center gap-1" title="Last quiz score">
                    <Award className="h-3 w-3" /> {p.last_quiz_score}%
                  </span>
                )}
                {p.upcoming_count > 0 && (
                  <span className="text-muted-foreground">· {p.upcoming_count} upcoming</span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
