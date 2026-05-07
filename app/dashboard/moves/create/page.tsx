'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DRILL_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import YouTubeClipper from '@/components/youtube-clipper'
import TimerModeFields, { TimerMode } from '@/components/timer-mode-fields'
import VideoSpeedControl from '@/components/video-speed-control'

interface Player {
  id: number
  name: string
}

export default function CreateMovePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [clipStart, setClipStart] = useState(0)
  const [clipEnd, setClipEnd] = useState(0)
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch')
  const [durationSeconds, setDurationSeconds] = useState(60)
  const [targetReps, setTargetReps] = useState(10)
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState(1)
  const [form, setForm] = useState<{
    title: string
    youtube_url: string
    category: string
    description: string
    assigned_to_player_id: string
  }>({
    title: '',
    youtube_url: '',
    category: DRILL_CATEGORIES[0],
    description: '',
    assigned_to_player_id: '',
  })

  useEffect(() => {
    fetch('/api/players')
      .then((r) => r.json())
      .then((d) => setPlayers(d.players || []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.youtube_url) {
      toast.error('Title and YouTube URL are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          youtube_url: form.youtube_url,
          category: form.category,
          description: form.description,
          assigned_to_player_id: form.assigned_to_player_id ? parseInt(form.assigned_to_player_id) : undefined,
          clip_start: clipStart > 0 ? clipStart : undefined,
          clip_end: clipEnd > 0 && clipEnd !== clipStart ? clipEnd : undefined,
          video_type: 'youtube',
          timer_mode: timerMode,
          duration_seconds: timerMode === 'timed' ? durationSeconds : null,
          target_reps: timerMode === 'reps' ? targetReps : null,
          default_playback_rate: defaultPlaybackRate,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Failed to create move')
        return
      }
      toast.success('Move added!')
      router.push('/dashboard/moves')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link href="/dashboard/moves" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6">Add YouTube Move</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Kyrie Irving Crossover" />
          </div>

          <div>
            <Label>YouTube URL</Label>
            <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
          </div>

          {/* YouTube Clipper with drag handles */}
          {form.youtube_url && (
            <YouTubeClipper
              url={form.youtube_url}
              onClipChange={(start, end) => {
                setClipStart(start)
                setClipEnd(end)
              }}
            />
          )}

          <div>
            <Label>Category</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              {DRILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes about this move..." />
          </div>

          <TimerModeFields
            mode={timerMode}
            durationSeconds={durationSeconds}
            targetReps={targetReps}
            onModeChange={setTimerMode}
            onDurationChange={setDurationSeconds}
            onTargetRepsChange={setTargetReps}
          />

          <div>
            <Label>Default playback speed for player</Label>
            <div className="mt-1">
              <VideoSpeedControl rate={defaultPlaybackRate} onChange={setDefaultPlaybackRate} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Player can override on their end. Pick slower for moves that need careful study.
            </p>
          </div>

          <div>
            <Label>Assign to Player (optional)</Label>
            <select
              value={form.assigned_to_player_id}
              onChange={(e) => setForm({ ...form, assigned_to_player_id: e.target.value })}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All players</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Adding...' : 'Add Move'}
        </Button>
      </form>
    </div>
  )
}
