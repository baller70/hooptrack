'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Award, Clock, Flame, Activity, CheckCircle2, AlertCircle, Target, Sparkles, Loader2, ChevronDown } from 'lucide-react'
import GradeCard from '@/components/grade-card'
import { HoursByCategoryChart, WeeklyHoursChart, SubjectRadar } from '@/components/progress-charts'

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
    subject_hours: { subject: string; hours: number }[]
    radar: { subject: string; score: number; fullMark: number }[]
  }
  improvement_plans: ImprovementPlan[]
  analysis: Analysis | null
}

interface Player { id: number; name: string }

function gpaLetterColor(letter: string): string {
  if (letter.startsWith('A')) return 'text-green-700'
  if (letter.startsWith('B')) return 'text-blue-700'
  if (letter.startsWith('C')) return 'text-yellow-700'
  if (letter === 'D') return 'text-orange-700'
  return 'text-red-700'
}

function scorePercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function hoursPercent(currentHours: number, targetHours: number): number {
  if (targetHours <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((currentHours / targetHours) * 100)))
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
    <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-russo)] text-base">{plan.subject}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tap to see the plan to move from {plan.currentLetter} to {plan.plan.targetLetter}.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`font-[family-name:var(--font-russo)] text-2xl ${gpaLetterColor(plan.currentLetter)}`}>
            {plan.currentLetter}
          </span>
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-gray-100 p-5 pt-4">
          <div className="grid lg:grid-cols-[1fr_220px] gap-5">
            <div>
              <p className="text-sm leading-relaxed">
                Right now this area has <strong>{plan.currentHours} hours</strong>. To reach a{' '}
                <strong>{plan.plan.targetLetter}</strong>, add <strong>{plan.plan.minutesPerDay} minutes per day</strong>{' '}
                for {plan.plan.weeks} weeks. That adds <strong>{plan.plan.addHours} hours</strong> and gets this area
                to roughly <strong>{plan.plan.targetHours} total hours</strong>.
              </p>

              <ul className="text-sm mt-4 space-y-2">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Add <strong>{plan.plan.minutesPerDay} min/day</strong> for {plan.plan.weeks} weeks
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  That is <strong>+{plan.plan.addHours} hours</strong> total
                </li>
                <li className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Target pace: <strong>{plan.plan.targetHours} hours</strong> overall
                </li>
              </ul>
            </div>

            <div className="rounded-lg border-2 border-gray-100 p-4 bg-gray-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Progress graph</p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>Grade score</span>
                    <span>{currentPercent}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-white border border-gray-200 overflow-hidden">
                    <div className="h-full bg-black" style={{ width: `${currentPercent}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>Hours to target</span>
                    <span>{targetPercent}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-white border border-gray-200 overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${targetPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProgressPage() {
  const searchParams = useSearchParams()
  const [period, setPeriod] = useState<Period>('month')
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(searchParams.get('playerId') || '')
  const [userRole, setUserRole] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [openPlans, setOpenPlans] = useState<Set<string>>(() => new Set())

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

  const fetchReport = useCallback(() => {
    setLoading(true)
    let url = `/api/progress/report?period=${period}`
    if (selectedPlayerId) url += `&playerId=${selectedPlayerId}`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setReport(d as Report)
      })
      .finally(() => setLoading(false))
  }, [period, selectedPlayerId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setReport/setLoading are in the async fetch chain
    fetchReport()
  }, [fetchReport])

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="font-[family-name:var(--font-russo)] text-2xl">Progress Report</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {userRole === 'trainer' && (
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="h-9 rounded-md border-2 border-input bg-background px-3 text-sm"
            >
              <option value="">My report</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex border-2 border-black rounded-lg overflow-hidden">
            {(['week', 'month', 'year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize ${period === p ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Building report...
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Report card header */}
          <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6">
            <div className="grid sm:grid-cols-4 gap-4 items-center">
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Player</p>
                <h3 className="font-[family-name:var(--font-russo)] text-2xl">{report.player.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {report.period_start} to {report.period_end} · {report.period}
                </p>
              </div>
              <div className="text-center border-l-0 sm:border-l-2 border-gray-100 sm:pl-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                  <Award className="h-3 w-3" /> Overall
                </p>
                <p className={`font-[family-name:var(--font-russo)] text-5xl ${gpaLetterColor(report.overall_letter)}`}>
                  {report.overall_letter}
                </p>
                <p className="text-xs text-muted-foreground">GPA {report.gpa.toFixed(1)}</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-1 gap-2">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                    <Clock className="h-3 w-3" /> Hours
                  </p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{report.total_hours}</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                    <Flame className="h-3 w-3 text-orange-500" /> Streak
                  </p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{report.streak_days}d</p>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                    <Activity className="h-3 w-3" /> Sessions
                  </p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{report.total_recordings}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject grades grid */}
          <div>
            <h3 className="font-[family-name:var(--font-russo)] text-lg mb-3">Subject Grades</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {report.subjects.map(s => (
                <GradeCard key={s.subject} {...s} />
              ))}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4">
              <h4 className="font-[family-name:var(--font-russo)] text-sm mb-2">Hours by Category</h4>
              <HoursByCategoryChart data={report.charts.subject_hours} />
            </div>
            <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4">
              <h4 className="font-[family-name:var(--font-russo)] text-sm mb-2">Hours per Week (last 8)</h4>
              <WeeklyHoursChart data={report.charts.weekly_hours} />
            </div>
          </div>

          {/* Radar chart full width */}
          <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4">
            <h4 className="font-[family-name:var(--font-russo)] text-sm mb-2 flex items-center gap-1">
              <Target className="h-4 w-4" /> Skill Profile
            </h4>
            <SubjectRadar data={report.charts.radar} />
          </div>

          {/* Strengths + Areas to improve */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-5">
              <h4 className="font-[family-name:var(--font-russo)] text-base mb-3 flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                What You&apos;re Crushing
              </h4>
              {report.analysis?.strengths?.length ? (
                <ul className="space-y-2">
                  {report.analysis.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1 text-sm">
                  {report.strongest.map(s => (
                    <li key={s} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-5">
              <h4 className="font-[family-name:var(--font-russo)] text-base mb-3 flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Keep Grinding
              </h4>
              {report.analysis?.areas_to_improve?.length ? (
                <ul className="space-y-2">
                  {report.analysis.areas_to_improve.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-orange-600" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1 text-sm">
                  {report.weakest.map(s => (
                    <li key={s} className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Improvement plans (hours math) */}
          {report.improvement_plans.length > 0 && (
            <div>
              <h3 className="font-[family-name:var(--font-russo)] text-lg mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" /> How to Level Up
              </h3>
              <div className="space-y-3">
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

          {/* AI Coach Note */}
          {report.analysis?.summary && (
            <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-5">
              <h4 className="font-[family-name:var(--font-russo)] text-base mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Coach Note
              </h4>
              <p className="text-sm leading-relaxed">{report.analysis.summary}</p>
              {report.analysis.next_steps?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Next Steps</p>
                  <ul className="space-y-1 text-sm">
                    {report.analysis.next_steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
