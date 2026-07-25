'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CalendarCheck,
  ChevronDown,
  CircleDot,
  Clock,
  Crosshair,
  Dumbbell,
  Footprints,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import GradeCard from '@/components/grade-card'
import {
  DailyVolumeChart,
  HoursByCategoryChart,
  SubjectRadar,
  type DailyHour,
} from '@/components/progress-charts'
import { cn } from '@/lib/utils'
import {
  Card,
  EmptyState,
  PageTitle,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'
import TeamProgress from './team-progress'

/* Player-facing report implementing design/hooptrack-raw-individual-screens/
 * ios/011-player-progress-report-raw.png. The coach team view lives in
 * ./team-progress.tsx. */

type Period = 'week' | 'month' | 'year'

interface Subject {
  subject: string
  score: number
  letter: string
  hours: number
  trend: 'up' | 'down' | 'flat'
  prevScore: number | null
}

interface ImprovementPlan {
  subject: string
  currentScore: number
  currentLetter: string
  currentHours: number
  plan: {
    targetLetter: string
    targetHours: number
    addHours: number
    minutesPerDay: number
    weeks: number
  }
}

interface Analysis {
  summary: string
  strengths: string[]
  areas_to_improve: string[]
  next_steps: string[]
  motivation_level: 'high' | 'medium' | 'low'
}

interface Report {
  player: { id: number; name: string }
  period: Period
  period_start: string
  period_end: string
  gpa: number
  overall_letter: string
  total_hours: number
  streak_days: number
  total_recordings: number
  subjects: Subject[]
  strongest: string[]
  weakest: string[]
  charts: {
    weekly_hours: { week: string; hours: number }[]
    daily_hours: DailyHour[]
    subject_hours: { subject: string; hours: number }[]
    radar: { subject: string; score: number; fullMark: number }[]
  }
  improvement_plans: ImprovementPlan[]
  analysis: Analysis | null
}

interface Player { id: number; name: string }

const SUBJECT_ICON: Record<string, LucideIcon> = {
  Shooting: Crosshair,
  'Ball Handling': CircleDot,
  Footwork: Footprints,
  Defense: ShieldCheck,
  Conditioning: Dumbbell,
  'Basketball IQ': BrainCircuit,
  Consistency: CalendarCheck,
  Effort: Clock,
}

function subjectIcon(subject: string): LucideIcon {
  return SUBJECT_ICON[subject] ?? Target
}

/**
 * Detail sections are gated on this rather than CSS-hidden: a recharts
 * ResponsiveContainer inside a display:none parent measures 0x0 and keeps
 * retrying, which pegged the phone render and stopped it ever going idle.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return isDesktop
}

function scorePercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function hoursPercent(currentHours: number, targetHours: number): number {
  if (targetHours <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((currentHours / targetHours) * 100)))
}

/* ------------------------------------------------------------------ pieces */

/**
 * The four hairline-divided tiles at the top of the phone design. Local rather
 * than the shared StatStrip because that primitive reflows into rows of three
 * on phones, and this screen needs all four across at 390px.
 */
function StatQuad({ tiles }: { tiles: { label: string; value: React.ReactNode; caption: string }[] }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid grid-cols-4">
        {tiles.map((tile, i) => (
          <div
            key={tile.label}
            className={cn('px-1.5 py-4 text-center lg:px-4', i > 0 && 'border-l border-ht-line-soft')}
          >
            <div className="ht-heading text-[10px] leading-[1.2] tracking-[0.04em] text-ht-muted lg:text-[13px]">
              {tile.label}
            </div>
            <div className="ht-display mt-1.5 text-[32px] leading-none text-ht-orange lg:text-[40px]">
              {tile.value}
            </div>
            <div className="mt-1 text-[11px] leading-[1.2] text-ht-muted lg:text-[13px]">
              {tile.caption}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** One "TOP STRENGTHS" / "AREAS TO IMPROVE" row: icon, name, optional bar, %. */
function MetricRow({
  subject,
  percent,
  showBar,
  last,
}: {
  subject: string
  percent: number
  showBar?: boolean
  last?: boolean
}) {
  const Icon = subjectIcon(subject)
  return (
    <div className={cn('flex items-center gap-3.5 py-3', !last && 'border-b border-ht-line-soft')}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ht-orange-tint">
        <Icon className="size-5 text-ht-orange" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-ht-ink">{subject}</p>
        {showBar ? (
          <span className="mt-1.5 block h-[9px] w-full overflow-hidden rounded-full bg-ht-ring">
            <span
              className="block h-full rounded-full bg-ht-orange"
              style={{ width: `${percent}%` }}
            />
          </span>
        ) : null}
      </div>
      <span className="ht-heading shrink-0 text-[17px] text-ht-orange">{percent}%</span>
    </div>
  )
}

function LevelUpPlanDropdown({
  plan,
  open,
  onToggle,
}: {
  plan: ImprovementPlan
  open: boolean
  onToggle: () => void
}) {
  const currentPercent = scorePercent(plan.currentScore)
  const targetPercent = hoursPercent(plan.currentHours, plan.plan.targetHours)

  return (
    <Card padded={false} className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-ht-chip/50"
      >
        <div className="min-w-0">
          <p className="ht-heading text-[16px] text-ht-ink">{plan.subject}</p>
          <p className="mt-1 text-[13.5px] text-ht-muted">
            Tap to see the plan to move from {plan.currentLetter} to {plan.plan.targetLetter}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="ht-display text-[26px] leading-none text-ht-orange">
            {plan.currentLetter}
          </span>
          <ChevronDown
            className={cn('size-5 text-ht-muted transition-transform', open && 'rotate-180')}
            strokeWidth={2}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-ht-line-soft p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
            <div>
              <p className="text-[14.5px] leading-[1.55] text-ht-ink">
                Right now this area has <strong>{plan.currentHours} hours</strong>. To reach a{' '}
                <strong>{plan.plan.targetLetter}</strong>, add{' '}
                <strong>{plan.plan.minutesPerDay} minutes per day</strong> for {plan.plan.weeks}{' '}
                weeks. That adds <strong>{plan.plan.addHours} hours</strong> and gets this area to
                roughly <strong>{plan.plan.targetHours} total hours</strong>.
              </p>

              <ul className="mt-4 space-y-2 text-[14px] text-ht-ink">
                <li className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0 text-ht-muted" strokeWidth={1.8} />
                  Add <strong>{plan.plan.minutesPerDay} min/day</strong> for {plan.plan.weeks} weeks
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="size-4 shrink-0 text-ht-muted" strokeWidth={1.8} />
                  That is <strong>+{plan.plan.addHours} hours</strong> total
                </li>
                <li className="flex items-center gap-2">
                  <Target className="size-4 shrink-0 text-ht-muted" strokeWidth={1.8} />
                  Target pace: <strong>{plan.plan.targetHours} hours</strong> overall
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-ht-line-soft bg-ht-chip/40 p-4">
              <p className="ht-heading text-[12px] tracking-[0.06em] text-ht-muted">Progress</p>
              <div className="mt-3 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[12.5px] font-semibold text-ht-ink">
                    <span>Grade score</span>
                    <span>{currentPercent}%</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ht-ring">
                    <div className="h-full rounded-full bg-ht-ink" style={{ width: `${currentPercent}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[12.5px] font-semibold text-ht-ink">
                    <span>Hours to target</span>
                    <span>{targetPercent}%</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ht-ring">
                    <div className="h-full rounded-full bg-ht-orange" style={{ width: `${targetPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------- page */

export default function ProgressPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [period, setPeriod] = useState<Period>('month')
  const [players, setPlayers] = useState<Player[]>([])
  const [userRole, setUserRole] = useState('')

  // ?playerId= is the source of truth, not local state. Held in state, a
  // client-side navigation here (the team view's GENERATE REPORT link) changed
  // the URL without remounting, so the selection never moved off the team view.
  const selectedPlayerId = searchParams.get('playerId') || ''
  const selectPlayer = useCallback((id: string) => {
    router.replace(id ? `${pathname}?playerId=${id}` : pathname, { scroll: false })
  }, [router, pathname])

  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [openPlans, setOpenPlans] = useState<Set<string>>(() => new Set())
  const isDesktop = useIsDesktop()

  const togglePlan = useCallback((subject: string) => {
    setOpenPlans((current) => {
      const next = new Set(current)
      if (next.has(subject)) next.delete(subject)
      else next.add(subject)
      return next
    })
  }, [])

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (!d?.user) return
      setUserRole(d.user.role)
      if (d.user.role === 'trainer') {
        fetch('/api/players', { cache: 'no-store' })
          .then(r => r.ok ? r.json() : { players: [] })
          .then(playersData => setPlayers(playersData.players || []))
      }
    })
  }, [])

  // /api/players is trainer-only — players would just get a 403.
  useEffect(() => {
    if (userRole !== 'trainer') return
    fetch('/api/players').then(r => r.json()).then(d => setPlayers(d.players || []))
  }, [userRole])

  const fetchReport = useCallback(() => {
    setLoading(true)
    let url = `/api/progress/report?period=${period}`
    if (selectedPlayerId) url += `&playerId=${selectedPlayerId}`
    fetch(url)
      .then(async (r) => {
        // A stale ?playerId= 404s here. Without this check the error body was
        // cast straight to Report and the render died on report.player.name.
        if (!r.ok) {
          const body = await r.json().catch(() => null)
          throw new Error(body?.error || `Could not load this report (${r.status}).`)
        }
        return r.json() as Promise<Report>
      })
      .then(d => {
        setReport(d)
        setError('')
      })
      .catch((e: Error) => {
        setReport(null)
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [period, selectedPlayerId])

  // A trainer with no player selected gets the team view; picking a player (from
  // the dropdown or a ?playerId= link) drops back to that player's own report.
  const showTeamView = userRole === 'trainer' && !selectedPlayerId

  useEffect(() => {
    if (!userRole || showTeamView) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setReport/setLoading are in the async fetch chain
    fetchReport()
  }, [userRole, showTeamView, fetchReport])

  if (!userRole) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ht-muted">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-[15px]">Loading...</span>
      </div>
    )
  }

  if (showTeamView) return <TeamProgress />

  const subjectScore = (name: string) =>
    scorePercent(report?.subjects.find(s => s.subject === name)?.score ?? 0)

  const tiles = report
    ? [
        { label: 'Overall Grade', value: report.overall_letter, caption: `GPA ${report.gpa.toFixed(1)}` },
        { label: 'Current Streak', value: report.streak_days, caption: 'days' },
        { label: 'Hours Trained', value: report.total_hours, caption: `this ${report.period}` },
        { label: 'Recordings', value: report.total_recordings, caption: 'sessions' },
      ]
    : []

  /* The PNG stops after Areas To Improve. Everything below it is desktop-only,
   * or revealed on a phone by Generate Report. */
  const showAll = showDetail || isDesktop

  return (
    <div className="pt-2">
      <PageTitle>Progress Report</PageTitle>

      <div className={cn('mt-4 flex-wrap items-center gap-3', showAll ? 'flex' : 'hidden')}>
        {userRole === 'trainer' && (
          <select
            value={selectedPlayerId}
            onChange={(e) => selectPlayer(e.target.value)}
            aria-label="Player"
            className="h-10 rounded-xl border border-ht-line bg-ht-surface px-3 text-[14px] text-ht-ink"
          >
            <option value="">Team progress</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="inline-flex overflow-hidden rounded-xl border border-ht-line">
          {(['week', 'month', 'year'] as Period[]).map((p, i) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={cn(
                'px-4 py-2 text-[14px] capitalize transition-colors',
                i > 0 && 'border-l border-ht-line',
                period === p
                  ? 'bg-ht-orange text-white'
                  : 'bg-ht-surface text-ht-ink hover:bg-ht-chip',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-ht-muted">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-[15px]">Building report...</span>
        </div>
      )}

      {error && !loading && (
        <Card className="mt-4">
          <EmptyState
            icon={AlertCircle}
            title="Report unavailable"
            body={error}
            action={
              <PrimaryButton onClick={fetchReport} className="w-auto px-6">
                Try Again
              </PrimaryButton>
            }
          />
        </Card>
      )}

      {report && !loading && (
        <div className="mt-4 space-y-4">
          {showAll && (
            <p className="text-[13.5px] text-ht-muted">
              {report.player.name} · {report.period_start} to {report.period_end}
            </p>
          )}

          <StatQuad tiles={tiles} />

          <Card padded={false}>
            <div className="flex items-baseline gap-2 px-5 pt-5">
              <SectionTitle>Training Volume</SectionTitle>
              <span className="ht-heading text-[13px] text-ht-muted">(Hours)</span>
            </div>
            <div className="px-2 pt-2 pb-4">
              <DailyVolumeChart data={report.charts.daily_hours} labelKey="weekday" />
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padded={false}>
              <div className="px-5 pt-5">
                <SectionTitle>Top Strengths</SectionTitle>
              </div>
              <div className="px-5 pb-2">
                {report.strongest.length === 0 ? (
                  <EmptyState icon={Target} title="No graded subjects yet" />
                ) : (
                  report.strongest.map((name, i) => (
                    <MetricRow
                      key={name}
                      subject={name}
                      percent={subjectScore(name)}
                      last={i === report.strongest.length - 1}
                    />
                  ))
                )}
              </div>
            </Card>

            <Card padded={false}>
              <div className="px-5 pt-5">
                <SectionTitle>Areas To Improve</SectionTitle>
              </div>
              <div className="px-5 pb-2">
                {report.weakest.length === 0 ? (
                  <EmptyState icon={Target} title="Nothing flagged yet" />
                ) : (
                  report.weakest.map((name, i) => (
                    <MetricRow
                      key={name}
                      subject={name}
                      percent={subjectScore(name)}
                      showBar
                      last={i === report.weakest.length - 1}
                    />
                  ))
                )}
              </div>
              <div className="px-5 pt-2 pb-5">
                <PrimaryButton
                  onClick={() => {
                    setShowDetail(true)
                    fetchReport()
                  }}
                  disabled={loading}
                >
                  Generate Report
                </PrimaryButton>
              </div>
            </Card>
          </div>

          {showAll && (
          <div>
            <SectionTitle>Subject Grades</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {report.subjects.map(s => (
                <GradeCard key={s.subject} {...s} />
              ))}
            </div>
          </div>
          )}

          {showAll && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card padded={false}>
              <div className="px-5 pt-5">
                <SectionTitle>Hours By Category</SectionTitle>
              </div>
              <div className="px-2 pt-2 pb-4">
                <HoursByCategoryChart data={report.charts.subject_hours} />
              </div>
            </Card>
            <Card padded={false}>
              <div className="px-5 pt-5">
                <SectionTitle>Skill Profile</SectionTitle>
              </div>
              <div className="px-2 pt-2 pb-4">
                <SubjectRadar data={report.charts.radar} />
              </div>
            </Card>
          </div>
          )}

          {showAll && report.improvement_plans.length > 0 && (
            <div>
              <SectionTitle>How To Level Up</SectionTitle>
              <div className="mt-3 space-y-3">
                {report.improvement_plans.map(p => (
                  <LevelUpPlanDropdown
                    key={p.subject}
                    plan={p}
                    open={openPlans.has(p.subject)}
                    onToggle={() => togglePlan(p.subject)}
                  />
                ))}
              </div>
            </div>
          )}

          {showAll && report.analysis?.summary && (
            <Card>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-ht-orange" strokeWidth={2} />
                <SectionTitle>Coach Note</SectionTitle>
              </div>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-ht-ink">
                {report.analysis.summary}
              </p>
              {report.analysis.next_steps?.length > 0 && (
                <div className="mt-4 border-t border-ht-line-soft pt-4">
                  <p className="ht-heading text-[12px] tracking-[0.06em] text-ht-muted">Next Steps</p>
                  <ul className="mt-2 space-y-1.5 text-[14.5px] text-ht-ink">
                    {report.analysis.next_steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-ht-muted">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
