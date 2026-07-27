'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardPlus,
  Clock,
  Eye,
  FileBarChart,
  Flame,
  Footprints,
  HeartPulse,
  Lightbulb,
  Loader2,
  Minus,
  Shield,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wind,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DrillCategory } from '@/lib/constants'
import { DailyVolumeChart, type DailyHour } from '@/components/progress-charts'
import {
  Card,
  Avatar,
  EmptyState,
  GhostButton,
  PageTitle,
  Pill,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 016-coach-team-progress-raw.png at phone width. The comparison matrix and
 * assignment calendar are the desktop treatment (web-desktop/005) and only
 * appear from lg up. */

/** Players shown in the cards, matrix and calendar, most active first. */
const MAX_COMPARE = 3

const VOLUME_RANGES = [7, 14, 30]

type PlayerRow = { id: number; name: string; avatar_path: string | null }

type Subject = { subject: string; score: number; letter: string; trend: 'up' | 'down' | 'flat' }

type Report = {
  player: { id: number; name: string }
  overall_letter: string
  total_hours: number
  subjects: Subject[]
  weakest: string[]
  charts: { daily_hours: DailyHour[] }
  analysis: { next_steps: string[] } | null
}

type ScheduleRow = {
  id: number
  player_id: number
  scheduled_date: string
  title: string | null
  item_type: string
  workout_title: string | null
  workout_category: string | null
}

/* -------------------------------------------------------------------------- */

/** Icons keyed by the subject names /api/progress/report actually returns. */
const SUBJECT_ICON: Record<string, LucideIcon> = {
  Shooting: Target,
  'Ball Handling': CircleDot,
  Footwork: Footprints,
  Defense: Shield,
  Conditioning: HeartPulse,
  'Basketball IQ': Eye,
  Consistency: CalendarDays,
  Effort: Flame,
}

/* The design's six rows, mapped onto real subjects. "Finishing" and "Court
 * Vision" are not graded separately by the API — finishing drills roll into
 * Shooting — so those two slots carry the closest subjects it does return. */
const MATRIX_ROWS: { subject: string; label: string; icon: LucideIcon }[] = [
  { subject: '', label: 'Overall Grade', icon: Star },
  { subject: 'Ball Handling', label: 'Ball Handling', icon: CircleDot },
  { subject: 'Shooting', label: 'Shooting', icon: Target },
  { subject: 'Footwork', label: 'Footwork', icon: Footprints },
  { subject: 'Defense', label: 'Defense', icon: Shield },
  { subject: 'Basketball IQ', label: 'Basketball IQ', icon: Eye },
]

/* Every DRILL_CATEGORIES value gets a chip colour, grouped by family so the
 * calendar reads as the design's five pastels rather than nine near-misses. */
const CATEGORY_STYLE: Record<DrillCategory, { className: string; icon: LucideIcon }> = {
  Shooting: { className: 'bg-ht-orange-soft text-ht-orange', icon: Target },
  'Triple Threat': { className: 'bg-ht-orange-soft text-ht-orange', icon: Target },
  'Ball Handling': { className: 'bg-ht-purple-tint text-ht-purple', icon: CircleDot },
  Mentality: { className: 'bg-ht-purple-tint text-ht-purple', icon: Brain },
  Defense: { className: 'bg-ht-blue-tint text-ht-blue', icon: Shield },
  Footwork: { className: 'bg-ht-blue-tint text-ht-blue', icon: Footprints },
  Finishing: { className: 'bg-ht-green-tint text-ht-green', icon: Zap },
  'Speed & Agility': { className: 'bg-ht-green-tint text-ht-green', icon: Wind },
  'Strength & Conditioning': { className: 'bg-ht-red-tint text-ht-red', icon: HeartPulse },
}

const FALLBACK_CATEGORY = { className: 'bg-ht-chip text-ht-ink', icon: CalendarDays }

/* -------------------------------------------------------------------------- */
/* Week helpers — the calendar runs Sunday → Saturday like the design.          */
/* -------------------------------------------------------------------------- */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function toIso(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function fromIso(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function sundayOf(date: Date) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return toIso(start)
}

function shiftDays(iso: string, days: number) {
  const next = fromIso(iso)
  next.setDate(next.getDate() + days)
  return toIso(next)
}

function monthDay(iso: string) {
  const date = fromIso(iso)
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`
}

/**
 * Gates the phone-only volume chart. A recharts ResponsiveContainer inside a
 * display:none parent measures 0x0 and retries forever, so it must not be
 * mounted at all on desktop rather than merely CSS-hidden.
 */
function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsPhone(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return isPhone
}

/** Overall direction for a player, from how their subjects are trending. */
function overallTrend(subjects: Subject[]): 'up' | 'down' | 'flat' {
  const up = subjects.filter((s) => s.trend === 'up').length
  const down = subjects.filter((s) => s.trend === 'down').length
  if (up > down) return 'up'
  if (down > up) return 'down'
  return 'flat'
}

/* -------------------------------------------------------------------------- */

export default function TeamProgress() {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [weekStart, setWeekStart] = useState(() => sundayOf(new Date()))
  const [volumeDays, setVolumeDays] = useState(7)
  const [showAllWeak, setShowAllWeak] = useState(false)
  const [reportPlayerId, setReportPlayerId] = useState('')
  const [loading, setLoading] = useState(true)
  const isPhone = useIsPhone()

  // Roster ordered by most recent training activity, so the cards lead with
  // the players who actually have graded work behind them.
  useEffect(() => {
    let cancelled = false
    fetch('/api/players?activity=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const roster: PlayerRow[] = (data.players || []).map((p: PlayerRow) => ({
          id: p.id,
          name: p.name,
          avatar_path: p.avatar_path ?? null,
        }))
        setPlayers(roster)
        setReportPlayerId(roster[0] ? String(roster[0].id) : '')
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const compared = useMemo(() => players.slice(0, MAX_COMPARE), [players])
  const comparedIds = compared.map((p) => p.id).join(',')

  // Re-runs when the volume range changes — daily_hours is computed server-side.
  useEffect(() => {
    if (!comparedIds) return
    let cancelled = false
    Promise.all(
      comparedIds.split(',').map((id) =>
        fetch(`/api/progress/report?playerId=${id}&period=month&days=${volumeDays}`, {
          cache: 'no-store',
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((fetched) => {
      if (cancelled) return
      setReports(fetched.filter((r): r is Report => !!r && Array.isArray(r.subjects)))
    })
    return () => {
      cancelled = true
    }
  }, [comparedIds, volumeDays])

  // Trainers with no playerId get every player's week in one request.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/schedule?week=${weekStart}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSchedule(data.schedule || [])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [weekStart])

  const reportFor = useCallback(
    (playerId: number) => reports.find((r) => r.player.id === playerId),
    [reports],
  )

  /** Team-wide weak areas: each subject averaged across the compared players. */
  const weakAreas = useMemo(() => {
    if (reports.length === 0) return []
    const totals = new Map<string, { sum: number; count: number }>()
    for (const report of reports) {
      for (const subject of report.subjects) {
        const entry = totals.get(subject.subject) ?? { sum: 0, count: 0 }
        entry.sum += subject.score
        entry.count += 1
        totals.set(subject.subject, entry)
      }
    }
    return [...totals.entries()]
      .map(([subject, { sum, count }]) => ({ subject, percent: Math.round(sum / count) }))
      .sort((a, b) => a.percent - b.percent)
  }, [reports])

  /** Team training volume — the compared players' daily hours added together. */
  const teamVolume = useMemo(() => {
    const base = reports[0]?.charts?.daily_hours
    if (!base) return []
    return base.map((day, i) => ({
      ...day,
      hours:
        Math.round(
          reports.reduce((sum, r) => sum + (r.charts?.daily_hours?.[i]?.hours ?? 0), 0) * 10,
        ) / 10,
    }))
  }, [reports])

  const nextFocus = useMemo(() => {
    const areas = weakAreas.slice(0, 2).map((area) => area.subject)
    const steps: string[] = []
    for (const report of reports) {
      for (const step of report.analysis?.next_steps ?? []) {
        if (!steps.includes(step)) steps.push(step)
      }
    }
    const onTarget = steps.filter((step) =>
      areas.some((area) => step.toLowerCase().startsWith(area.toLowerCase())),
    )
    return { areas, text: (onTarget.length ? onTarget : steps).slice(0, 2).join(' ') }
  }, [weakAreas, reports])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDays(weekStart, i)),
    [weekStart],
  )

  const scheduleByPlayerDay = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>()
    for (const row of schedule) {
      const key = `${row.player_id}|${row.scheduled_date}`
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
      else map.set(key, [row])
    }
    return map
  }, [schedule])

  const visibleWeak = showAllWeak ? weakAreas : weakAreas.slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ht-muted">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-[15px]">Building team report...</span>
      </div>
    )
  }

  if (compared.length === 0) {
    return (
      <div className="pt-2">
        <PageTitle upright>Team Progress</PageTitle>
        <Card className="mt-5">
          <EmptyState
            icon={Users}
            title="No players yet"
            body="Add players to your roster to compare grades and assign a training week."
            action={<PrimaryButton href="/coach/players">Open Roster</PrimaryButton>}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="pt-2">
      <PageTitle upright>Team Progress</PageTitle>

      {/* Phone: the design's three player cards. Desktop gets the matrix. */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 lg:hidden">
        {compared.map((player) => (
          <PlayerCard key={player.id} player={player} report={reportFor(player.id)} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.07fr)_minmax(0,1fr)]">
        <PlayerComparison players={compared} reportFor={reportFor} />
        <TopWeakAreas
          areas={visibleWeak}
          expanded={showAllWeak}
          onToggle={() => setShowAllWeak((open) => !open)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2.16fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {isPhone && (
            <TrainingVolume data={teamVolume} days={volumeDays} onDaysChange={setVolumeDays} />
          )}

          <AssignmentCalendar
            players={compared}
            weekDays={weekDays}
            itemsFor={(playerId, day) => scheduleByPlayerDay.get(`${playerId}|${day}`) ?? []}
            rangeLabel={`${monthDay(weekStart)} - ${monthDay(weekDays[6])}`}
            onPrev={() => setWeekStart((week) => shiftDays(week, -7))}
            onNext={() => setWeekStart((week) => shiftDays(week, 7))}
            onThisWeek={() => setWeekStart(sundayOf(new Date()))}
          />
        </div>

        <div className="flex flex-col gap-4">
          <ReportsAndActions
            players={players}
            value={reportPlayerId}
            onChange={setReportPlayerId}
          />
          <NextFocus areas={nextFocus.areas} text={nextFocus.text} />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function PlayerCard({ player, report }: { player: PlayerRow; report: Report | undefined }) {
  const trend = report ? overallTrend(report.subjects) : 'flat'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-ht-green' : trend === 'down' ? 'text-ht-red' : 'text-ht-muted'

  return (
    <Card padded={false} className="p-2.5">
      {/* Fixed two-line name box so the grades line up across all three cards
          regardless of how long each name is. */}
      <div className="flex items-start gap-1.5">
        <Avatar name={player.name} src={player.avatar_path} size={32} className="shrink-0" />
        <span className="line-clamp-2 min-h-[26px] min-w-0 flex-1 text-[11px] leading-[1.15] font-semibold text-ht-ink">
          {player.name}
        </span>
      </div>
      <div className="ht-num mt-1.5 text-[38px] leading-none text-ht-orange">
        {report?.overall_letter ?? '—'}
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-ht-ink">
          <Clock className="size-3.5 shrink-0" strokeWidth={1.8} />
          {report ? `${report.total_hours} hrs` : '—'}
        </span>
        <TrendIcon className={cn('size-4 shrink-0', trendColor)} strokeWidth={2.2} />
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function PlayerComparison({
  players,
  reportFor,
}: {
  players: PlayerRow[]
  reportFor: (playerId: number) => Report | undefined
}) {
  // Columns share the card's width and wrap their labels; the wrapper only
  // scrolls once the card is narrower than every column's real minimum.
  // (min-w-max here computed wider than the track and clipped the last player.)
  const template = `minmax(0,1.2fr) repeat(${players.length}, minmax(0,1fr))`
  const minWidth = 150 + players.length * 118

  return (
    <Card padded={false} className="hidden overflow-hidden lg:block">
      <div className="px-5 pt-5">
        <SectionTitle>Player Comparison</SectionTitle>
      </div>

      <div className="overflow-x-auto">
        <div
          className="mt-3 grid items-center"
          style={{ gridTemplateColumns: template, minWidth: `${minWidth}px` }}
        >
          <div className="ht-heading px-4 py-3 text-[12px] tracking-[0.06em] text-ht-ink">Metric</div>
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 border-l border-ht-line-soft px-3 py-3"
            >
              <Avatar name={player.name} src={player.avatar_path} size={40} />
              <span className="min-w-0 text-[13px] leading-[1.2] text-ht-ink">{player.name}</span>
            </div>
          ))}

          {MATRIX_ROWS.map((row) => {
            const Icon = row.icon
            return (
              <div key={row.label} className="contents">
                <div className="flex items-center gap-2.5 border-t border-ht-line-soft px-4 py-3">
                  <Icon className="size-[18px] shrink-0 text-ht-ink" strokeWidth={1.6} />
                  <span className="text-[14px] leading-[1.2] text-ht-ink">{row.label}</span>
                </div>
                {players.map((player) => {
                  const report = reportFor(player.id)
                  const letter = row.subject
                    ? report?.subjects.find((s) => s.subject === row.subject)?.letter
                    : report?.overall_letter
                  return (
                    <div
                      key={`${row.label}-${player.id}`}
                      className="border-t border-l border-ht-line-soft px-3 py-3 text-center"
                    >
                      <span className="ht-heading text-[17px] text-ht-orange">{letter ?? '—'}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function TopWeakAreas({
  areas,
  expanded,
  onToggle,
}: {
  areas: { subject: string; percent: number }[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Card padded={false} className="flex flex-col">
      {/* web-desktop/005 titles this "TOP WEAK AREAS" and closes it with a
          footer link; ios/016 titles it "TEAM WEAK AREAS" with the link in the
          header. Both are rendered, one per breakpoint. */}
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
        <SectionTitle>
          <span className="lg:hidden">Team Weak Areas</span>
          <span className="hidden lg:inline">Top Weak Areas</span>
        </SectionTitle>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="shrink-0 text-[15px] text-ht-orange hover:underline lg:hidden"
        >
          {expanded ? 'Show Less' : 'View All'}
        </button>
      </div>

      {areas.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No graded areas yet"
          body="Weak areas appear once players record training sessions."
        />
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-5 px-5 py-5">
          {areas.map((area) => {
            const Icon = SUBJECT_ICON[area.subject] ?? Target
            return (
              <div key={area.subject} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ht-orange-tint">
                  <Icon className="size-[18px] text-ht-orange" strokeWidth={1.7} />
                </span>
                <span className="w-[88px] shrink-0 text-[13px] leading-[1.2] text-ht-ink lg:w-[112px] lg:text-[14px]">
                  {area.subject}
                </span>
                <span className="h-[9px] min-w-0 flex-1 overflow-hidden rounded-full bg-ht-ring">
                  <span
                    className="block h-full rounded-full bg-ht-orange"
                    style={{ width: `${Math.max(0, Math.min(100, area.percent))}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-[15px] font-semibold text-ht-ink lg:w-11">
                  {area.percent}%
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mx-5 hidden border-t border-ht-line-soft lg:block">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="ht-heading flex w-full items-center justify-center gap-1.5 py-3 text-[14px] tracking-[0.04em] text-ht-orange hover:underline"
        >
          {expanded ? 'Show Top Weak Areas' : 'View All Weak Areas'}
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function TrainingVolume({
  data,
  days,
  onDaysChange,
}: {
  data: DailyHour[]
  days: number
  onDaysChange: (days: number) => void
}) {
  // Phone-only: ios/016 carries this card, web-desktop/005 does not.
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <SectionTitle>Training Volume</SectionTitle>
        <div className="relative">
          <select
            aria-label="Training volume range"
            value={days}
            onChange={(event) => onDaysChange(Number(event.target.value))}
            className="appearance-none rounded-lg border border-ht-line bg-ht-surface py-2 pr-9 pl-3 text-[14px] text-ht-ink"
          >
            {VOLUME_RANGES.map((range) => (
              <option key={range} value={range}>
                Last {range} Days
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ht-muted"
            strokeWidth={2}
          />
        </div>
      </div>
      <p className="px-5 pt-2 text-[13px] text-ht-muted">Hours</p>
      {data.length === 0 ? (
        <EmptyState icon={Target} title="No training logged yet" />
      ) : (
        <div className="px-2 pt-1 pb-4">
          <DailyVolumeChart data={data} labelKey="label" />
        </div>
      )}
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function AssignmentCalendar({
  players,
  weekDays,
  itemsFor,
  rangeLabel,
  onPrev,
  onNext,
  onThisWeek,
}: {
  players: PlayerRow[]
  weekDays: string[]
  itemsFor: (playerId: number, day: string) => ScheduleRow[]
  rangeLabel: string
  onPrev: () => void
  onNext: () => void
  onThisWeek: () => void
}) {
  const stepButton =
    'flex size-9 items-center justify-center rounded-lg border border-ht-line text-ht-ink transition-colors hover:bg-ht-chip'

  return (
    <Card padded={false} className="hidden lg:block">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <SectionTitle>Assignment Calendar</SectionTitle>
          <span className="size-1.5 rounded-full bg-ht-ink" />
          <span className="ht-heading text-[17px] text-ht-ink">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrev} aria-label="Previous week" className={stepButton}>
            <ChevronLeft className="size-4" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={onThisWeek}
            className="rounded-lg border border-ht-line px-4 py-2 text-[14px] text-ht-ink transition-colors hover:bg-ht-chip"
          >
            This Week
          </button>
          <button type="button" onClick={onNext} aria-label="Next week" className={stepButton}>
            <ChevronRight className="size-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* An explicit min-width (not min-w-max, which computed wider than the
          card and clipped the later days) with a scrolling wrapper below it. */}
      <div className="overflow-x-auto px-5 pb-5">
        <div
          className="mt-5 grid min-w-[740px]"
          style={{ gridTemplateColumns: 'minmax(0,1.1fr) repeat(7, minmax(0,1fr))' }}
        >
          <div className="ht-heading self-end pb-3 text-[12px] tracking-[0.06em] text-ht-ink">
            Player
          </div>
          {weekDays.map((day) => (
            <div key={day} className="px-1 pb-3 text-center">
              <div className="ht-heading text-[13px] text-ht-ink">
                {DAY_LABELS[fromIso(day).getDay()]}
              </div>
              <div className="mt-0.5 text-[12px] text-ht-muted uppercase">{monthDay(day)}</div>
            </div>
          ))}

          {players.map((player) => (
            <div key={player.id} className="contents">
              <div className="flex items-center gap-2 border-t border-ht-line-soft py-3 pr-2">
                <Avatar name={player.name} src={player.avatar_path} size={40} />
                <span className="min-w-0 text-[13px] leading-[1.2] text-ht-ink">{player.name}</span>
              </div>
              {weekDays.map((day) => {
                const items = itemsFor(player.id, day)
                return (
                  <div
                    key={`${player.id}-${day}`}
                    className="flex flex-col justify-center gap-1 border-t border-ht-line-soft px-1 py-3"
                  >
                    {items.length === 0 ? (
                      <span className="flex h-[42px] items-center justify-center rounded-md bg-ht-chip text-[12px] text-ht-muted">
                        Rest
                      </span>
                    ) : (
                      items.map((item) => {
                        const style =
                          CATEGORY_STYLE[item.workout_category as DrillCategory] ??
                          FALLBACK_CATEGORY
                        const Icon = style.icon
                        return (
                          <span
                            key={item.id}
                            title={item.title || item.workout_title || item.item_type}
                            className={cn(
                              'flex h-[42px] items-center gap-1 rounded-md px-1.5',
                              style.className,
                            )}
                          >
                            <Icon className="size-3 shrink-0" strokeWidth={2} />
                            <span className="line-clamp-2 text-[11px] leading-[1.15] font-medium">
                              {item.title || item.workout_title || item.item_type}
                            </span>
                          </span>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function ReportsAndActions({
  players,
  value,
  onChange,
}: {
  players: PlayerRow[]
  value: string
  onChange: (next: string) => void
}) {
  return (
    <Card>
      <SectionTitle>Reports and Actions</SectionTitle>

      <div className="relative mt-4">
        <FileBarChart
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ht-ink"
          strokeWidth={1.6}
        />
        <select
          aria-label="Report to generate"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-ht-line bg-ht-surface py-2.5 pr-10 pl-10 text-[14px] text-ht-ink"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              Progress Report: {player.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-ht-muted"
          strokeWidth={2}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-1">
        <GhostButton href={`/coach/progress?playerId=${value}`} className="px-3">
          <FileBarChart className="size-[18px] shrink-0" strokeWidth={2} />
          Generate Report
        </GhostButton>
        <PrimaryButton href="/coach/workouts/create" className="px-3">
          <ClipboardPlus className="size-[18px] shrink-0" strokeWidth={2} />
          Build and Assign
        </PrimaryButton>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

function NextFocus({ areas, text }: { areas: string[]; text: string }) {
  return (
    <Card className="hidden border-ht-orange/15 bg-ht-orange-tint lg:block">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ht-surface">
          <Lightbulb className="size-6 text-ht-orange" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <SectionTitle>Next Focus</SectionTitle>
          {text ? <p className="mt-1.5 text-[14px] leading-[1.45] text-ht-ink">{text}</p> : null}
          {areas.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {areas.map((area) => (
                <Pill key={area} tone="orange" className="bg-ht-surface">
                  {area}
                </Pill>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
