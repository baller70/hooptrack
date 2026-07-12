'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Video, Timer, Play, Repeat, Activity, Eye, Volume2, ChevronDown, ChevronUp,
  Loader2, Mic, Hash, Type, Square as SquareIcon, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { RecorderTimerMode, RecorderOptions } from '@/components/video-recorder'

const VideoRecorder = dynamic(() => import('@/components/video-recorder'), { ssr: false })

interface DrillOption {
  id: number
  name: string
  workout_title: string | null
  category: string
}

interface ResolvedDrill {
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

const DEFAULT_REACTION_WORDS = ['LEFT', 'RIGHT', 'SHOOT', 'PASS', 'CROSS', 'FAKE', 'GO', 'STOP']

export default function RecordSetup() {
  const [drills, setDrills] = useState<DrillOption[]>([])
  const [attachDrill, setAttachDrill] = useState(false) // free play by default
  const [drillId, setDrillId] = useState<number | null>(null)
  const [loadingDrills, setLoadingDrills] = useState(true)
  const [starting, setStarting] = useState(false)

  // Mode + values
  const [mode, setMode] = useState<RecorderTimerMode>('timed')
  const [duration, setDuration] = useState(60)
  const [targetReps, setTargetReps] = useState(20)
  const [intervalWork, setIntervalWork] = useState(30)
  const [intervalRest, setIntervalRest] = useState(15)
  const [intervalRounds, setIntervalRounds] = useState(8)

  // Visual cues
  const [showVisualCues, setShowVisualCues] = useState(false)
  const [numberFlashOn, setNumberFlashOn] = useState(false)
  const [numberFlashEvery, setNumberFlashEvery] = useState(4)
  const [reactionPromptsOn, setReactionPromptsOn] = useState(false)
  const [reactionEvery, setReactionEvery] = useState(5)
  const [reactionWords, setReactionWords] = useState(DEFAULT_REACTION_WORDS.join(', '))
  const [colorFlashOn, setColorFlashOn] = useState(false)
  const [colorFlashEvery, setColorFlashEvery] = useState(3)
  const [eyeLevelGuide, setEyeLevelGuide] = useState(false)

  // Audio cues
  const [showAudioCues, setShowAudioCues] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [metronomeBpm, setMetronomeBpm] = useState(120)
  const [voiceOn, setVoiceOn] = useState(false)
  const [voiceEvery, setVoiceEvery] = useState(6)
  const [voiceWords, setVoiceWords] = useState(DEFAULT_REACTION_WORDS.join(', '))

  // Started
  const [recording, setRecording] = useState<{ drill: ResolvedDrill; pr: PRData; options: RecorderOptions } | null>(null)

  useEffect(() => {
    setLoadingDrills(true)
    fetch('/api/drills/options', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list: DrillOption[] = d.drills || []
        // Hide the user's own "Free Play" drill from the picker (created lazily; if it exists)
        const filtered = list.filter((dr) => !(dr.name === 'Free Play Session' && dr.workout_title === 'Free Play'))
        setDrills(filtered)
        if (filtered.length > 0) setDrillId(filtered[0].id)
      })
      .finally(() => setLoadingDrills(false))
  }, [])

