'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DRILL_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import TimerModeFields, { TimerMode } from '@/components/timer-mode-fields'

interface DrillInput {
  name: string
  description: string
  category: string
  duration_seconds: number
  timer_mode: TimerMode
  target_reps: number | null
  rest_seconds: number
}

const NEW_DRILL_DEFAULT: DrillInput = {
  name: '',
  description: '',
  category: DRILL_CATEGORIES[0],
  duration_seconds: 60,
  timer_mode: 'timed',
  target_reps: null,
  rest_seconds: 0,
}

export default function CreateWorkoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(DRILL_CATEGORIES[0])
  const [useSessionTimer, setUseSessionTimer] = useState(false)
  const [sessionMode, setSessionMode] = useState<TimerMode>('timed')
  const [sessionDuration, setSessionDuration] = useState(1800)
  const [drills, setDrills] = useState<DrillInput[]>([])
  const [newDrill, setNewDrill] = useState<DrillInput>({ ...NEW_DRILL_DEFAULT })

  function addDrill() {
    if (!newDrill.name.trim()) {
      toast.error('Drill name is required')
      return
    }
    if (newDrill.timer_mode === 'reps' && (!newDrill.target_reps || newDrill.target_reps < 1)) {
      toast.error('Set a target rep count')
      return
    }
    setDrills([...drills, { ...newDrill }])
    setNewDrill({ ...NEW_DRILL_DEFAULT, category })
  }

  function removeDrill(index: number) {
    setDrills(drills.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Workout title is required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          timer_mode: useSessionTimer ? sessionMode : null,
          duration_seconds: useSessionTimer && sessionMode === 'timed' ? sessionDuration : null,
          drills,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Failed to create workout')
        return
      }
      toast.success('Workout created!')
      router.push('/dashboard/workouts')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function describeDrill(d: DrillInput) {
    if (d.timer_mode === 'timed') return `${d.duration_seconds}s · ${d.category}`
    if (d.timer_mode === 'reps') return `${d.target_reps} reps · ${d.category}`
    return `Stopwatch · ${d.category}`
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link href="/dashboard/workouts" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6">Create Workout</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 space-y-4">
          <div>
            <Label htmlFor="title">Workout Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning Shooting Drills" />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              {DRILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional session-level timer wrapping the whole workout */}
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useSessionTimer}
              onChange={(e) => setUseSessionTimer(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="font-semibold">Add a session timer (whole workout)</span>
          </label>
          {useSessionTimer && (
            <TimerModeFields
              mode={sessionMode}
              durationSeconds={sessionDuration}
              targetReps={0}
              onModeChange={setSessionMode}
              onDurationChange={setSessionDuration}
              onTargetRepsChange={() => {}}
              allowReps={false}
            />
          )}
        </div>

        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6">
          <h3 className="font-[family-name:var(--font-russo)] text-lg mb-4">Drills</h3>

          {drills.length > 0 && (
            <div className="space-y-2 mb-4">
              {drills.map((drill, index) => (
                <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">{drill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {describeDrill(drill)}
                      {drill.rest_seconds > 0 ? ` · ${drill.rest_seconds}s rest` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeDrill(index)} className="text-destructive p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <div>
              <Label>Drill Name</Label>
              <Input
                value={newDrill.name}
                onChange={(e) => setNewDrill({ ...newDrill, name: e.target.value })}
                placeholder="e.g. Crossover Series"
              />
            </div>

            <TimerModeFields
              mode={newDrill.timer_mode}
              durationSeconds={newDrill.duration_seconds}
              targetReps={newDrill.target_reps ?? 10}
              onModeChange={(m) => setNewDrill({ ...newDrill, timer_mode: m })}
              onDurationChange={(s) => setNewDrill({ ...newDrill, duration_seconds: s })}
              onTargetRepsChange={(r) => setNewDrill({ ...newDrill, target_reps: r })}
            />

            <div>
              <Label>Rest after drill (seconds)</Label>
              <Input
                type="number"
                min={0}
                value={newDrill.rest_seconds}
                onChange={(e) => setNewDrill({ ...newDrill, rest_seconds: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Drill Description (optional)</Label>
              <Input
                value={newDrill.description}
                onChange={(e) => setNewDrill({ ...newDrill, description: e.target.value })}
                placeholder="Instructions for this drill..."
              />
            </div>
            <div>
              <Label>Drill Category</Label>
              <select
                value={newDrill.category}
                onChange={(e) => setNewDrill({ ...newDrill, category: e.target.value })}
                className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
              >
                {DRILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={addDrill} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Drill
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating...' : 'Create Workout'}
        </Button>
      </form>
    </div>
  )
}
