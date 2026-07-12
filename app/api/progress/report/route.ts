export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

type Period = 'week' | 'month' | 'year'

interface SubjectScore {
  subject: string
  score: number
  letter: string
  hours: number
  trend: 'up' | 'down' | 'flat'
  prevScore: number | null
}

const SUBJECT_CATEGORIES: Record<string, string[]> = {
  Shooting: ['Shooting', 'Finishing', 'Triple Threat'],
  'Ball Handling': ['Ball Handling'],
  Footwork: ['Footwork', 'Speed & Agility'],
  Defense: ['Defense'],
  Conditioning: ['Strength & Conditioning'],
}

function letterFromScore(s: number): string {
  if (s >= 97) return 'A+'
  if (s >= 93) return 'A'
  if (s >= 90) return 'A-'
  if (s >= 87) return 'B+'
  if (s >= 83) return 'B'
  if (s >= 80) return 'B-'
  if (s >= 77) return 'C+'
  if (s >= 73) return 'C'
  if (s >= 70) return 'C-'
  if (s >= 60) return 'D'
  return 'F'
}

function gpaFromLetter(l: string): number {
  const m: Record<string, number> = {
    'A+': 4.0, A: 4.0, 'A-': 3.7,
    'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0, 'C-': 1.7,
    D: 1.0, F: 0,
  }
  return m[l] ?? 0
}

function periodBounds(period: Period): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date()
  const start = new Date(end)
  if (period === 'week') start.setDate(end.getDate() - 7)
  else if (period === 'month') start.setMonth(end.getMonth() - 1)
  else start.setFullYear(end.getFullYear() - 1)

  const prevEnd = new Date(start)
  const prevStart = new Date(prevEnd)
  if (period === 'week') prevStart.setDate(prevEnd.getDate() - 7)
  else if (period === 'month') prevStart.setMonth(prevEnd.getMonth() - 1)
  else prevStart.setFullYear(prevEnd.getFullYear() - 1)

  return { start, end, prevStart, prevEnd }
}

interface RecordingRow {
  id: number
  duration_seconds: number
  rep_count: number | null
  recorded_at: string
  category: string
}

function categoryScore(rows: RecordingRow[], categories: string[], periodStart: Date, periodEnd: Date): { score: number; hours: number } {
  const inPeriod = rows.filter((r) => {
    if (!categories.includes(r.category)) return false
    const d = new Date(r.recorded_at)
    return d >= periodStart && d <= periodEnd
  })
  const totalSec = inPeriod.reduce((s, r) => s + (r.duration_seconds || 0), 0)
  const hours = totalSec / 3600

  // Volume score: 0 hours = 0, 5 hours = 70, 15 hours = 90, 30+ hours = 100
  let score = 0
  if (hours <= 0) score = 0
  else if (hours < 1) score = 50
  else if (hours < 5) score = 60 + (hours / 5) * 15  // 60-75
  else if (hours < 15) score = 75 + ((hours - 5) / 10) * 15  // 75-90
  else if (hours < 30) score = 90 + ((hours - 15) / 15) * 8  // 90-98
  else score = 99

  // Recency bonus: any recordings in last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recent = inPeriod.some((r) => new Date(r.recorded_at) >= sevenDaysAgo)
  if (recent && score < 100) score = Math.min(100, score + 2)

  return { score: Math.round(score), hours: Math.round(hours * 10) / 10 }
}

function consistencyScore(scheduleRows: { scheduled_date: string; completed: number }[], periodStart: Date, periodEnd: Date, streakDays: number): number {
  const inPeriod = scheduleRows.filter((s) => {
    const d = new Date(s.scheduled_date)
    return d >= periodStart && d <= periodEnd
  })
  if (inPeriod.length === 0) {
    // No schedule? Score from streak alone
    return Math.min(100, streakDays * 8)
  }
  const completed = inPeriod.filter((s) => s.completed).length
  const ratio = completed / inPeriod.length
  let score = ratio * 100
  // Streak bonus
  if (streakDays >= 7) score = Math.min(100, score + 5)
  return Math.round(score)
}

function effortScore(totalHours: number): number {
  // 0h = 0, 2h = 50, 10h = 80, 25h = 95, 50h+ = 100
  if (totalHours <= 0) return 0
  if (totalHours < 1) return 30
  if (totalHours < 5) return 50 + (totalHours / 5) * 25  // 50-75
  if (totalHours < 15) return 75 + ((totalHours - 5) / 10) * 15  // 75-90
  if (totalHours < 40) return 90 + ((totalHours - 15) / 25) * 8  // 90-98
  return 99
}