  async function start() {
    if (mode === 'timed' && duration < 1) { toast.error('Duration must be at least 1 second'); return }
    if (mode === 'reps' && targetReps < 1) { toast.error('Target reps must be at least 1'); return }
    if (mode === 'interval' && (intervalWork < 1 || intervalRest < 0 || intervalRounds < 1)) {
      toast.error('Check interval values'); return
    }
    if (attachDrill && !drillId) {
      toast.error('Pick a drill or switch to Free Play')
      return
    }

    setStarting(true)
    try {
      let drill: ResolvedDrill
      let pr: PRData = { previous_seconds: null, best_seconds: null, previous_reps: null, best_reps: null }

      if (attachDrill && drillId) {
        const r = await fetch(`/api/drills/options?drillId=${drillId}`, { cache: 'no-store' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load drill')
        drill = d.drill
        pr = d.pr
      } else {
        const r = await fetch('/api/drills/free-play', { cache: 'no-store' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not start free play')
        drill = d.drill
      }

      const opts: RecorderOptions = {
        timerMode: mode,
        durationSeconds: duration,
        targetReps,
        intervalWorkSeconds: intervalWork,
        intervalRestSeconds: intervalRest,
        intervalRounds,
        eyeLevelGuide,
      }
      if (numberFlashOn) opts.numberFlash = { intervalSeconds: numberFlashEvery }
      if (reactionPromptsOn) {
        const words = reactionWords.split(/[,\n]/).map((w) => w.trim()).filter(Boolean)
        if (words.length > 0) opts.reactionPrompts = { intervalSeconds: reactionEvery, words }
      }
      if (colorFlashOn) opts.colorFlash = { intervalSeconds: colorFlashEvery }
      if (metronomeOn) opts.metronomeBpm = metronomeBpm
      if (voiceOn) {
        const words = voiceWords.split(/[,\n]/).map((w) => w.trim()).filter(Boolean)
        if (words.length > 0) opts.voiceCues = { intervalSeconds: voiceEvery, words }
      }

      setRecording({ drill, pr, options: opts })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start')
    } finally {
      setStarting(false)
    }
  }

  if (recording) {
    return (
      <VideoRecorder
        drill={recording.drill}
        pr={recording.pr}
        options={recording.options}
        onBack={() => setRecording(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Drill — optional */}
      <SectionCard title="Drill (optional)" icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAttachDrill(false)}
            className={`border-2 rounded-md py-3 px-3 text-sm font-semibold ${!attachDrill ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_#0A0A0A]' : 'border-input bg-background hover:border-black'}`}
          >
            Free Play
          </button>
          <button
            type="button"
            onClick={() => setAttachDrill(true)}
            className={`border-2 rounded-md py-3 px-3 text-sm font-semibold ${attachDrill ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_#0A0A0A]' : 'border-input bg-background hover:border-black'}`}
          >
            Attach a Drill
          </button>
        </div>
        {attachDrill && (
          <div className="mt-3">
            {loadingDrills && drills.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading drills...
              </p>
            ) : drills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No drills yet — create a workout with drills first, or stick with Free Play.
              </p>
            ) : (
              <select
                value={drillId ?? ''}
                onChange={(e) => setDrillId(parseInt(e.target.value))}
                className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
              >
                {drills.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.workout_title ? ` — ${d.workout_title}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {!attachDrill && (
          <p className="text-xs text-muted-foreground mt-3">
            Recordings save to a personal &ldquo;Free Play&rdquo; library — no drill linkage required.
          </p>
        )}
      </SectionCard>

      {/* Time-based modes */}
      <SectionCard title="Time" icon={<Timer className="h-4 w-4" />}>
        <div className="grid grid-cols-3 gap-2">
          <ModeButton active={mode === 'timed'} onClick={() => setMode('timed')} icon={Timer} label="Timed" />
          <ModeButton active={mode === 'stopwatch'} onClick={() => setMode('stopwatch')} icon={Play} label="Stopwatch" />
          <ModeButton active={mode === 'interval'} onClick={() => setMode('interval')} icon={Activity} label="Interval" />
        </div>

        {mode === 'timed' && (
          <div className="mt-3">
            <Label>Duration (seconds)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} />
            <p className="text-xs text-muted-foreground mt-1">3-2-1 audio lead-in. Buzzer at end.</p>
          </div>
        )}
        {mode === 'stopwatch' && (
          <p className="text-xs text-muted-foreground mt-3 italic">Open-ended — counts up until you tap Stop.</p>
        )}
        {mode === 'interval' && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <Label>Work (s)</Label>
              <Input type="number" min={1} value={intervalWork} onChange={(e) => setIntervalWork(parseInt(e.target.value) || 30)} />
            </div>
            <div>
              <Label>Rest (s)</Label>
              <Input type="number" min={0} value={intervalRest} onChange={(e) => setIntervalRest(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Rounds</Label>
              <Input type="number" min={1} value={intervalRounds} onChange={(e) => setIntervalRounds(parseInt(e.target.value) || 1)} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Reps */}
      <SectionCard title="Reps" icon={<Repeat className="h-4 w-4" />}>
        <ModeButton active={mode === 'reps'} onClick={() => setMode('reps')} icon={Repeat} label="Count to a target" full />
        {mode === 'reps' && (
          <div className="mt-3">
            <Label>How many reps?</Label>
            <Input type="number" min={1} value={targetReps} onChange={(e) => setTargetReps(parseInt(e.target.value) || 10)} />
            <p className="text-xs text-muted-foreground mt-1">Tap +1 on screen for each rep. Auto-stops at target.</p>
          </div>
        )}
        {mode !== 'reps' && (
          <p className="text-xs text-muted-foreground mt-3">
            Tap to switch to rep counting. Useful when number of reps matters more than time.
          </p>
        )}
      </SectionCard>

      {/* Eye-training overlays */}
      <CollapseCard
        title="Eye-training overlays"
        icon={<Eye className="h-4 w-4" />}
        on={numberFlashOn || reactionPromptsOn || colorFlashOn || eyeLevelGuide}
        open={showVisualCues}
        onToggle={() => setShowVisualCues(!showVisualCues)}
      >
        <p className="text-xs text-muted-foreground">
          These filters appear on the record window and are saved into the video.
          Use them to test eyes-up reactions, peripheral vision, and focus while the player performs.
        </p>
        <ToggleRow
          icon={<Hash className="h-3.5 w-3.5" />}
          kicker="Filter option 1"
          label="Number flash filter"
          hint="A random number from 1-9 appears in a corner of the recording window. The player calls it out while continuing the drill."
          on={numberFlashOn}
          onChange={setNumberFlashOn}
          extra={numberFlashOn && <SecondsInput value={numberFlashEvery} onChange={setNumberFlashEvery} label="every" />}
        />
        <ToggleRow
          icon={<Type className="h-3.5 w-3.5" />}
          kicker="Filter option 2"
          label="Reaction word filter"
          hint="A random command appears on the recording window. Use it for live reads like LEFT, RIGHT, SHOOT, PASS, or CROSS."
          on={reactionPromptsOn}
          onChange={setReactionPromptsOn}
          extra={reactionPromptsOn && (
            <div className="space-y-1">
              <SecondsInput value={reactionEvery} onChange={setReactionEvery} label="every" />
              <Input value={reactionWords} onChange={(e) => setReactionWords(e.target.value)} placeholder="LEFT, RIGHT, SHOOT..." className="text-xs" />
            </div>
          )}
        />
        <ToggleRow
          icon={<SquareIcon className="h-3.5 w-3.5" />}
          kicker="Filter option 3"
          label="Color flash filter"
          hint="A colored block flashes in a corner of the recording window. Use it to train peripheral vision and quick visual recognition."
          on={colorFlashOn}
          onChange={setColorFlashOn}
          extra={colorFlashOn && <SecondsInput value={colorFlashEvery} onChange={setColorFlashEvery} label="every" />}
        />
        <ToggleRow
          icon={<Eye className="h-3.5 w-3.5" />}
          kicker="Filter option 4"
          label="Eyes-up guide filter"
          hint="A guide mark appears near the top of the recording window so the player has a visual target for keeping their eyes up."
          on={eyeLevelGuide}
          onChange={setEyeLevelGuide}
        />
      </CollapseCard>

      {/* Audio cues */}
      <CollapseCard
        title="Audio cues"
        icon={<Volume2 className="h-4 w-4" />}
        on={metronomeOn || voiceOn}
        open={showAudioCues}
        onToggle={() => setShowAudioCues(!showAudioCues)}
      >
        <ToggleRow
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Metronome"
          hint="Click on the beat for rhythm work"
          on={metronomeOn}
          onChange={setMetronomeOn}
          extra={metronomeOn && (
            <div className="flex items-center gap-2">
              <Input type="number" min={40} max={240} value={metronomeBpm} onChange={(e) => setMetronomeBpm(parseInt(e.target.value) || 120)} className="w-20" />
              <span className="text-xs text-muted-foreground">BPM</span>
            </div>
          )}
        />
        <ToggleRow
          icon={<Mic className="h-3.5 w-3.5" />}
          label="Voice cues"
          hint="Random spoken commands (browser TTS)"
          on={voiceOn}
          onChange={setVoiceOn}
          extra={voiceOn && (
            <div className="space-y-1">
              <SecondsInput value={voiceEvery} onChange={setVoiceEvery} label="every" />
              <Input value={voiceWords} onChange={(e) => setVoiceWords(e.target.value)} placeholder="switch, shoot, explode..." className="text-xs" />
            </div>
          )}
        />
      </CollapseCard>

      <Button
        onClick={start}
        disabled={starting}
        size="lg"
        className="w-full gap-2 bg-red-600 hover:bg-red-700 h-14 text-base"
      >
        {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
        Start Recording Session
      </Button>
    </div>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4">
      <Label className="font-semibold text-sm flex items-center gap-1.5 mb-2">{icon}{title}</Label>
      {children}
    </div>
  )
}

function CollapseCard({ title, icon, on, open, onToggle, children }: { title: string; icon: React.ReactNode; on: boolean; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
        <span className="flex items-center gap-2 font-semibold text-sm">
          {icon}
          {title}
          {on && <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-bold">ON</span>}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t-2 border-gray-100 pt-3">{children}</div>}
    </div>
  )
}

function ModeButton({ active, onClick, icon: Icon, label, full = false }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 px-3 rounded-md border-2 text-xs font-semibold ${
        active
          ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_#0A0A0A]'
          : 'border-input bg-background hover:border-black'
      } ${full ? 'w-full flex-row justify-center' : ''}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function ToggleRow({ icon, kicker, label, hint, on, onChange, extra }: { icon: React.ReactNode; kicker?: string; label: string; hint: string; on: boolean; onChange: (v: boolean) => void; extra?: React.ReactNode }) {
  return (
    <div className={`space-y-2 rounded-lg border-2 p-3 ${on ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4" />
        <div className="flex-1">
          {kicker && (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1">{kicker}</p>
          )}
          <p className="text-sm font-semibold flex items-center gap-1.5">
            {icon}
            {label}
            {on && <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-bold">ON</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</p>
        </div>
      </label>
      {extra && <div className="pl-7">{extra}</div>}
    </div>
  )
}

function SecondsInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input type="number" min={1} max={60} value={value} onChange={(e) => onChange(parseInt(e.target.value) || 5)} className="w-20" />
      <span className="text-xs text-muted-foreground">seconds</span>
    </div>
  )
}
