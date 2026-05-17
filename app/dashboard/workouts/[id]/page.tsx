import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Video, Clock, Repeat, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import DeleteWorkoutButton from '@/components/delete-workout-button'
import DuplicateWorkoutDialog from '@/components/duplicate-workout-dialog'
import EntityChat from '@/components/entity-chat'
import RecordingsList from '@/components/recordings-list'
import EditableWorkoutTitle from '@/components/editable-workout-title'
import EditableDrillName from '@/components/editable-drill-name'

interface Workout {
  id: number
  title: string
  description: string | null
  category: string
  created_by: number
  timer_mode: string | null
  duration_seconds: number | null
}

interface Drill {
  id: number
  workout_id: number
  name: string
  description: string | null
  category: string
  duration_seconds: number
  drill_order: number
  timer_mode: string
  target_reps: number | null
  rest_seconds: number
}

function formatDrillSpec(d: Drill) {
  if (d.timer_mode === 'reps') return { icon: 'reps', text: `${d.target_reps ?? '–'} reps` }
  if (d.timer_mode === 'stopwatch') return { icon: 'sw', text: 'Stopwatch' }
  return { icon: 'time', text: `${d.duration_seconds}s` }
}

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id) as Workout | undefined
  if (!workout) notFound()

  const drills = db.prepare('SELECT * FROM drills WHERE workout_id = ? ORDER BY drill_order').all(id) as Drill[]

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Link href="/dashboard/workouts" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Workouts
      </Link>

      <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] mb-6 overflow-hidden">
        <div className="p-6 flex items-start justify-between gap-3">
          <div>
            <Badge className="mb-2">{workout.category}</Badge>
            {session?.role === 'trainer' ? (
              <EditableWorkoutTitle workoutId={workout.id} initialTitle={workout.title} />
            ) : (
              <h2 className="font-[family-name:var(--font-russo)] text-2xl">{workout.title}</h2>
            )}
            {workout.description && (
              <p className="text-muted-foreground mt-1">{workout.description}</p>
            )}
            {workout.timer_mode && (
              <p className="text-xs text-muted-foreground mt-2">
                Session timer: <strong className="capitalize">{workout.timer_mode}</strong>
                {workout.timer_mode === 'timed' && workout.duration_seconds ? ` · ${Math.round(workout.duration_seconds / 60)} min` : ''}
              </p>
            )}
          </div>
          {session?.role === 'trainer' && (
            <div className="flex flex-col gap-2 shrink-0">
              <DuplicateWorkoutDialog workoutId={workout.id} workoutTitle={workout.title} />
              <DeleteWorkoutButton workoutId={workout.id} />
            </div>
          )}
        </div>
        <EntityChat contextType="workout" contextId={workout.id} contextTitle={workout.title} embedded />
      </div>

      <h3 className="font-[family-name:var(--font-russo)] text-lg mb-3">Drills ({drills.length})</h3>

      {drills.length === 0 && (
        <p className="text-muted-foreground text-sm">No drills added yet.</p>
      )}

      <div className="grid gap-3">
        {drills.map((drill) => {
          const spec = formatDrillSpec(drill)
          const Icon = spec.icon === 'reps' ? Repeat : spec.icon === 'sw' ? Timer : Clock
          return (
            <div key={drill.id} className="bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#0A0A0A] overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  {session?.role === 'trainer' ? (
                    <EditableDrillName drillId={drill.id} initialName={drill.name} />
                  ) : (
                    <h4 className="font-semibold">{drill.name}</h4>
                  )}
                  {drill.description && (
                    <p className="text-sm text-muted-foreground">{drill.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{spec.text}</span>
                    {drill.rest_seconds > 0 && <span>· {drill.rest_seconds}s rest</span>}
                    <span>· {drill.category}</span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/record?drillId=${drill.id}&workoutId=${workout.id}`}
                  className="flex items-center gap-1 bg-hoop-orange text-white px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Video className="h-4 w-4" />
                  Record
                </Link>
              </div>
              <RecordingsList drillId={drill.id} drillName={drill.name} embedded viewerRole={session?.role === 'trainer' ? 'trainer' : 'player'} />
              <EntityChat contextType="drill" contextId={drill.id} contextTitle={drill.name} compact embedded />
            </div>
          )
        })}
      </div>
    </div>
  )
}
