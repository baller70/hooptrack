import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  Camera,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Move3d,
  Shield,
  SquarePlay,
  Target,
  Timer,
  Volleyball,
  Waypoints,
  Zap,
} from 'lucide-react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { appPath, appForRole, type HoopApp } from '@/lib/app-routes'
import {
  Card,
  EmptyState,
  GhostButton,
  PageTitle,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'
import { TrainingWorkspaceTabs } from '@/components/training-workspace-tabs'
import MarkCompleteButton from './mark-complete-button'

/**
 * Height/type of the two actions closing the workout detail card. Declared
 * here rather than imported from mark-complete-button: that module is
 * 'use client', so a server component importing from it gets a client
 * reference instead of the string, and the class silently never lands.
 */
const WORKOUT_ACTION = 'py-4 text-[21px]'

/* Implements design/hooptrack-raw-individual-screens/web-desktop/
 * 003-player-training-workspace-raw.png at lg+, and, for players below it,
 * ios/006-player-assigned-workouts-raw.png — a single-column list with its own
 * Active/Completed toggle instead of the desktop list + detail pair. */

/* ---------------------------------------------------------------- helpers */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Ball Handling': Waypoints,
  Shooting: Target,
  Footwork: Footprints,
  Finishing: ClipboardList,
  'Triple Threat': Move3d,
  'Speed & Agility': Zap,
  Defense: Shield,
  Mentality: Brain,
  'Strength & Conditioning': Dumbbell,
  Conditioning: Dumbbell,
}

function categoryIcon(category: string | null): LucideIcon {
  return (category && CATEGORY_ICONS[category]) || SquarePlay
}

