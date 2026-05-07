'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import TimerModeFields, { TimerMode } from '@/components/timer-mode-fields'

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

interface QuestionInput {
  question_text: string
  video_url: string
  options: string[]
  correct_answer: string
}

export default function CreateQuizPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'multiple_choice' | 'video_based' | 'mixed'>('mixed')
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch')
  const [durationSeconds, setDurationSeconds] = useState(300)
  const [position, setPosition] = useState('any')
  const [situation, setSituation] = useState('any')
  const [questions, setQuestions] = useState<QuestionInput[]>([])
  const [newQ, setNewQ] = useState<QuestionInput>({
    question_text: '',
    video_url: '',
    options: ['', '', '', ''],
    correct_answer: '',
  })

  function addQuestion() {
    if (!newQ.question_text) {
      toast.error('Question text is required')
      return
    }
    const validOptions = newQ.options.filter((o) => o.trim())
    if (validOptions.length < 2) {
      toast.error('At least 2 options are required')
      return
    }
    if (!newQ.correct_answer) {
      toast.error('Select the correct answer')
      return
    }
    setQuestions([...questions, { ...newQ, options: validOptions }])
    setNewQ({ question_text: '', video_url: '', options: ['', '', '', ''], correct_answer: '' })
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title) {
      toast.error('Quiz title is required')
      return
    }
    if (questions.length === 0) {
      toast.error('Add at least one question')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          timer_mode: timerMode,
          duration_seconds: timerMode === 'timed' ? durationSeconds : null,
          position: position === 'any' ? null : position,
          game_situation: situation === 'any' ? null : situation,
          questions,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Failed to create quiz')
        return
      }
      toast.success('Quiz created!')
      router.push('/dashboard/classroom')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link href="/dashboard/classroom" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6">Create Quiz</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 space-y-4">
          <div>
            <Label>Quiz Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Game Situation Quiz #1" />
          </div>
          <div>
            <Label>Quiz Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="video_based">Video Based</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position focus (optional)</Label>
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
              <Label>Game situation (optional)</Label>
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

          <TimerModeFields
            mode={timerMode}
            durationSeconds={durationSeconds}
            targetReps={0}
            onModeChange={setTimerMode}
            onDurationChange={setDurationSeconds}
            onTargetRepsChange={() => {}}
            allowReps={false}
          />
        </div>

        {/* Added questions */}
        {questions.length > 0 && (
          <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4">
            <h3 className="font-semibold mb-3">Questions ({questions.length})</h3>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{q.question_text}</p>
                    <p className="text-xs text-muted-foreground">Correct: {q.correct_answer}</p>
                  </div>
                  <button type="button" onClick={() => removeQuestion(i)} className="text-destructive p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New question form */}
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 space-y-4">
          <h3 className="font-semibold">Add Question</h3>

          <div>
            <Label>Question Text</Label>
            <Textarea
              value={newQ.question_text}
              onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })}
              placeholder="What should the player do in this situation?"
            />
          </div>

          <div>
            <Label>Video URL (optional)</Label>
            <Input
              value={newQ.video_url}
              onChange={(e) => setNewQ({ ...newQ, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            {newQ.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={newQ.correct_answer === opt && opt !== ''}
                  onChange={() => setNewQ({ ...newQ, correct_answer: opt })}
                  className="accent-hoop-orange"
                />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const opts = [...newQ.options]
                    opts[i] = e.target.value
                    const updates: Partial<QuestionInput> = { options: opts }
                    if (newQ.correct_answer === opt) updates.correct_answer = e.target.value
                    setNewQ({ ...newQ, ...updates })
                  }}
                  placeholder={`Option ${i + 1}`}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
          </div>

          <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating...' : 'Create Quiz'}
        </Button>
      </form>
    </div>
  )
}
