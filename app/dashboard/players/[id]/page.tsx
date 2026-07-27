import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Flame,
  GraduationCap,
  Landmark,
  NotebookPen,
  SquarePlay,
  UserRound,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  EmptyState,
  GhostButton,
  JerseyAvatar,
  Pill,
  SectionTitle,
  ViewAllLink,
} from '@/components/ht/primitives'
import ProfileTabs from './profile-tabs'
import OverallGrade from './overall-grade'
import ClipRow, { type ClipRowData } from './clip-row'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 013-coach-player-profile-review-raw.png */

interface Player {
  id: number
  name: string
  email: string
  jersey_number: number | null
  position: string | null
  position_abbr: string | null
  grade_level: string | null
  school: string | null
  avatar_path: string | null
}

/** users.position_abbr holds the standard code ("SG"); the design spells it out. */
const POSITION_NAME: Record<string, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
}

type ScheduleRow = {
  id: number
  scheduled_date: string
  title: string | null
  item_type: string
}

function fmtDate(iso: string) {
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const playerId = parseInt(id)
  // Trainers can view any player. Players can only view themselves (their own library).
  const isSelfView = session.role === 'player' && session.id === playerId
  if (session.role !== 'trainer' && !isSelfView) redirect('/player/progress')

  const player = db.prepare(`
    SELECT id, name, email, jersey_number, position, position_abbr, grade_level, school, avatar_path
    FROM users WHERE id = ? AND role = 'player'
  `).get(id) as Player | undefined
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

  const upcoming = db.prepare(`
    SELECT id, scheduled_date, title, item_type FROM schedule
    WHERE player_id = ? AND completed = 0 AND scheduled_date >= ?
    ORDER BY scheduled_date ASC LIMIT 10
  `).all(player.id, today) as ScheduleRow[]

  const overdue = db.prepare(`
    SELECT id, scheduled_date, title, item_type FROM schedule
    WHERE player_id = ? AND completed = 0 AND scheduled_date < ?
    ORDER BY scheduled_date DESC LIMIT 10
  `).all(player.id, today) as ScheduleRow[]

  const hours = Math.round(((totals.recent_seconds || 0) / 3600) * 10) / 10

  // Month-to-date figures behind the four hero counters.
  const monthSeconds = (db.prepare(`
    SELECT COALESCE(SUM(duration_seconds), 0) AS seconds FROM recordings
    WHERE player_id = ? AND parent_recording_id IS NULL AND recorded_at >= datetime('now','start of month')
  `).get(player.id) as { seconds: number }).seconds
  const completedThisMonth = (db.prepare(`
    SELECT COUNT(*) AS count FROM schedule
    WHERE player_id = ? AND completed = 1 AND completed_at >= datetime('now','start of month')
  `).get(player.id) as { count: number }).count

  const recordingDays = db.prepare(
    'SELECT DISTINCT substr(recorded_at, 1, 10) AS d FROM recordings WHERE player_id = ? ORDER BY d DESC LIMIT 60'
  ).all(player.id) as Array<{ d: string }>
  let streak = 0
  if (recordingDays.length > 0) {
    const has = new Set(recordingDays.map((x) => x.d))
    const cursor = new Date()
    if (!has.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1)
    while (has.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
  }

  // A clip counts as reviewed once a trainer has left feedback on it. That
  // feedback is stored as a message against the recording (see EntityChat).
  const reviewedIds = new Set(
    (db.prepare(`
      SELECT DISTINCT m.context_id AS recording_id
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.context_type = 'recording' AND u.role = 'trainer'
    `).all() as Array<{ recording_id: number }>).map((r) => r.recording_id),
  )

  const clips = db.prepare(`
    SELECT r.id, r.title, r.recorded_at, r.duration_seconds, r.video_path,
           d.name AS drill_name, d.category
    FROM recordings r
    LEFT JOIN drills d ON d.id = r.drill_id
    WHERE r.player_id = ? AND r.parent_recording_id IS NULL
    ORDER BY r.recorded_at DESC LIMIT 30
  `).all(player.id) as ClipRowData[]

  const notes = db.prepare(`
    SELECT r.id, r.title, r.notes, r.recorded_at, d.name AS drill_name
    FROM recordings r
    LEFT JOIN drills d ON d.id = r.drill_id
    WHERE r.player_id = ? AND r.notes IS NOT NULL AND TRIM(r.notes) <> ''
    ORDER BY r.recorded_at DESC LIMIT 20
  `).all(player.id) as Array<{
    id: number
    title: string | null
    notes: string
    recorded_at: string
    drill_name: string | null
  }>

  const base = isSelfView ? '/player' : '/coach'
  const suffix = isSelfView ? '' : `?playerId=${player.id}`
  // Film review is trainer-only, so a player reviewing their own library gets
  // rows without a destination rather than a link that would bounce them.
  const clipHref = isSelfView ? null : `/coach/activity?playerId=${player.id}`

  const counters: Array<{ icon: LucideIcon; label: string; value: string; caption: string }> = [
    {
      icon: Clock,
      label: 'Training Volume',
      value: String(Math.round((monthSeconds / 3600) * 10) / 10),
      caption: 'hrs this month',
    },
    { icon: Video, label: 'Recordings', value: String(totals.total_recordings || 0), caption: 'total' },
    { icon: CheckCircle2, label: 'Completed', value: String(completedThisMonth), caption: 'this month' },
    { icon: Flame, label: 'Current Streak', value: String(streak), caption: 'days' },
  ]

  const statsTab = (
    <>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Recent Recordings</SectionTitle>
        {clipHref ? (
          <Link
            href={clipHref}
            className="ht-heading flex shrink-0 items-center gap-1 text-[13px] tracking-[0.04em] text-ht-orange hover:underline"
          >
            View All
            <ChevronRight className="size-4" strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
      <Card padded={false} className="mt-3">
        {clips.length === 0 ? (
          <EmptyState
            icon={SquarePlay}
            title="No recordings yet"
            body="Clips appear here as soon as this player records a rep."
          />
        ) : (
          clips
            .slice(0, 3)
            .map((clip, index) => (
              <ClipRow
                key={clip.id}
                clip={clip}
                href={clipHref}
                reviewed={reviewedIds.has(clip.id)}
                last={index === Math.min(clips.length, 3) - 1}
              />
            ))
        )}
      </Card>

      <Card padded={false} className="mt-4">
        <div className="px-5 pt-5">
          <SectionTitle>Last 7 Days</SectionTitle>
        </div>
        <div className="grid grid-cols-3 px-5 pb-5">
          {[
            { label: 'Clips', value: totals.recent_recordings || 0 },
            { label: 'Hours', value: hours },
            { label: 'Open Items', value: upcoming.length + overdue.length },
          ].map((item, index) => (
            <div key={item.label} className={index > 0 ? 'border-l border-ht-line-soft pl-4' : 'pr-4'}>
              <div className="mt-4 text-[12.5px] leading-4 text-ht-muted">{item.label}</div>
              <div className="ht-num mt-2 text-[30px] leading-none text-ht-ink">{item.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )

  const clipsTab = (
    <Card padded={false}>
      {clips.length === 0 ? (
        <EmptyState
          icon={SquarePlay}
          title="No clips yet"
          body="Recordings uploaded from the capture screen show up here."
        />
      ) : (
        <>
          {clips.map((clip, index) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              href={clipHref}
              reviewed={reviewedIds.has(clip.id)}
              last={index === clips.length - 1}
            />
          ))}
          {clipHref ? <ViewAllLink href={clipHref}>Open Film Review</ViewAllLink> : null}
        </>
      )}
    </Card>
  )

  const assignmentsTab = (
    <>
      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <SectionTitle>Overdue</SectionTitle>
          {overdue.length > 0 ? <Pill tone="orange">{overdue.length}</Pill> : null}
        </div>
        {overdue.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing overdue" />
        ) : (
          <div className="mt-3">
            {overdue.map((item, index) => (
              <ScheduleLine
                key={item.id}
                icon={AlertCircle}
                title={item.title || item.item_type}
                meta={`due ${item.scheduled_date}`}
                alert
                last={index === overdue.length - 1}
              />
            ))}
          </div>
        )}
      </Card>

      <Card padded={false} className="mt-4">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <SectionTitle>Upcoming</SectionTitle>
          {upcoming.length > 0 ? <Pill>{upcoming.length}</Pill> : null}
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nothing scheduled" />
        ) : (
          <div className="mt-3">
            {upcoming.map((item, index) => (
              <ScheduleLine
                key={item.id}
                icon={CalendarDays}
                title={item.title || item.item_type}
                meta={item.scheduled_date}
                last={index === upcoming.length - 1}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  )

  const notesTab = (
    <Card padded={false}>
      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          body="Notes saved against a recording show up here."
        />
      ) : (
        notes.map((note, index) => (
          <div
            key={note.id}
            className={index === notes.length - 1 ? 'px-5 py-4' : 'border-b border-ht-line-soft px-5 py-4'}
          >
            <p className="ht-heading text-[15px] text-ht-ink">
              {note.title || note.drill_name || 'Recording'}
            </p>
            <p className="mt-1 text-[13px] text-ht-muted">{fmtDate(note.recorded_at)}</p>
            <p className="mt-2 text-[14px] leading-6 text-ht-ink">{note.notes}</p>
          </div>
        ))
      )}
    </Card>
  )

  return (
    <div className="pt-2 lg:max-w-4xl">
      {!isSelfView ? (
        <Link
          href="/coach/players"
          aria-label="Back to roster"
          className="inline-flex text-ht-ink transition-colors hover:text-ht-orange"
        >
          <ArrowLeft className="size-6" strokeWidth={2.2} />
        </Link>
      ) : null}

      <div className="mt-3 flex items-start gap-3.5">
        {/* The placeholder avatar carries the jersey number the design shows. */}
        <JerseyAvatar
          name={player.name}
          jerseyNumber={player.jersey_number}
          src={player.avatar_path}
          size={72}
        />

        <div className="min-w-0 flex-1">
          {/* Upright: 013 slants the wordmark above it but sets the player's
              name bolt upright, like every other non-title heading. */}
          <h1 className="ht-heading text-[30px] leading-[1.05] text-ht-ink lg:text-[42px]">
            {isSelfView ? 'My Library' : player.name}
          </h1>
          {/* No separator between the two: the pair only fits on one line at
              desktop width, and a wrapped "|" would dangle at a line end. */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ht-ink">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-4 shrink-0 text-ht-ink" strokeWidth={1.8} />
              {player.grade_level ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4 shrink-0 text-ht-ink" strokeWidth={1.8} />
              {(player.position_abbr && POSITION_NAME[player.position_abbr]) ??
                player.position ??
                '—'}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ht-ink">
            <Landmark className="size-4 shrink-0 text-ht-ink" strokeWidth={1.8} />
            <span className="truncate">{player.school ?? '—'}</span>
          </p>
        </div>

        <OverallGrade playerId={player.id} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2.5 lg:gap-4">
        {counters.map(({ icon: Icon, label, value, caption }) => (
          <Card key={label} padded={false} className="px-1 py-3.5 text-center">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-ht-orange-tint">
              <Icon className="size-5 text-ht-orange" strokeWidth={1.8} />
            </span>
            <div className="ht-heading mt-2.5 text-[11px] leading-tight tracking-[0.03em] text-ht-ink">
              {label}
            </div>
            <div className="ht-num mt-1.5 text-[32px] leading-none text-ht-ink lg:text-[38px]">
              {value}
            </div>
            {/* "hrs this month" sits on one line in 013; at 10px in a quarter
                of a 390pt screen it wrapped. */}
            <div className="mt-1.5 text-[9.5px] leading-tight whitespace-nowrap text-ht-muted lg:text-[12px]">
              {caption}
            </div>
          </Card>
        ))}
      </div>

      <ProfileTabs
        tabs={[
          { key: 'stats', label: 'Stats', content: statsTab },
          { key: 'clips', label: 'Clips', content: clipsTab },
          { key: 'assignments', label: 'Assignments', content: assignmentsTab },
          { key: 'notes', label: 'Notes', content: notesTab },
        ]}
      />

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {isSelfView ? (
          <GhostButton href="/player/calendar" className="flex-col gap-1.5 px-2 py-3.5 text-[12px]">
            <ClipboardList className="size-6" strokeWidth={1.7} />
            My Plan
          </GhostButton>
        ) : (
          <GhostButton
            href={`/coach/calendar?playerId=${player.id}&assign=workout`}
            className="flex-col gap-1.5 px-2 py-3.5 text-[12px]"
          >
            <Dumbbell className="size-6" strokeWidth={1.7} />
            Assign Workout
          </GhostButton>
        )}
        <GhostButton
          href={isSelfView ? '/player/capture' : `/coach/activity?playerId=${player.id}`}
          className="flex-col gap-1.5 px-2 py-3.5 text-[12px]"
        >
          <SquarePlay className="size-6" strokeWidth={1.7} />
          Review Clips
        </GhostButton>
        <GhostButton
          href={`${base}/progress${suffix}`}
          className="flex-col gap-1.5 px-2 py-3.5 text-[12px]"
        >
          <BarChart3 className="size-6" strokeWidth={1.7} />
          View Progress
        </GhostButton>
      </div>
    </div>
  )
}

function ScheduleLine({
  icon: Icon,
  title,
  meta,
  alert = false,
  last,
}: {
  icon: LucideIcon
  title: string
  meta: string
  alert?: boolean
  last: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5${last ? ' pb-5' : ' border-b border-ht-line-soft'}`}
    >
      <Icon
        className={`size-5 shrink-0 ${alert ? 'text-ht-orange' : 'text-ht-muted'}`}
        strokeWidth={1.8}
      />
      <span className="min-w-0 flex-1 truncate text-[15px] text-ht-ink">{title}</span>
      <span className="shrink-0 text-[13px] text-ht-muted">{meta}</span>
    </div>
  )
}
