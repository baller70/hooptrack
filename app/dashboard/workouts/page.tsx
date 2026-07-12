import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Dumbbell, Plus, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DRILL_CATEGORIES } from '@/lib/constants'
import AIWorkoutGenerator from '@/components/ai-workout-generator'
import {
  EmptyWorkspaceState,
  StatTile,
  TrainingWorkspaceShell,
  WorkspaceActionLink,
  WorkspacePanel,
} from '@/components/training-workspace-shell'
import DeleteWorkoutButton from '@/components/delete-workout-button'

interface Workout {
  id: number
  title: string
  description: string | null
  category: string
  created_by: number
  creator_name: string
  drill_count: number
  created_at: string
  last_completed_at: string | null
  completion_count: number
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function WorkoutsPage() {
  const session = await getSession()

  // Players see their own completion history; trainers see the most-recent
  // completion across all of their players.
  const isPlayer = session?.role === 'player'
  const filterPlayerId = isPlayer ? (session?.id ?? null) : null

  const workouts = db.prepare(`
    SELECT w.*, u.name as creator_name,
      (SELECT COUNT(*) FROM drills d WHERE d.workout_id = w.id) as drill_count,
      (SELECT MAX(completed_at) FROM schedule s
         WHERE s.workout_id = w.id AND s.completed = 1
           AND (? IS NULL OR s.player_id = ?)
      ) as last_completed_at,
      (SELECT COUNT(*) FROM schedule s
         WHERE s.workout_id = w.id AND s.completed = 1
           AND (? IS NULL OR s.player_id = ?)
      ) as completion_count
    FROM workouts w
    JOIN users u ON u.id = w.created_by
    ORDER BY w.category, w.created_at DESC
  `).all(filterPlayerId, filterPlayerId, filterPlayerId, filterPlayerId) as Workout[]

  const grouped = DRILL_CATEGORIES.reduce((acc, cat) => {
    const items = workouts.filter(w => w.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, Workout[]>)
  const categoryCount = Object.keys(grouped).length
  const drillCount = workouts.reduce((sum, workout) => sum + workout.drill_count, 0)
  const completedCount = workouts.reduce((sum, workout) => sum + workout.completion_count, 0)

  return (
    <TrainingWorkspaceShell
      active="workouts"
      title="Workouts"
      description="Organize drills into plans players can follow. Start here when the next training session needs structure."
      primary={session?.role === 'trainer' && (
        <>
          <AIWorkoutGenerator />
          <Link
            href="/dashboard/workouts/create"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-black bg-hoop-orange px-4 text-sm font-bold text-white shadow-[2px_2px_0px_0px_#0A0A0A] hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create workout
          </Link>
        </>
      )}
      stats={
        <>
          <StatTile label="Workouts" value={workouts.length} />
          <StatTile label="Categories" value={categoryCount} />
          <StatTile label="Drills" value={drillCount} />
          <StatTile label="Completed" value={completedCount} />
        </>
      }
      sidebar={
        <>
          <WorkspaceActionLink
            href="/dashboard/capture"
            icon={Video}
            title="Capture a rep"
            body="Record the player first, then attach the best clip to a workout or review."
          />
          <WorkspaceActionLink
            href="/calendar/index.html"
            icon={CalendarDays}
            title="Schedule the plan"
            body="Put the workout on the calendar so the next session has a clear assignment."
          />
        </>
      }
    >
      <WorkspacePanel
        title="Workout library"
        description="Grouped by training category so coaches and players can scan the plan quickly."
      >
        {Object.keys(grouped).length === 0 ? (
          <EmptyWorkspaceState
            icon={Dumbbell}
            title="No workouts yet"
            body={session?.role === 'trainer' ? 'Create a workout with a few drills so players know exactly what to do next.' : 'Your coach has not assigned a workout library yet.'}
            action={session?.role === 'trainer' && (
              <Link
                href="/dashboard/workouts/create"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-hoop-black px-4 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Create workout
              </Link>
            )}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-russo)] text-lg text-hoop-black">{category}</h3>
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{items.length} plans</span>
                </div>
                <div className="divide-y-2 divide-gray-100 rounded-lg border-2 border-black bg-white">
                  {items.map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-orange-50"
                    >
                      <Link
                        href={`/dashboard/workouts/${workout.id}`}
                        className="min-w-0 flex-1"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-lg leading-tight">{workout.title}</h4>
                            {workout.description && (
                              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{workout.description}</p>
                            )}
                            {workout.last_completed_at && (
                              <p className="mt-2 flex items-center gap-1 text-xs text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                {isPlayer ? 'Last completed' : 'Last completion'} {formatRelativeDate(workout.last_completed_at)}
                                {workout.completion_count > 1 && (
                                  <span className="text-muted-foreground">· {workout.completion_count} times</span>
                                )}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">{workout.drill_count} drills</Badge>
                        </div>
                      </Link>
                      {session?.role === 'trainer' && (
                        <DeleteWorkoutButton
                          workoutId={workout.id}
                          workoutTitle={workout.title}
                          afterDelete="refresh"
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </WorkspacePanel>
    </TrainingWorkspaceShell>
  )
}
