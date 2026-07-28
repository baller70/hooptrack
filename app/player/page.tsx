import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Camera,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  SquareDot,
  SquarePlay,
  UserRound,
} from 'lucide-react'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  NavRow,
  SectionTitle,
  StatStrip,
  type Stat,
} from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/web-desktop/
 * 001-player-web-dashboard-raw.png at lg+, and ios/001-player-home-raw.png
 * below it. The phone screen is deliberately shorter: stat card, one
 * horizontal Start Capture bar, Quick Access — nothing else. */

type CountRow = { count: number }

function count(sql: string, ...params: Array<string | number>) {
  return (db.prepare(sql).get(...params) as CountRow | undefined)?.count ?? 0
}

type PlanRow = {
  id: number
  scheduled_date: string
  completed: number
  title: string | null
  workout_title: string | null
  duration_seconds: number | null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Percentage change against the previous window, rounded for display. */
function delta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export default async function PlayerHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'player') redirect('/coach')

  const pendingRequests = count(
    "SELECT COUNT(*) as count FROM coach_group_invites WHERE player_id = ? AND status = 'pending'",
    session.id,
  )
  const upcoming = count(
    `SELECT COUNT(*) as count FROM schedule
     WHERE player_id = ? AND completed = 0
       AND scheduled_date >= date('now') AND scheduled_date < date('now', '+7 days')`,
    session.id,
  )
  const overdue = count(
    "SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 0 AND scheduled_date < date('now')",
    session.id,
  )
  const completed = count(
    'SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 1',
    session.id,
  )
  const recordings = count(
    'SELECT COUNT(*) as count FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL',
    session.id,
  )

  const stats: Stat[] = [
    { label: 'Requests', value: pendingRequests, caption: 'Pending' },
    { label: 'Upcoming', value: upcoming, caption: 'This Week' },
    { label: 'Overdue', value: overdue, caption: 'Workouts', alert: overdue > 0 },
    { label: 'Completed', value: completed, caption: 'All Time' },
    { label: 'Recordings', value: recordings, caption: 'Total Clips' },
  ]

  // This week's plan, Monday-anchored to match the design's Mon→Sun ordering.
  const plan = db
    .prepare(
      `SELECT s.id, s.scheduled_date, s.completed, s.title, w.title AS workout_title, w.duration_seconds
       FROM schedule s
       LEFT JOIN workouts w ON w.id = s.workout_id
       WHERE s.player_id = ?
         AND s.scheduled_date >= date('now', 'weekday 1', '-7 days')
         AND s.scheduled_date <  date('now', 'weekday 1')
       ORDER BY s.scheduled_date, s.id
       LIMIT 6`,
    )
    .all(session.id) as PlanRow[]

  const firstOpen = plan.find((row) => !row.completed)?.id

  // Progress snapshot — this month against the previous month.
  const clipsThisMonth = count(
    "SELECT COUNT(*) as count FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL AND recorded_at >= datetime('now','start of month')",
    session.id,
  )
  const clipsPrevMonth = count(
    `SELECT COUNT(*) as count FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL
      AND recorded_at >= datetime('now','start of month','-1 month')
      AND recorded_at <  datetime('now','start of month')`,
    session.id,
  )
  const doneThisMonth = count(
    "SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 1 AND completed_at >= datetime('now','start of month')",
    session.id,
  )
  const donePrevMonth = count(
    `SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 1
      AND completed_at >= datetime('now','start of month','-1 month')
      AND completed_at <  datetime('now','start of month')`,
    session.id,
  )
  const secondsRow = db
    .prepare(
      "SELECT COALESCE(SUM(duration_seconds),0) AS count FROM recordings WHERE player_id = ? AND recorded_at >= datetime('now','start of month')",
    )
    .get(session.id) as CountRow
  const prevSecondsRow = db
    .prepare(
      `SELECT COALESCE(SUM(duration_seconds),0) AS count FROM recordings WHERE player_id = ?
        AND recorded_at >= datetime('now','start of month','-1 month')
        AND recorded_at <  datetime('now','start of month')`,
    )
    .get(session.id) as CountRow

  const snapshot = [
    { label: 'Clips Recorded', value: clipsThisMonth, change: delta(clipsThisMonth, clipsPrevMonth) },
    { label: 'Workouts Completed', value: doneThisMonth, change: delta(doneThisMonth, donePrevMonth) },
    {
      label: 'Minutes Trained',
      value: Math.round(secondsRow.count / 60),
      change: delta(secondsRow.count, prevSecondsRow.count),
    },
  ]

  return (
    <div className="pt-2">
      <StatStrip stats={stats} />

      {/* Phones get the design's short horizontal bar; the tall hero below is
          the desktop treatment. */}
      <Link
        href="/player/capture"
        className="mt-5 flex h-[65px] items-center justify-center gap-6 rounded-lg bg-ht-orange transition-colors hover:bg-ht-orange-hover lg:hidden"
      >
        <Camera className="size-12 shrink-0 text-white" strokeWidth={1.2} />
        <span className="ht-display text-[32px] leading-none text-white">Start Capture</span>
      </Link>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)_minmax(0,1.16fr)]">
        {/* Start Capture — the single orange call to action on the screen. */}
        <Link
          href="/player/capture"
          className="hidden flex-col items-center justify-center gap-4 rounded-xl bg-ht-orange px-8 py-16 text-center transition-colors hover:bg-ht-orange-hover lg:flex"
        >
          <Camera className="size-32 text-white" strokeWidth={1.3} />
          {/* The hero is one of the three places the pack slants type — the
              wordmark, the page titles and this. Stays on one line, as the
              design does. */}
          <span className="ht-display whitespace-nowrap text-[50px] leading-none text-white">
            Start Capture
          </span>
          <span className="max-w-[250px] text-[19px] leading-[1.45] text-white/90">
            Record and upload clips to track your progress.
          </span>
        </Link>

        <div className="flex flex-col">
          {/* On the phone the heading sits above the card, not inside it. */}
          <SectionTitle className="mb-2.5 lg:hidden">Quick Access</SectionTitle>
          <Card padded={false} className="lg:flex-1 lg:p-4">
            <SectionTitle className="hidden lg:block">Quick Access</SectionTitle>
            {/* Desktop draws the rows inside their own bordered box; the phone
                card is that box already. */}
            <div className="lg:mt-6 lg:overflow-hidden lg:rounded-xl lg:border lg:border-ht-line">
              <NavRow icon={UserRound} label="Team Requests" href="/player/requests" count={pendingRequests} />
              <NavRow icon={SquareDot} label="Assigned Workouts" href="/player/workouts" count={upcoming} />
              <NavRow icon={ChartNoAxesColumnIncreasing} label="Training Plan" href="/player/calendar" />
              <NavRow icon={SquarePlay} label="Move Library" href="/player/moves" />
              <NavRow icon={ChartNoAxesCombined} label="Progress Report" href="/player/progress" last />
            </div>
          </Card>
        </div>

        <div className="hidden flex-col gap-5 lg:flex">
          <Card padded={false}>
            <div className="px-6 pt-5">
              <SectionTitle>Training Plan</SectionTitle>
              <p className="mt-1 text-[18px] text-ht-muted">This Week</p>
            </div>
            <div className="mt-4 space-y-3.5 px-6">
              {plan.length === 0 ? (
                <p className="pb-2 text-[18px] text-ht-muted">Nothing scheduled this week.</p>
              ) : (
                plan.map((row) => {
                  const day = DAY_LABELS[new Date(`${row.scheduled_date}T00:00:00`).getDay()]
                  const isNext = row.id === firstOpen
                  return (
                    <div key={row.id} className="flex items-center gap-4">
                      <span className="w-10 shrink-0 text-[19px] font-medium text-ht-ink">{day}</span>
                      {row.completed ? (
                        <CheckCircle2 className="size-6 shrink-0 fill-ht-orange text-white" strokeWidth={2} />
                      ) : isNext ? (
                        <span className="size-6 shrink-0 rounded-full border-2 border-ht-orange" />
                      ) : (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ht-ring">
                          <span className="h-0.5 w-2.5 rounded bg-white" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-[19px] text-ht-ink">
                        {row.title || row.workout_title || 'Training'}
                      </span>
                      <span className="shrink-0 text-[18px] text-ht-muted">
                        {row.duration_seconds ? `${Math.round(row.duration_seconds / 60)} min` : '—'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-5 px-6 pb-6">
              <RailLink href="/player/calendar">View Full Plan</RailLink>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-6 pt-5">
              <CardHeader
                title="Progress Snapshot"
                action={
                  <span className="flex items-center gap-1.5 text-[18px] text-ht-muted">
                    This Month
                    <ChevronDown className="size-5" strokeWidth={2} />
                  </span>
                }
              />
            </div>
            <div className="mt-5 grid grid-cols-3 px-6">
              {snapshot.map((item, index) => (
                <div
                  key={item.label}
                  className={cn(
                    'min-w-0 px-1.5 text-center',
                    index > 0 && 'border-l border-ht-line-soft',
                  )}
                >
                  {/* 12px, not 12.5: "Workouts Completed" is the widest label
                      in the pack and it sits on one line there, so it must not
                      ellipsis here either. */}
                  <div className="text-[12px] leading-5 whitespace-nowrap text-ht-muted">
                    {item.label}
                  </div>
                  {/* The pack sets these counters upright, not in the italic
                      display face. */}
                  <div className="ht-num mt-2.5 text-[44px] leading-none text-ht-ink">
                    {item.value}
                  </div>
                  <div
                    className={`mt-2 text-[17px] font-semibold ${
                      item.change >= 0 ? 'text-ht-green' : 'text-ht-red'
                    }`}
                  >
                    {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 px-6 pb-6">
              <RailLink href="/player/progress">View Progress Report</RailLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * The grey footer button closing each right-rail card. The pack sets these in
 * sentence case and the body face, not the condensed heading face.
 */
function RailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-3 rounded-lg bg-ht-chip py-3.5 text-[18px] font-medium text-ht-orange transition-colors hover:bg-ht-orange-tint"
    >
      {children}
      <ChevronRight className="size-[18px]" strokeWidth={2.5} />
    </Link>
  )
}
