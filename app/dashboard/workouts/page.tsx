import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { Plus, Dumbbell, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DRILL_CATEGORIES } from '@/lib/constants'
import AIWorkoutGenerator from '@/components/ai-workout-generator'
import LibraryTabs from '@/components/library-tabs'

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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <LibraryTabs />
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-russo)] text-2xl">Workouts</h2>
        {session?.role === 'trainer' && (
          <div className="flex items-center gap-2">
            <AIWorkoutGenerator />
            <Link
              href="/dashboard/workouts/create"
              className="flex items-center gap-1 bg-hoop-orange text-white px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </div>
        )}
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No workouts yet.</p>
          {session?.role === 'trainer' && <p className="text-sm mt-1">Create your first workout to get started.</p>}
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h3 className="font-[family-name:var(--font-russo)] text-lg mb-3 text-hoop-black">{category}</h3>
          <div className="grid gap-3">
            {items.map((workout) => (
              <Link
                key={workout.id}
                href={`/dashboard/workouts/${workout.id}`}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] hover:shadow-[1px_1px_0px_0px_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-lg">{workout.title}</h4>
                    {workout.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{workout.description}</p>
                    )}
                    {workout.last_completed_at && (
                      <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
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
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
