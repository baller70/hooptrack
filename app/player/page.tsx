import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award, CalendarDays, Camera, CheckCircle2, Clock, Dumbbell, UserPlus, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

type CountRow = { count: number }

function count(sql: string, ...params: Array<string | number>) {
  return (db.prepare(sql).get(...params) as CountRow | undefined)?.count ?? 0
}

export default async function PlayerHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'player') redirect('/coach')

  const upcoming = count(
    "SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 0 AND scheduled_date >= date('now')",
    session.id,
  )
  const overdue = count(
    "SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 0 AND scheduled_date < date('now')",
    session.id,
  )
  const completed = count('SELECT COUNT(*) as count FROM schedule WHERE player_id = ? AND completed = 1', session.id)
  const recordings = count('SELECT COUNT(*) as count FROM recordings WHERE player_id = ? AND parent_recording_id IS NULL', session.id)
  const pendingRequests = count(
    "SELECT COUNT(*) as count FROM coach_group_invites WHERE player_id = ? AND status = 'pending'",
    session.id,
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <section className="rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A]">
        <div className="grid gap-5 border-b-2 border-black bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#ecfeff_100%)] p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div>
            <h1 className="font-[family-name:var(--font-russo)] text-4xl leading-none text-hoop-black">
              HoopTrack Player
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Train, record, complete assigned work, and track your progress from one player-first app.
            </p>
          </div>
          <Link
            href="/player/capture"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-black bg-hoop-orange px-4 text-sm font-black text-white shadow-[2px_2px_0px_0px_#0A0A0A] hover:opacity-90"
          >
            <Camera className="h-4 w-4" />
            Start Capture
          </Link>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric icon={UserPlus} label="Requests" value={pendingRequests} />
          <Metric icon={CalendarDays} label="Upcoming" value={upcoming} />
          <Metric icon={Clock} label="Overdue" value={overdue} />
          <Metric icon={CheckCircle2} label="Completed" value={completed} />
          <Metric icon={Video} label="Recordings" value={recordings} />
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <ActionCard
          href="/player/requests"
          icon={UserPlus}
          title="Team Requests"
          body="Accept or decline coach requests to join teams and training sessions."
        />
        <ActionCard
          href="/player/workouts"
          icon={Dumbbell}
          title="Assigned Workouts"
          body="Open the training library and follow the work your coach wants completed."
        />
        <ActionCard
          href="/player/calendar"
          icon={CalendarDays}
          title="Training Plan"
          body="See what is due today and what is coming next on the shared calendar."
        />
        <ActionCard
          href="/player/moves"
          icon={Video}
          title="Move Library"
          body="Study coach-approved clips and upload your own reps for review."
        />
        <ActionCard
          href="/player/progress"
          icon={Award}
          title="Progress Report"
          body="Track grades, streaks, training volume, and the next areas to improve."
        />
      </section>
    </main>
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
