import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import RecordClient from './record-client'
import { appPath, appForRole } from '@/lib/app-routes'
import type { PRData, ResolvedDrill } from '@/components/record-setup'

/* Implements design/hooptrack-raw-individual-screens/ios/008-player-live-recording-raw.png */

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ drillId?: string; workoutId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { drillId, workoutId } = await searchParams
  const app = appForRole(session.role)

  let drill: ResolvedDrill | null = null
  let pr: PRData | undefined

  if (drillId) {
    drill =
      (db
        .prepare(
          `SELECT d.id, d.name, d.duration_seconds, d.timer_mode, d.target_reps, u.name AS coach_name
           FROM drills d
           JOIN workouts w ON w.id = d.workout_id
           LEFT JOIN users u ON u.id = w.created_by
           WHERE d.id = ?`,
        )
        .get(drillId) as ResolvedDrill | undefined) ?? null
    if (!drill) notFound()

    const history = db
      .prepare(
        'SELECT duration_seconds, rep_count FROM recordings WHERE drill_id = ? AND player_id = ? ORDER BY recorded_at DESC',
      )
      .all(drill.id, session.id) as Array<{ duration_seconds: number; rep_count: number | null }>

    pr = {
      previous_seconds: history[0]?.duration_seconds ?? null,
      best_seconds: history.length > 0 ? Math.min(...history.map((h) => h.duration_seconds)) : null,
      previous_reps: history[0]?.rep_count ?? null,
      best_reps: history.some((h) => h.rep_count != null)
        ? Math.max(...history.filter((h) => h.rep_count != null).map((h) => h.rep_count as number))
        : null,
    }
  }

  const backHref = workoutId ? appPath(app, `/workouts/${workoutId}`) : appPath(app, '/capture')

  return (
    <div className="pt-2">
      <div className="relative flex items-center justify-center py-1">
        <Link
          href={backHref}
          aria-label="Back"
          className="absolute left-0 rounded-lg p-1.5 text-ht-ink hover:bg-ht-chip"
        >
          <ChevronLeft className="size-7" strokeWidth={2} />
        </Link>
        <h1 className="ht-display text-[26px] leading-none text-ht-ink">Live Recording</h1>
      </div>

      <div className="mt-4">
        <RecordClient drill={drill} pr={pr} />
      </div>
    </div>
  )
}
