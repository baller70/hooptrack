import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import RecordClient from './record-client'
import RecordSetup from '@/components/record-setup'

interface Drill {
  id: number
  name: string
  duration_seconds: number
  timer_mode: 'timed' | 'stopwatch' | 'reps'
  target_reps: number | null
}

interface PRData {
  previous_seconds: number | null
  best_seconds: number | null
  previous_reps: number | null
  best_reps: number | null
}

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ drillId?: string; workoutId?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { drillId, workoutId } = await searchParams

  // No drillId → setup screen
  if (!drillId) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-4">Record</h2>
        <RecordSetup />
      </div>
    )
  }

  // drillId provided → existing drill-driven flow
  const drill = db.prepare(
    'SELECT id, name, duration_seconds, timer_mode, target_reps FROM drills WHERE id = ?'
  ).get(drillId) as Drill | undefined
  if (!drill) notFound()

  const history = db.prepare(
    'SELECT duration_seconds, rep_count FROM recordings WHERE drill_id = ? AND player_id = ? ORDER BY recorded_at DESC'
  ).all(drill.id, session.id) as Array<{ duration_seconds: number; rep_count: number | null }>

  const pr: PRData = {
    previous_seconds: history[0]?.duration_seconds ?? null,
    best_seconds: history.length > 0 ? Math.min(...history.map((h) => h.duration_seconds)) : null,
    previous_reps: history[0]?.rep_count ?? null,
    best_reps: history.some((h) => h.rep_count != null)
      ? Math.max(...history.filter((h) => h.rep_count != null).map((h) => h.rep_count as number))
      : null,
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Link
        href={workoutId ? `/dashboard/workouts/${workoutId}` : '/dashboard/workouts'}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6 text-center">{drill.name}</h2>
      <RecordClient drill={drill} pr={pr} />
    </div>
  )
}
