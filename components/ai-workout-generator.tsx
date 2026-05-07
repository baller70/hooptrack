'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DRILL_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'

export default function AIWorkoutGenerator() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [duration, setDuration] = useState(30)
  const [focusAreas, setFocusAreas] = useState<string[]>([DRILL_CATEGORIES[0]])

  function toggleFocus(cat: string) {
    setFocusAreas(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  async function generate() {
    if (focusAreas.length === 0) {
      toast.error('Select at least one focus area')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillLevel, duration, focusAreas, autoSave: true }),
      })
      const data = await res.json()
      if (res.status === 401) {
        toast.error('Session expired. Please log in again.')
        setTimeout(() => { window.location.href = '/login' }, 1000)
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setOpen(false)
      toast.success(`AI created "${data.workout.title}" with ${data.workout.drills?.length || 0} drills!`)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate workout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 bg-purple-600 hover:bg-purple-700" data-testid="ai-workout-btn">
        <Sparkles className="h-4 w-4" />
        AI Generate
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Workout Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Skill Level</Label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as typeof skillLevel)}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} min={10} max={120} />
          </div>

          <div>
            <Label>Focus Areas (select one or more)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {DRILL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleFocus(cat)}
                  className={`text-xs px-3 py-2 rounded-lg border-2 transition-all ${
                    focusAreas.includes(cat)
                      ? 'border-purple-600 bg-purple-50 text-purple-700 font-medium'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={loading} className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate & Save Workout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
