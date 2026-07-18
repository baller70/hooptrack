import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, CalendarDays, ClipboardList, Clock, Dumbbell, Trophy, Upload, UserPlus, Users, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

type CountRow = { count: number }

function count(sql: string, ...params: Array<string | number>) {
  return (db.prepare(sql).get(...params) as CountRow | undefined)?.count ?? 0
}

export default async function CoachHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if ((session.actual_role || session.role) !== 'trainer') redirect('/player')

  const players = count("SELECT COUNT(*) as count FROM users WHERE role = 'player'")
  const groups = count('SELECT COUNT(*) as count FROM coach_groups WHERE coach_id = ? AND archived_at IS NULL', session.actual_id || session.id)
  const overdue = count("SELECT COUNT(*) as count FROM schedule WHERE completed = 0 AND scheduled_date < date('now')")
  const upcoming = count("SELECT COUNT(*) as count FROM schedule WHERE completed = 0 AND scheduled_date >= date('now')")
  const recentVideo = count(
    "SELECT COUNT(*) as count FROM recordings WHERE parent_recording_id IS NULL AND recorded_at >= datetime('now', '-7 days')",
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <section className="rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A]">
        <div className="grid gap-5 border-b-2 border-black bg-[linear-gradient(135deg,#0A0A0A_0%,#1f2937_58%,#f97316_145%)] p-5 text-white lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <h1 className="font-[family-name:var(--font-russo)] text-4xl leading-none">
              HoopTrack Coach
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Assign training, monitor player activity, review clips, and keep the roster moving from one coach app.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <CoachButton href="/coach/players" icon={Users} label="Roster" />
            <CoachButton href="/coach/teams" icon={UserPlus} label="Teams" />
            <CoachButton href="/coach/activity" icon={Activity} label="Live Activity" />
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric icon={Users} label="Players" value={players} />
          <Metric icon={UserPlus} label="Groups" value={groups} />
          <Metric icon={Clock} label="Overdue" value={overdue} />
          <Metric icon={CalendarDays} label="Upcoming" value={upcoming} />
          <Metric icon={Video} label="7-day clips" value={recentVideo} />
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <ActionCard
          href="/coach/teams"
          icon={UserPlus}
          title="Teams And Sessions"
          body="Create a team or one-on-one training group, then send player join requests."
        />
        <ActionCard
          href="/coach/players"
          icon={Users}
          title="Roster Command"
          body="Open player profiles, view progress, and jump into each athlete's library."
        />
        <ActionCard
          href="/coach/workouts"
          icon={Dumbbell}
          title="Build And Assign"
          body="Create workouts, moves, classroom checks, and schedule them for players."
        />
        <ActionCard
          href="/coach/moves/upload"
          icon={Upload}
          title="Upload Teaching Film"
          body="Add player clips or reference videos so the library is ready for review."
        />
        <ActionCard
          href="/coach/progress"
          icon={Trophy}
          title="Team Progress"
          body="Compare player output, review weak areas, and decide the next training focus."
        />
      </section>

      <section className="mt-5 rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#0A0A0A]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-russo)] text-2xl leading-none">Shared Backend</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Player recordings, assignments, quiz results, messages, and progress all land in the same system the coach app reads.
            </p>
          </div>
          <Link
            href="/coach/activity"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-black bg-white px-4 text-sm font-bold shadow-[2px_2px_0px_0px_#0A0A0A] hover:bg-orange-50"
          >
            <ClipboardList className="h-4 w-4 text-hoop-orange" />
            Review Feed
          </Link>
        </div>
      </section>
    </main>
  )
}

function CoachButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-white bg-white px-4 text-sm font-black text-hoop-black shadow-[2px_2px_0px_0px_#F97316] hover:bg-orange-50"
    >
      <Icon className="h-4 w-4 text-hoop-orange" />
      {label}
    </Link>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number
}) {
  return (
    <div className="rounded-md border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_#0A0A0A]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-hoop-orange" />
      </div>
      <p className="mt-2 font-[family-name:var(--font-russo)] text-3xl leading-none">{value}</p>
    </div>
  )
}

function ActionCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#0A0A0A] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-orange-50 hover:shadow-[1px_1px_0px_0px_#0A0A0A]"
    >
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-hoop-black text-hoop-orange">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-[family-name:var(--font-russo)] text-xl leading-none">{title}</span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">{body}</span>
        </span>
      </div>
    </Link>
  )
}