function hoursToReachLetter(currentHours: number, currentScore: number, currentSubject: string): { targetLetter: string; targetHours: number; addHours: number; minutesPerDay: number; weeks: number } | null {
  // Find threshold for next letter grade up
  const targets = [
    { score: 70, letter: 'C-' },
    { score: 73, letter: 'C' },
    { score: 77, letter: 'C+' },
    { score: 80, letter: 'B-' },
    { score: 83, letter: 'B' },
    { score: 87, letter: 'B+' },
    { score: 90, letter: 'A-' },
    { score: 93, letter: 'A' },
  ]
  const next = targets.find((t) => t.score > currentScore)
  if (!next) return null

  // Approximate hours needed for each subject
  // Reverse-engineered from categoryScore curve
  function inverseCategoryScore(targetScore: number): number {
    if (targetScore <= 60) return 1
    if (targetScore <= 75) return 1 + ((targetScore - 60) / 15) * 4  // -> 5
    if (targetScore <= 90) return 5 + ((targetScore - 75) / 15) * 10  // -> 15
    if (targetScore < 100) return 15 + ((targetScore - 90) / 8) * 15  // -> 30
    return 30
  }
  function inverseEffortScore(targetScore: number): number {
    if (targetScore <= 50) return 1
    if (targetScore <= 75) return 1 + ((targetScore - 50) / 25) * 4
    if (targetScore <= 90) return 5 + ((targetScore - 75) / 15) * 10
    if (targetScore < 100) return 15 + ((targetScore - 90) / 8) * 25
    return 40
  }

  const targetHours = currentSubject === 'Effort'
    ? inverseEffortScore(next.score)
    : inverseCategoryScore(next.score)
  const addHours = Math.max(0.5, Math.round((targetHours - currentHours) * 10) / 10)
  const weeks = 4
  const minutesPerDay = Math.round((addHours * 60) / (weeks * 7))

  return {
    targetLetter: next.letter,
    targetHours: Math.round(targetHours * 10) / 10,
    addHours,
    minutesPerDay,
    weeks,
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const playerIdParam = searchParams.get('playerId')
  const playerId = playerIdParam ? parseInt(playerIdParam) : session.id
  const period = (searchParams.get('period') as Period) || 'month'

  // Trainers can view any player; players only themselves
  if (session.role !== 'trainer' && playerId !== session.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const player = db.prepare('SELECT id, name FROM users WHERE id = ?').get(playerId) as { id: number; name: string } | undefined
  if (!player) return Response.json({ error: 'Player not found' }, { status: 404 })

  const { start, end, prevStart, prevEnd } = periodBounds(period)

  // Fetch all recordings with category
  const recordings = db.prepare(`
    SELECT r.id, r.duration_seconds, r.rep_count, r.recorded_at, d.category
    FROM recordings r
    JOIN drills d ON d.id = r.drill_id
    WHERE r.player_id = ?
  `).all(playerId) as RecordingRow[]

  // Schedule for consistency
  const schedule = db.prepare(
    'SELECT scheduled_date, completed FROM schedule WHERE player_id = ?'
  ).all(playerId) as { scheduled_date: string; completed: number }[]

  // Quiz average for IQ
  const quizRow = db.prepare(
    'SELECT AVG(score) as avg, COUNT(*) as cnt FROM quiz_attempts WHERE player_id = ? AND completed_at >= ?'
  ).get(playerId, start.toISOString()) as { avg: number | null; cnt: number }
  const quizAverage = Math.round(quizRow.avg || 0)
  const iqScore = quizRow.cnt > 0 ? quizAverage : 0

  // Streak
  const completedDates = db.prepare(
    'SELECT scheduled_date FROM schedule WHERE player_id = ? AND completed = 1 ORDER BY scheduled_date DESC'
  ).all(playerId) as { scheduled_date: string }[]
  let streakDays = 0
  let checkDate = new Date().toISOString().split('T')[0]
  for (const { scheduled_date } of completedDates) {
    if (scheduled_date === checkDate) {
      streakDays++
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().split('T')[0]
    } else break
  }

  // Compute subject scores
  const subjects: SubjectScore[] = []
  let totalHours = 0
  const hoursBySubject: Record<string, number> = {}

  for (const [subject, cats] of Object.entries(SUBJECT_CATEGORIES)) {
    const cur = categoryScore(recordings, cats, start, end)
    const prev = categoryScore(recordings, cats, prevStart, prevEnd)
    totalHours += cur.hours
    hoursBySubject[subject] = cur.hours
    const trend: 'up' | 'down' | 'flat' = cur.score > prev.score + 2 ? 'up' : cur.score < prev.score - 2 ? 'down' : 'flat'
    subjects.push({
      subject,
      score: cur.score,
      letter: letterFromScore(cur.score),
      hours: cur.hours,
      trend,
      prevScore: prev.score,
    })
  }

  // IQ
  subjects.push({
    subject: 'Basketball IQ',
    score: iqScore,
    letter: letterFromScore(iqScore),
    hours: 0,
    trend: 'flat',
    prevScore: null,
  })

  // Consistency
  const consScore = consistencyScore(schedule, start, end, streakDays)
  subjects.push({
    subject: 'Consistency',
    score: consScore,
    letter: letterFromScore(consScore),
    hours: 0,
    trend: 'flat',
    prevScore: null,
  })

  // Effort (Hours)
  const effort = effortScore(totalHours)
  subjects.push({
    subject: 'Effort',
    score: effort,
    letter: letterFromScore(effort),
    hours: Math.round(totalHours * 10) / 10,
    trend: 'flat',
    prevScore: null,
  })

  // GPA
  const gpaSum = subjects.reduce((s, x) => s + gpaFromLetter(x.letter), 0)
  const gpa = Math.round((gpaSum / subjects.length) * 10) / 10
  const overallLetter = letterFromScore(subjects.reduce((s, x) => s + x.score, 0) / subjects.length)

  // Strengths and weaknesses
  const sorted = [...subjects].sort((a, b) => b.score - a.score)
  const strongest = sorted.slice(0, 3).map((s) => s.subject)
  const weakest = sorted.slice(-3).reverse().map((s) => s.subject)

  // Hours-by-week chart series (last 8 weeks)
  const weeklyHours: { week: string; hours: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() - i * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 7)
    const sec = recordings
      .filter((r) => {
        const d = new Date(r.recorded_at)
        return d >= weekStart && d < weekEnd
      })
      .reduce((s, r) => s + r.duration_seconds, 0)
    weeklyHours.push({
      week: weekEnd.toISOString().slice(5, 10),
      hours: Math.round((sec / 3600) * 10) / 10,
    })
  }

  // Hours-by-subject chart
  const subjectHoursChart = Object.entries(hoursBySubject).map(([subject, hours]) => ({ subject, hours }))

  // Radar chart data
  const radarData = subjects.map((s) => ({ subject: s.subject, score: s.score, fullMark: 100 }))

  // Improvement plans for weak subjects (only ones with hours data)
  const improvementPlans = subjects
    .filter((s) => weakest.includes(s.subject) && s.score < 87)
    .map((s) => ({
      subject: s.subject,
      currentScore: s.score,
      currentLetter: s.letter,
      currentHours: s.hours,
      plan: hoursToReachLetter(s.hours, s.score, s.subject === 'Effort' ? 'Effort' : 'Subject'),
    }))
    .filter((p) => p.plan)

  const analysis = {
    summary: recordings.length > 0
      ? `${player.name} logged ${recordings.length} session${recordings.length === 1 ? '' : 's'} with ${Math.round(totalHours * 10) / 10} total training hours this ${period}.`
      : `${player.name} does not have recorded training data for this ${period} yet.`,
    strengths: strongest.map((subject) => `${subject}: ${subjects.find((s) => s.subject === subject)?.letter ?? 'N/A'}`),
    areas_to_improve: weakest.map((subject) => `${subject}: add focused reps to raise the grade.`),
    next_steps: improvementPlans.length > 0
      ? improvementPlans.slice(0, 3).map((plan) => (
          `${plan.subject}: add ${plan.plan?.minutesPerDay ?? 10} minutes per day for ${plan.plan?.weeks ?? 4} weeks.`
        ))
      : ['Record a short skill session, assign it to a category, then review the next report.'],
    motivation_level: totalHours >= 5 || streakDays >= 3 ? 'high' : totalHours > 0 ? 'medium' : 'low',
  }

  return Response.json({
    player: { id: player.id, name: player.name },
    period,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    gpa,
    overall_letter: overallLetter,
    total_hours: Math.round(totalHours * 10) / 10,
    streak_days: streakDays,
    total_recordings: recordings.length,
    subjects,
    strongest,
    weakest,
    charts: {
      weekly_hours: weeklyHours,
      subject_hours: subjectHoursChart,
      radar: radarData,
    },
    improvement_plans: improvementPlans,
    analysis,
  })
}
