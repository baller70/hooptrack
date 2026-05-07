'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'any', label: 'Any position' },
  { value: 'point_guard', label: 'Point Guard' },
  { value: 'shooting_guard', label: 'Shooting Guard' },
  { value: 'small_forward', label: 'Small Forward' },
  { value: 'power_forward', label: 'Power Forward' },
  { value: 'center', label: 'Center' },
]

const SITUATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'any', label: 'Any situation' },
  { value: 'late_game', label: 'Late game' },
  { value: 'transition', label: 'Transition' },
  { value: 'half_court_offense', label: 'Half-court offense' },
  { value: 'sideline_oob', label: 'Sideline OOB' },
  { value: 'press_break', label: 'Press break' },
  { value: 'zone_offense', label: 'Zone offense' },
]

export default function AIQuizGenerator() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [position, setPosition] = useState('any')
  const [situation, setSituation] = useState('any')

  async function generate() {
    const hasFocus = position !== 'any' || situation !== 'any'
    if (!topic.trim() && !hasFocus) {
      toast.error('Enter a topic or pick a position / situation')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || 'basketball IQ',
          difficulty,
          questionCount,
          position: position === 'any' ? undefined : position,
          game_situation: situation === 'any' ? undefined : situation,
          autoSave: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      toast.success(`AI created quiz "${data.quiz.title}" with ${data.quiz.questions?.length || 0} questions!`)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 bg-purple-600 hover:bg-purple-700" data-testid="ai-quiz-btn">
        <Sparkles className="h-4 w-4" />
        AI Generate
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Quiz Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Topic / Scenario (optional)</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Pick and roll defense, fast-break decisions"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank if a position or situation is enough.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position</Label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
              >
                {POSITION_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Situation</Label>
              <select
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
              >
                {SITUATION_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Difficulty</Label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <Label>Number of Questions</Label>
            <Input type="number" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)} min={3} max={15} />
          </div>

          <Button onClick={generate} disabled={loading} className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Generate & Save Quiz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
