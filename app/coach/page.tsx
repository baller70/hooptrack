import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, ChevronRight, CloudUpload, SquarePlay, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { Card, StatStrip, type Stat } from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/ios/003-coach-home-raw.png,
 * which is the coach app's landing screen (Roster tab). */

type CountRow = { count: number }

function count(sql: string, ...params: Array<string | number>) {
  return (db.prepare(sql).get(...params) as CountRow | undefined)?.count ?? 0
}

export default async function CoachHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if ((session.actual_role || session.role) !== 'trainer') redirect('/player')

  const coachId = session.actual_id || session.id

  const players = count("SELECT COUNT(*) as count FROM users WHERE role = 'player'")
  const groups = count(
    'SELECT COUNT(*) as count FROM coach_groups WHERE coach_id = ? AND archived_at IS NULL',
    coachId,
  )
  const overdue = count(
    "SELECT COUNT(*) as count FROM schedule WHERE completed = 0 AND scheduled_date < date('now')",
  )
  const upcoming = count(
    `SELECT COUNT(*) as count FROM schedule
     WHERE completed = 0 AND scheduled_date >= date('now') AND scheduled_date < date('now','+7 days')`,
  )
  const recentClips = count(
    `SELECT COUNT(*) as count FROM recordings
     WHERE parent_recording_id IS NULL AND recorded_at >= datetime('now','-7 days')`,
  )
  const pendingInvites = count(
    "SELECT COUNT(*) as count FROM coach_group_invites WHERE coach_id = ? AND status = 'pending'",
    coachId,
  )

  const stats: Stat[] = [
    { label: 'Players', value: players, caption: 'Total' },
    { label: 'Groups', value: groups, caption: 'Active' },
    { label: 'Overdue', value: overdue, caption: 'Workouts', alert: overdue > 0 },
    { label: 'Upcoming', value: upcoming, caption: 'This Week' },
    { label: '7-Day Clips', value: recentClips, caption: 'Recorded' },
  ]

  return (
    <div className="pt-2">
      {/* 003-coach-home draws all five counters across on a phone, unlike
          001-player-home which stacks 3+2. */}
      <StatStrip stats={stats} phoneColumns={5} />

      <Card padded={false} className="mt-5 overflow-hidden">
        <SectionRow
          icon={UserRound}
          title="Roster"
          description="Manage players"
          href="/coach/players"
        />
        <SectionRow
          icon={Users}
          title="Teams"
          description="Manage groups and sessions"
          href="/coach/teams"
          count={pendingInvites}
        />
        <SectionRow
          icon={Activity}
          title="Live Activity"
          description="See what is happening now"
          href="/coach/activity"
        />
        <SectionRow
          icon={SquarePlay}
          title="Review Feed"
          description="Clips ready for review"
          href="/coach/activity"
          last
        />
      </Card>

      <Card className="mt-5 flex items-start gap-5">
        <CloudUpload className="size-11 shrink-0 text-ht-orange" strokeWidth={1.4} />
        <div>
          <h2 className="ht-heading text-[20px] text-ht-ink">Shared Backend</h2>
          <p className="mt-1.5 max-w-xl text-[15px] leading-6 text-ht-muted">
            Player recordings, assignments, messages, and progress sync here.
          </p>
        </div>
      </Card>
    </div>
  )
}

function SectionRow({
  icon: Icon,
  title,
  description,
  href,
  count,
  last = false,
}: {
  icon: LucideIcon
  title: string
  description: string
  href: string
  count?: number
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-5 transition-colors hover:bg-ht-orange-tint/60 ${
        last ? '' : 'border-b border-ht-line-soft'
      }`}
    >
      <Icon className="size-9 shrink-0 text-ht-orange" strokeWidth={1.5} />
      <span className="min-w-0 flex-1">
        <span className="ht-heading block text-[21px] leading-tight text-ht-ink">{title}</span>
        {/* 17px, measured: "Manage groups and sessions" is 13.54css tall and
            142.6css wide in 003. It had been cut to 12px to stop it clipping
            against the old, too-wide body face — with Boxed the row holds the
            pack's size on one line. */}
        <span className="mt-1 block truncate text-[17px] text-ht-muted">{description}</span>
      </span>
      {count ? (
        <span className="ht-heading rounded-md bg-ht-orange px-2 py-0.5 text-[13px] text-white">
          {count}
        </span>
      ) : null}
      <ChevronRight className="size-6 shrink-0 text-ht-ink" strokeWidth={2} />
    </Link>
  )
}