/** 'YYYY-MM-DD' rendered in local time — bare Date() would parse it as UTC. */
function longDate(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function minutes(seconds: number | null): number {
  return Math.round((seconds ?? 0) / 60)
}

type CountRow = { count: number }

function count(sql: string, ...params: Array<string | number>): number {
  return (db.prepare(sql).get(...params) as CountRow | undefined)?.count ?? 0
}

/** Duration copy for the activity feed: "8 min" once it is worth rounding. */
function shortDuration(seconds: number): string {
  return seconds >= 60 ? `${minutes(seconds)} min` : `${seconds}s`
}

/* ------------------------------------------------------------------ types */

/** One row of the left-hand list — a player assignment or a library workout. */
interface WorkoutEntry {
  /** Selection key: schedule.id for assignments, workouts.id for the library. */
  key: number
  workoutId: number
  title: string
  /** "Due May 18, 2025" for a player, "12 drills" for a coach. */
  caption: string
  category: string
  coachName: string
  durationSeconds: number | null
  dueDate: string | null
  drillCount: number
}

/** Where "Continue" resumes: the first drill this player has not recorded. */
function nextDrillFor(workoutId: number, playerId: number): number | null {
  const row = db
    .prepare(
      `SELECT d.id FROM drills d
        WHERE d.workout_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM recordings r WHERE r.drill_id = d.id AND r.player_id = ?
          )
        ORDER BY d.drill_order, d.id LIMIT 1`,
    )
    .get(workoutId, playerId) as { id: number } | undefined
  if (row) return row.id
  const first = db
    .prepare('SELECT id FROM drills WHERE workout_id = ? ORDER BY drill_order, id LIMIT 1')
    .get(workoutId) as { id: number } | undefined
  return first?.id ?? null
}

interface DrillRow {
  id: number
  name: string
  duration_seconds: number
  timer_mode: string
  target_reps: number | null
}

interface ActivityRow {
  at: string
  title: string
  detail: string
  icon: LucideIcon
}

/* ------------------------------------------------------------------- page */

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; tab?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isPlayer = session.role === 'player'
  const app = appForRole(session.role)
  const { w, tab: tabParam } = await searchParams
  // Only the phone layout exposes this toggle; desktop always sees "active".
  const tab: PhoneTab = tabParam === 'completed' ? 'completed' : 'active'

  const entries: WorkoutEntry[] = isPlayer
    ? (db
        .prepare(
          `SELECT s.id, s.scheduled_date, s.title AS assignment_title, s.workout_id,
                  w.title AS workout_title, w.category, w.duration_seconds,
                  u.name AS coach_name,
                  (SELECT COUNT(*) FROM drills d WHERE d.workout_id = w.id) AS drill_count
             FROM schedule s
             JOIN workouts w ON w.id = s.workout_id
             LEFT JOIN users u ON u.id = w.created_by
            WHERE s.player_id = ? AND s.completed = ?
            ORDER BY s.scheduled_date ${tab === 'completed' ? 'DESC' : 'ASC'}, s.id`,
        )
        .all(session.id, tab === 'completed' ? 1 : 0) as Array<{
        id: number
        scheduled_date: string
        assignment_title: string | null
        workout_id: number
        workout_title: string
        category: string
        duration_seconds: number | null
        coach_name: string | null
        drill_count: number
      }>).map((row) => ({
        key: row.id,
        workoutId: row.workout_id,
        title: row.assignment_title || row.workout_title,
        caption: `Due ${longDate(row.scheduled_date)}`,
        category: row.category,
        coachName: row.coach_name ?? 'HoopTrack',
        durationSeconds: row.duration_seconds,
        dueDate: row.scheduled_date,
        drillCount: row.drill_count,
      }))
    : (db
        .prepare(
          `SELECT w.id, w.title, w.category, w.duration_seconds, u.name AS coach_name,
                  (SELECT COUNT(*) FROM drills d WHERE d.workout_id = w.id) AS drill_count
             FROM workouts w
             LEFT JOIN users u ON u.id = w.created_by
            ORDER BY w.category, w.created_at DESC`,
        )
        .all() as Array<{
        id: number
        title: string
        category: string
        duration_seconds: number | null
        coach_name: string | null
        drill_count: number
      }>).map((row) => ({
        key: row.id,
        workoutId: row.id,
        title: row.title,
        caption: `${row.drill_count} ${row.drill_count === 1 ? 'drill' : 'drills'} · ${row.category}`,
        category: row.category,
        coachName: row.coach_name ?? 'HoopTrack',
        durationSeconds: row.duration_seconds,
        dueDate: null,
        drillCount: row.drill_count,
      }))

  const requested = w ? Number(w) : NaN
  const selected =
    entries.find((entry) => entry.key === requested) ?? entries[0] ?? null

  const drills = selected
    ? (db
        .prepare(
          `SELECT id, name, duration_seconds, timer_mode, target_reps
             FROM drills WHERE workout_id = ? ORDER BY drill_order, id`,
        )
        .all(selected.workoutId) as DrillRow[])
    : []

  const nextDrill = selected ? nextDrillFor(selected.workoutId, session.id) : null

  // Phones show the design's own list instead of the desktop list + detail
  // pair; a coach keeps the desktop layout at every width.
  const flexDesktopOnly = isPlayer ? 'hidden lg:flex' : 'flex'

  return (
    <div className="pt-2 lg:pt-[44px]">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {isPlayer ? (
            <PageTitle className="lg:hidden">Assigned Workouts</PageTitle>
          ) : null}
          <PageTitle className={isPlayer ? 'hidden lg:block' : undefined}>Workouts</PageTitle>
          <TrainingWorkspaceTabs
            active="workouts"
            app={app}
            className={cn('mt-3', flexDesktopOnly)}
          />

          {isPlayer ? (
            <PhoneAssignments
              entries={entries}
              tab={tab}
              playerId={session.id}
              app={app}
              className="lg:hidden"
            />
          ) : null}

          <div
            className={cn(
              'mt-5 gap-5 lg:grid lg:grid-cols-[minmax(0,0.357fr)_minmax(0,0.643fr)]',
              isPlayer ? 'hidden' : 'grid',
            )}
          >
            <AssignedList
              entries={entries}
              selectedKey={selected?.key ?? null}
              isPlayer={isPlayer}
            />
            <WorkoutDetail
              entry={selected}
              drills={drills}
              isPlayer={isPlayer}
              app={app}
              nextDrillId={nextDrill}
            />
          </div>
        </div>

        <div className={cn('flex-col gap-5 xl:pt-[57px]', flexDesktopOnly)}>
          {isPlayer ? <TrainingPlanCard playerId={session.id} /> : null}
          <ProgressSnapshotCard playerId={session.id} isPlayer={isPlayer} />
          <RecentActivityCard playerId={session.id} isPlayer={isPlayer} app={app} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------ phone: assignments */

type PhoneTab = 'active' | 'completed'

/**
 * ios/006-player-assigned-workouts-raw.png: an Active/Completed toggle, the
 * two most urgent assignments as full cards, and the rest as compact rows.
 * Completed work has nothing to continue, so that tab is rows all the way
 * down.
 */
function PhoneAssignments({
  entries,
  tab,
  playerId,
  app,
  className,
}: {
  entries: WorkoutEntry[]
  tab: PhoneTab
  playerId: number
  app: HoopApp
  className?: string
}) {
  const featured = tab === 'completed' ? [] : entries.slice(0, 2)
  const rest = entries.slice(featured.length)

  return (
    <div className={className}>
      <div className="mt-4 flex">
        <PhoneTabLink tab="active" current={tab} app={app} className="rounded-l-full">
          Active
        </PhoneTabLink>
        <PhoneTabLink tab="completed" current={tab} app={app} className="-ml-px rounded-r-full">
          Completed
        </PhoneTabLink>
      </div>

      {entries.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={ClipboardList}
            title={tab === 'completed' ? 'Nothing completed yet' : 'Nothing assigned'}
            body={
              tab === 'completed'
                ? 'Workouts you finish move over to this tab.'
                : 'Your coach has not assigned a workout yet.'
            }
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {featured.map((entry) => (
            <PhoneWorkoutCard
              key={entry.key}
              entry={entry}
              app={app}
              nextDrillId={nextDrillFor(entry.workoutId, playerId)}
            />
          ))}
          {rest.length > 0 ? (
            <div className="space-y-1.5">
              {rest.map((entry) => (
                <PhoneWorkoutRow key={entry.key} entry={entry} app={app} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function PhoneTabLink({
  tab,
  current,
  app,
  className,
  children,
}: {
  tab: PhoneTab
  current: PhoneTab
  app: HoopApp
  className?: string
  children: React.ReactNode
}) {
  const selected = tab === current
  return (
    // A bare "?tab=" href never navigates through the app router — the target
    // has to be spelled out.
    <Link
      href={`${appPath(app, '/workouts')}?tab=${tab}`}
      scroll={false}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex-1 border py-[5px] text-center text-[15px] leading-[20px] transition-colors',
        selected
          ? 'border-ht-orange bg-ht-orange text-white'
          : 'border-ht-line bg-ht-surface text-ht-ink',
        className,
      )}
    >
      {children}
    </Link>
  )
}

function PhoneWorkoutCard({
  entry,
  app,
  nextDrillId,
}: {
  entry: WorkoutEntry
  app: HoopApp
  nextDrillId: number | null
}) {
  const Icon = categoryIcon(entry.category)
  return (
    <Card padded={false} className="p-3">
      <div className="flex gap-3.5">
        <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-ht-orange-tint text-ht-orange">
          <Icon className="size-7" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="ht-heading truncate text-[23px] leading-[1.15] text-ht-ink">
            {entry.title}
          </h3>
          <p className="mt-0.5 text-[15px] leading-[1.35] text-ht-ink">Coach {entry.coachName}</p>
          <p className="text-[15px] leading-[1.35] text-ht-ink">{entry.caption}</p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 border-t border-ht-line-soft pt-2.5">
        <PhoneStat icon={Volleyball} value={String(entry.drillCount)} caption="Drills" />
        <PhoneStat
          icon={Clock}
          value={String(minutes(entry.durationSeconds))}
          unit="min"
          caption="Estimated Time"
          divided
        />
      </div>

      <PrimaryButton
        className={PHONE_ACTION}
        href={
          nextDrillId
            ? `${appPath(app, '/record')}?drillId=${nextDrillId}&workoutId=${entry.workoutId}`
            : appPath(app, `/workouts/${entry.workoutId}`)
        }
      >
        Continue
      </PrimaryButton>
      <MarkCompleteButton
        scheduleId={entry.key}
        className={cn(PHONE_ACTION, 'mt-1.5 border-ht-orange text-ht-ink')}
      />
    </Card>
  )
}

/** Both phone-card actions: the design's short, full-width bars. */
const PHONE_ACTION = 'mt-2.5 h-[30px] px-3 py-0 text-[16px]'

function PhoneStat({
  icon: Icon,
  value,
  unit,
  caption,
  divided = false,
}: {
  icon: LucideIcon
  value: string
  unit?: string
  caption: string
  divided?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3',
        divided && 'border-l border-ht-line-soft',
      )}
    >
      <Icon className="size-8 shrink-0 text-ht-ink" strokeWidth={1.5} />
      <span>
        <span className="flex items-baseline gap-1">
          <span className="ht-heading text-[32px] leading-none text-ht-ink">{value}</span>
          {unit ? <span className="text-[14px] text-ht-ink">{unit}</span> : null}
        </span>
        <span className="mt-0.5 block text-[13px] leading-[1.2] text-ht-ink">{caption}</span>
      </span>
    </div>
  )
}

function PhoneWorkoutRow({ entry, app }: { entry: WorkoutEntry; app: HoopApp }) {
  const Icon = categoryIcon(entry.category)
  return (
    <Link
      href={appPath(app, `/workouts/${entry.workoutId}`)}
      className="flex items-center gap-3 rounded-xl border border-ht-line bg-ht-surface px-3 py-2 transition-colors hover:border-ht-orange/40"
    >
      <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-ht-chip text-ht-ink">
        <Icon className="size-[18px]" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ht-heading block truncate text-[15px] leading-[1.2] text-ht-ink">
          {entry.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-[1.25] text-ht-ink">
          {entry.caption} &nbsp;•&nbsp; {entry.drillCount} Drills &nbsp;•&nbsp;{' '}
          {minutes(entry.durationSeconds)} min
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ht-ink" strokeWidth={2} />
    </Link>
  )
}

/* ------------------------------------------------------- left: assignments */

function AssignedList({
  entries,
  selectedKey,
  isPlayer,
}: {
  entries: WorkoutEntry[]
  selectedKey: number | null
  isPlayer: boolean
}) {
  return (
    <Card padded={false} className="h-full">
      <div className="px-5 pt-2.5">
        <SectionTitle>{isPlayer ? 'Assigned Workouts' : 'Workout Library'}</SectionTitle>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={isPlayer ? 'Nothing assigned' : 'No workouts yet'}
          body={
            isPlayer
              ? 'Your coach has not assigned a workout yet. Completed work moves to your progress report.'
              : 'Create a workout with a few drills so players know exactly what to do next.'
          }
        />
      ) : (
        <div className="mt-3 space-y-4 px-2.5 pb-5">
          {entries.map((entry) => {
            const Icon = categoryIcon(entry.category)
            const selected = entry.key === selectedKey
            return (
              <Link
                key={entry.key}
                href={`?w=${entry.key}`}
                scroll={false}
                aria-current={selected ? 'true' : undefined}
                className={
                  selected
                    ? 'flex items-center gap-2 rounded-xl border border-ht-orange bg-ht-orange-tint py-[21px] pl-2.5 pr-1'
                    : 'flex items-center gap-2 rounded-xl border border-ht-line bg-ht-surface py-[21px] pl-2.5 pr-1 transition-colors hover:border-ht-orange/40 hover:bg-ht-orange-tint/50'
                }
              >
                <span
                  className={
                    selected
                      ? 'grid size-13 shrink-0 place-items-center rounded-xl bg-ht-orange text-white'
                      : 'grid size-13 shrink-0 place-items-center rounded-full bg-ht-chip text-ht-ink'
                  }
                >
                  <Icon className="size-6" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  {/* This column is as narrow as the design's, so longer real
                      titles clip — the tooltip keeps the full name reachable. */}
                  <span
                    title={entry.title}
                    className="block truncate text-[19px] font-semibold leading-tight text-ht-ink"
                  >
                    {entry.title}
                  </span>
                  <span className="mt-1 block truncate text-[17px] text-ht-muted">
                    {entry.caption}
                  </span>
                </span>
                <ChevronRight className="size-6 shrink-0 text-ht-muted" strokeWidth={2} />
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/* ----------------------------------------------------------- centre: detail */

function WorkoutDetail({
  entry,
  drills,
  isPlayer,
  app,
  nextDrillId,
}: {
  entry: WorkoutEntry | null
  drills: DrillRow[]
  isPlayer: boolean
  app: 'player' | 'coach'
  nextDrillId: number | null
}) {
  if (!entry) {
    return (
      <Card className="flex items-center justify-center">
        <EmptyState
          icon={SquarePlay}
          title="No workout selected"
          body={
            isPlayer
              ? 'Assigned workouts appear here with their full drill list.'
              : 'Pick a workout from the library to see its drills.'
          }
        />
      </Card>
    )
  }

  const totalSeconds =
    entry.durationSeconds ?? drills.reduce((sum, drill) => sum + drill.duration_seconds, 0)

  return (
    <Card padded={false}>
      <div className="flex items-start gap-5 px-5 pt-5">
        <WorkoutGlyph icon={categoryIcon(entry.category)} />
        <div className="min-w-0 pt-0.5">
          {/* Upright: the pack keeps the italic display face for page titles. */}
          <h2 className="ht-heading text-[46px] leading-none text-ht-ink">{entry.title}</h2>
          <p className="mt-1.5 text-[19px] text-ht-ink">Coach {entry.coachName}</p>
          <p className="mt-1 text-[18px] text-ht-ink">
            {entry.dueDate ? `Due ${longDate(entry.dueDate)}` : `${entry.category} workout`}
          </p>
        </div>
      </div>

      {/* Hairlines here stop at the card's padding rather than running edge to
          edge, and the column rules only span the figures. */}
      <div className="mt-4 px-5">
        <div className="grid grid-cols-3 border-y border-ht-line-soft">
          <DetailStat icon={Volleyball} value={String(drills.length)} caption="Drills" />
          <DetailStat
            icon={Clock}
            value={String(minutes(totalSeconds))}
            caption="min"
            divided
          />
          {/* No skill-level column exists — the workout's own category is the
              honest thing to show in this slot. */}
          <DetailStat
            icon={ChartNoAxesColumnIncreasing}
            value={entry.category}
            caption="Focus"
            small
            divided
          />
        </div>
      </div>

      <div className="px-5 pt-5">
        <SectionTitle className="tracking-[0.04em]">Drill List</SectionTitle>
      </div>

      {drills.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No drills yet" body="This workout has no drills." />
      ) : (
        <div className="mt-3 px-5">
          <div className="overflow-hidden rounded-xl border border-ht-line">
            {drills.map((drill, index) => (
              <Link
                key={drill.id}
                href={`${appPath(app, '/record')}?drillId=${drill.id}&workoutId=${entry.workoutId}`}
                className="flex items-center gap-4 border-b border-ht-line-soft px-4 py-3.5 transition-colors last:border-b-0 hover:bg-ht-orange-tint/50"
              >
                <span className="w-4 shrink-0 text-[19px] font-semibold text-ht-ink">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[19px] text-ht-ink">{drill.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[17px] text-ht-muted">
                  {drill.timer_mode === 'reps' ? (
                    <>
                      <Target className="size-4" strokeWidth={1.8} />
                      {drill.target_reps ?? '—'} reps
                    </>
                  ) : (
                    <>
                      <Clock className="size-4" strokeWidth={1.8} />
                      {minutes(drill.duration_seconds)} min
                    </>
                  )}
                </span>
                <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 px-5 py-5">
        {isPlayer ? (
          <MarkCompleteButton scheduleId={entry.key} />
        ) : (
          <GhostButton
            href={`/dashboard/workouts/${entry.workoutId}`}
            className={WORKOUT_ACTION}
          >
            Edit Workout
          </GhostButton>
        )}
        <PrimaryButton
          className={WORKOUT_ACTION}
          href={
            isPlayer && nextDrillId
              ? `${appPath(app, '/record')}?drillId=${nextDrillId}&workoutId=${entry.workoutId}`
              : `/dashboard/workouts/${entry.workoutId}`
          }
        >
          {isPlayer ? 'Continue Workout' : 'Open Workout'}
        </PrimaryButton>
      </div>
    </Card>
  )
}

function WorkoutGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-[76px] shrink-0 place-items-center rounded-full bg-ht-orange-tint text-ht-orange">
      <Icon className="size-10" strokeWidth={1.7} />
    </span>
  )
}

function DetailStat({
  icon: Icon,
  value,
  caption,
  small = false,
  divided = false,
}: {
  icon: LucideIcon
  value: string
  caption: string
  small?: boolean
  divided?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 py-4 pr-4 ${
        divided
          ? 'relative pl-4 before:absolute before:inset-y-4 before:left-0 before:w-px before:bg-ht-line-soft'
          : ''
      }`}
    >
      <Icon className="size-9 shrink-0 text-ht-ink" strokeWidth={1.5} />
      <span className="min-w-0">
        <span
          className={
            small
              ? 'block text-[17px] leading-tight text-ht-ink'
              : 'ht-heading block text-[34px] leading-none text-ht-ink'
          }
        >
          {value}
        </span>
        <span className="mt-1.5 block text-[15px] text-ht-muted">{caption}</span>
      </span>
    </div>
  )
}

/* --------------------------------------------------- right rail: plan card */

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function TrainingPlanCard({ playerId }: { playerId: number }) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return isoDay(day)
  })

  const rows = db
    .prepare(
      `SELECT scheduled_date, completed FROM schedule
        WHERE player_id = ? AND scheduled_date >= ? AND scheduled_date <= ?`,
    )
    .all(playerId, week[0], week[6]) as Array<{ scheduled_date: string; completed: number }>

  // The player's program runs from their first scheduled day to their last.
  const span = db
    .prepare(
      'SELECT MIN(scheduled_date) AS first, MAX(scheduled_date) AS last FROM schedule WHERE player_id = ?',
    )
    .get(playerId) as { first: string | null; last: string | null }

  const dayMs = 86_400_000
  let weekOf = 0
  let weeks = 0
  if (span.first && span.last) {
    const first = new Date(`${span.first}T00:00:00`).getTime()
    const last = new Date(`${span.last}T00:00:00`).getTime()
    weeks = Math.max(1, Math.ceil((last - first) / dayMs / 7))
    const elapsed = Math.floor((monday.getTime() - first) / dayMs / 7) + 1
    weekOf = Math.min(weeks, Math.max(1, elapsed))
  }

  const firstOpen = week.find((day) =>
    rows.some((row) => row.scheduled_date.slice(0, 10) === day && !row.completed),
  )

  return (
    <Card padded={false}>
      <div className="px-5 pt-3">
        <SectionTitle>Training Plan</SectionTitle>
        <p className="mt-1 text-[17px] text-ht-muted">
          {weeks > 0 ? `Week ${weekOf} of ${weeks}` : 'No plan scheduled yet'}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4 px-5">
        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ht-ring">
          <span
            className="block h-full rounded-full bg-ht-orange"
            style={{ width: `${weeks > 0 ? Math.round((weekOf / weeks) * 100) : 0}%` }}
          />
        </span>
        <span className="shrink-0 text-[17px] font-semibold text-ht-ink">
          {weekOf} / {weeks} Weeks
        </span>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 px-5 pb-5">
        {week.map((day, index) => {
          const dayRows = rows.filter((row) => row.scheduled_date.slice(0, 10) === day)
          const done = dayRows.length > 0 && dayRows.every((row) => row.completed)
          const isNext = day === firstOpen
          return (
            <div key={day} className="flex flex-col items-center gap-3">
              <span className="text-[16px] text-ht-ink">{DAY_LETTERS[index]}</span>
              {done ? (
                <CheckCircle2 className="size-6 fill-ht-orange text-white" strokeWidth={2} />
              ) : isNext ? (
                <span className="size-6 rounded-full border-2 border-ht-orange" />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-ht-ring">
                  <span className="h-0.5 w-2.5 rounded bg-white" />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ----------------------------------------------- right rail: progress card */

function ProgressSnapshotCard({ playerId, isPlayer }: { playerId: number; isPlayer: boolean }) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekStart = isoDay(monday)

  const stats = isPlayer
    ? (() => {
        const completed = count(
          'SELECT COUNT(*) AS count FROM schedule WHERE player_id = ? AND completed = 1',
          playerId,
        )
        const assigned = count(
          'SELECT COUNT(*) AS count FROM schedule WHERE player_id = ?',
          playerId,
        )
        const weekSeconds = count(
          `SELECT COALESCE(SUM(duration_seconds), 0) AS count FROM recordings
            WHERE player_id = ? AND date(recorded_at) >= ?`,
          playerId,
          weekStart,
        )

        // Same definition as /api/progress/report so the two screens agree:
        // consecutive completed days counting back from today.
        const completedDates = db
          .prepare(
            'SELECT scheduled_date FROM schedule WHERE player_id = ? AND completed = 1 ORDER BY scheduled_date DESC',
          )
          .all(playerId) as Array<{ scheduled_date: string }>
        let streak = 0
        let cursor = isoDay(today)
        for (const { scheduled_date } of completedDates) {
          if (scheduled_date.slice(0, 10) !== cursor) break
          streak += 1
          const previous = new Date(`${cursor}T00:00:00`)
          previous.setDate(previous.getDate() - 1)
          cursor = isoDay(previous)
        }

        return [
          {
            icon: SquarePlay,
            label: 'Workouts Completed',
            sublabel: null,
            value: String(completed),
            unit: `of ${assigned}`,
          },
          {
            icon: Clock,
            label: 'Minutes Trained',
            sublabel: 'This Week',
            value: String(Math.round(weekSeconds / 60)),
            unit: 'min',
          },
          {
            icon: Flame,
            label: 'Current Streak',
            sublabel: 'Days',
            value: String(streak),
            unit: null,
          },
        ]
      })()
    : [
        {
          icon: SquarePlay,
          label: 'Workouts',
          sublabel: 'In Library',
          value: String(count('SELECT COUNT(*) AS count FROM workouts')),
          unit: null,
        },
        {
          icon: ClipboardList,
          label: 'Drills',
          sublabel: 'Across Workouts',
          value: String(count('SELECT COUNT(*) AS count FROM drills')),
          unit: null,
        },
        {
          icon: CheckCircle2,
          label: 'Completions',
          sublabel: 'All Players',
          value: String(count('SELECT COUNT(*) AS count FROM schedule WHERE completed = 1')),
          unit: null,
        },
      ]

  return (
    <Card padded={false}>
      <div className="px-5 pt-3">
        <SectionTitle>Progress Snapshot</SectionTitle>
      </div>
      <div className="px-5 pb-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`flex items-center gap-4 py-3 ${index > 0 ? 'border-t border-ht-line-soft' : ''}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ht-orange-tint text-ht-orange">
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold text-ht-ink">
                  {stat.label}
                </span>
                {stat.sublabel ? (
                  <span className="mt-0.5 block text-[14px] text-ht-muted">{stat.sublabel}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-right">
                <span className="ht-heading block text-[34px] leading-none text-ht-ink">
                  {stat.value}
                </span>
                {stat.unit ? (
                  <span className="mt-1 block text-[14px] text-ht-muted">{stat.unit}</span>
                ) : null}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ----------------------------------------------- right rail: activity card */

function RecentActivityCard({
  playerId,
  isPlayer,
  app,
}: {
  playerId: number
  isPlayer: boolean
  app: 'player' | 'coach'
}) {
  // A coach sees the whole squad's activity; a player sees only their own.
  const mine = isPlayer ? [playerId] : []
  const recordings = db
    .prepare(
      `SELECT r.recorded_at AS at, r.title, r.duration_seconds, d.name AS drill_name
         FROM recordings r
         JOIN drills d ON d.id = r.drill_id
        WHERE r.parent_recording_id IS NULL ${isPlayer ? 'AND r.player_id = ?' : ''}
        ORDER BY r.recorded_at DESC LIMIT 5`,
    )
    .all(...mine) as Array<{
    at: string
    title: string | null
    duration_seconds: number
    drill_name: string
  }>

  const completions = db
    .prepare(
      `SELECT s.completed_at AS at, s.title, w.duration_seconds
         FROM schedule s
         LEFT JOIN workouts w ON w.id = s.workout_id
        WHERE s.completed = 1 AND s.completed_at IS NOT NULL
          ${isPlayer ? 'AND s.player_id = ?' : ''}
        ORDER BY s.completed_at DESC LIMIT 5`,
    )
    .all(...mine) as Array<{
    at: string
    title: string | null
    duration_seconds: number | null
  }>

  const quizzes = db
    .prepare(
      `SELECT a.completed_at AS at, a.score, q.title
         FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.completed_at IS NOT NULL ${isPlayer ? 'AND a.player_id = ?' : ''}
        ORDER BY a.completed_at DESC LIMIT 5`,
    )
    .all(...mine) as Array<{
    at: string
    score: number
    title: string
  }>

  const items: ActivityRow[] = [
    ...recordings.map((row) => ({
      at: row.at,
      title: `Captured: ${row.title || row.drill_name}`,
      detail: shortDuration(row.duration_seconds),
      icon: Camera,
    })),
    ...completions.map((row) => ({
      at: row.at,
      title: `Completed workout: ${row.title ?? 'Workout'}`,
      detail: row.duration_seconds ? `${minutes(row.duration_seconds)} min` : 'Marked complete',
      icon: CheckCircle2,
    })),
    ...quizzes.map((row) => ({
      at: row.at,
      title: `Classroom: ${row.title}`,
      detail: `${row.score}%`,
      icon: GraduationCap,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3)

  return (
    <Card padded={false}>
      <div className="px-5 pt-3">
        <SectionTitle>Recent Activity</SectionTitle>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="Nothing logged yet"
          body="Captured clips, completed workouts and quiz results show up here."
        />
      ) : (
        <div className="px-5 pb-3">
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={`${item.at}-${item.title}-${index}`}
                href={appPath(app, '/activity')}
                className={`flex items-center gap-4 py-2.5 ${index > 0 ? 'border-t border-ht-line-soft' : ''}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ht-orange-tint text-ht-orange">
                  <Icon className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] leading-tight text-ht-ink">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-[14px] leading-tight text-ht-muted">
                    {longDate(item.at)} • {item.detail}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
