'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  Hash,
  Loader2,
  Mic,
  Play,
  Repeat,
  Square as SquareIcon,
  Timer,
  Type,
  Volume2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, PrimaryButton, SectionTitle } from '@/components/ht/primitives'
import type { RecorderTimerMode, RecorderOptions } from '@/components/video-recorder'

/**
 * The session-options surface for the record screen: timer mode, rep target,
 * eye-training overlays and audio cues. It resolves the drill the recording
 * will hang off (an attached drill, or the personal Free Play drill) and hands
 * the finished settings back to the recorder.
 */

interface DrillOption {
  id: number
  name: string
  workout_title: string | null
  category: string
}

export interface ResolvedDrill {
  id: number
  name: string
  duration_seconds: number
  timer_mode: 'timed' | 'stopwatch' | 'reps'
  target_reps: number | null
  coach_name?: string | null
}

export interface PRData {
  previous_seconds: number | null
  best_seconds: number | null
  previous_reps: number | null
  best_reps: number | null
}

const DEFAULT_REACTION_WORDS = ['LEFT', 'RIGHT', 'SHOOT', 'PASS', 'CROSS', 'FAKE', 'GO', 'STOP']

export default function RecordSetup({
  onApply,
  initialDrillId = null,
}: {
  /** Receives the resolved drill plus the settings the recorder should run. */
  onApply: (payload: { drill: ResolvedDrill; pr: PRData; options: RecorderOptions }) => void
  initialDrillId?: number | null
}) {
  const [drills, setDrills] = useState<DrillOption[]>([])
  const [attachDrill, setAttachDrill] = useState(initialDrillId != null)
  const [drillId, setDrillId] = useState<number | null>(initialDrillId)
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

  useEffect(() => {
    let cancelled = false
    fetch('/api/drills/options', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { drills?: DrillOption[] }) => {
        if (cancelled) return
        // The personal "Free Play" drill is the fallback, not a pickable drill.
        const filtered = (d.drills ?? []).filter(
          (dr) => !(dr.name === 'Free Play Session' && dr.workout_title === 'Free Play'),
        )
        setDrills(filtered)
        setDrillId((current) => current ?? filtered[0]?.id ?? null)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingDrills(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function apply() {
    if (mode === 'timed' && duration < 1) {
      toast.error('Duration must be at least 1 second')
      return
    }
    if (mode === 'reps' && targetReps < 1) {
      toast.error('Target reps must be at least 1')
      return
    }
    if (mode === 'interval' && (intervalWork < 1 || intervalRest < 0 || intervalRounds < 1)) {
      toast.error('Check interval values')
      return
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

      onApply({ drill, pr, options: opts })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to apply settings')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drill — optional */}
      <Card>
        <SectionTitle>Drill</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Segment active={!attachDrill} onClick={() => setAttachDrill(false)} label="Free Play" />
          <Segment active={attachDrill} onClick={() => setAttachDrill(true)} label="Attach a Drill" />
        </div>
        {attachDrill ? (
          <div className="mt-3">
            {loadingDrills && drills.length === 0 ? (
              <p className="flex items-center gap-1.5 text-[13px] text-ht-muted">
                <Loader2 className="size-3.5 animate-spin" /> Loading drills…
              </p>
            ) : drills.length === 0 ? (
              <p className="text-[13px] text-ht-muted">
                No drills yet — build a workout with drills first, or stick with Free Play.
              </p>
            ) : (
              <select
                value={drillId ?? ''}
                onChange={(e) => setDrillId(parseInt(e.target.value))}
                className="h-11 w-full rounded-lg border border-ht-line bg-white px-3 text-[14px] text-ht-ink"
              >
                {drills.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.workout_title ? ` — ${d.workout_title}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="mt-3 text-[13px] leading-5 text-ht-muted">
            Recordings save to your personal Free Play library — no drill needed.
          </p>
        )}
      </Card>

      {/* Time-based modes */}
      <Card>
        <SectionTitle>Time</SectionTitle>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ModeButton active={mode === 'timed'} onClick={() => setMode('timed')} icon={Timer} label="Timed" />
          <ModeButton active={mode === 'stopwatch'} onClick={() => setMode('stopwatch')} icon={Play} label="Stopwatch" />
          <ModeButton active={mode === 'interval'} onClick={() => setMode('interval')} icon={Activity} label="Interval" />
        </div>

        {mode === 'timed' ? (
          <div className="mt-3">
            <FieldLabel>Duration (seconds)</FieldLabel>
            <NumberField value={duration} min={1} onChange={(n) => setDuration(n || 60)} />
            <p className="mt-1.5 text-[12.5px] text-ht-muted">3-2-1 audio lead-in. Buzzer at the end.</p>
          </div>
        ) : null}
        {mode === 'stopwatch' ? (
          <p className="mt-3 text-[12.5px] text-ht-muted">Open-ended — counts up until you tap Stop.</p>
        ) : null}
        {mode === 'interval' ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Work (s)</FieldLabel>
              <NumberField value={intervalWork} min={1} onChange={(n) => setIntervalWork(n || 30)} />
            </div>
            <div>
              <FieldLabel>Rest (s)</FieldLabel>
              <NumberField value={intervalRest} min={0} onChange={(n) => setIntervalRest(n || 0)} />
            </div>
            <div>
              <FieldLabel>Rounds</FieldLabel>
              <NumberField value={intervalRounds} min={1} onChange={(n) => setIntervalRounds(n || 1)} />
            </div>
          </div>
        ) : null}
      </Card>

      {/* Reps */}
      <Card>
        <SectionTitle>Reps</SectionTitle>
        <div className="mt-3">
          <ModeButton
            active={mode === 'reps'}
            onClick={() => setMode('reps')}
            icon={Repeat}
            label="Count to a target"
            full
          />
        </div>
        {mode === 'reps' ? (
          <div className="mt-3">
            <FieldLabel>How many reps?</FieldLabel>
            <NumberField value={targetReps} min={1} onChange={(n) => setTargetReps(n || 10)} />
            <p className="mt-1.5 text-[12.5px] text-ht-muted">
              Tap Save Rep on the record screen for each rep. Auto-stops at the target.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] leading-5 text-ht-muted">
            Switch to rep counting when the number of reps matters more than the clock.
          </p>
        )}
      </Card>

      {/* Eye-training overlays */}
      <CollapseCard
        title="Eye-training overlays"
        icon={Eye}
        on={numberFlashOn || reactionPromptsOn || colorFlashOn || eyeLevelGuide}
        open={showVisualCues}
        onToggle={() => setShowVisualCues(!showVisualCues)}
      >
        <p className="text-[12.5px] leading-5 text-ht-muted">
          These filters appear on the record window and are burned into the saved video. Use them to
          test eyes-up reactions, peripheral vision and focus while the player performs.
        </p>
        <ToggleRow
          icon={Hash}
          kicker="Filter option 1"
          label="Number flash filter"
          hint="A random number from 1-9 appears in a corner of the recording window. The player calls it out while continuing the drill."
          on={numberFlashOn}
          onChange={setNumberFlashOn}
          extra={numberFlashOn ? <SecondsInput value={numberFlashEvery} onChange={setNumberFlashEvery} label="every" /> : null}
        />
        <ToggleRow
          icon={Type}
          kicker="Filter option 2"
          label="Reaction word filter"
          hint="A random command appears on the recording window. Use it for live reads like LEFT, RIGHT, SHOOT, PASS or CROSS."
          on={reactionPromptsOn}
          onChange={setReactionPromptsOn}
          extra={
            reactionPromptsOn ? (
              <div className="space-y-2">
                <SecondsInput value={reactionEvery} onChange={setReactionEvery} label="every" />
                <TextField
                  value={reactionWords}
                  onChange={setReactionWords}
                  placeholder="LEFT, RIGHT, SHOOT…"
                />
              </div>
            ) : null
          }
        />
        <ToggleRow
          icon={SquareIcon}
          kicker="Filter option 3"
          label="Color flash filter"
          hint="A colored block flashes in a corner of the recording window. Use it to train peripheral vision and quick visual recognition."
          on={colorFlashOn}
          onChange={setColorFlashOn}
          extra={colorFlashOn ? <SecondsInput value={colorFlashEvery} onChange={setColorFlashEvery} label="every" /> : null}
        />
        <ToggleRow
          icon={Eye}
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
        icon={Volume2}
        on={metronomeOn || voiceOn}
        open={showAudioCues}
        onToggle={() => setShowAudioCues(!showAudioCues)}
      >
        <ToggleRow
          icon={Activity}
          label="Metronome"
          hint="Clicks on the beat for rhythm work."
          on={metronomeOn}
          onChange={setMetronomeOn}
          extra={
            metronomeOn ? (
              <div className="flex items-center gap-2">
                <NumberField value={metronomeBpm} min={40} max={240} onChange={(n) => setMetronomeBpm(n || 120)} className="w-24" />
                <span className="text-[12.5px] text-ht-muted">BPM</span>
              </div>
            ) : null
          }
        />
        <ToggleRow
          icon={Mic}
          label="Voice cues"
          hint="Random spoken commands, using the browser's speech synthesis."
          on={voiceOn}
          onChange={setVoiceOn}
          extra={
            voiceOn ? (
              <div className="space-y-2">
                <SecondsInput value={voiceEvery} onChange={setVoiceEvery} label="every" />
                <TextField value={voiceWords} onChange={setVoiceWords} placeholder="switch, shoot, explode…" />
              </div>
            ) : null
          }
        />
      </CollapseCard>

      <PrimaryButton onClick={apply} disabled={starting} className="py-4">
        {starting ? <Loader2 className="size-5 animate-spin" /> : null}
        Apply Session Settings
      </PrimaryButton>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-medium text-ht-ink">{children}</label>
}

function NumberField({
  value,
  min,
  max,
  onChange,
  className,
}: {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={cn(
        'h-11 w-full rounded-lg border border-ht-line bg-white px-3 text-[14px] text-ht-ink',
        'focus:border-ht-orange focus:outline-none',
        className,
      )}
    />
  )
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-ht-line bg-white px-3 text-[13px] text-ht-ink focus:border-ht-orange focus:outline-none"
    />
  )
}

function Segment({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'ht-heading rounded-lg px-3 py-3 text-[13px] tracking-[0.03em] transition-colors',
        active
          ? 'bg-ht-orange text-white'
          : 'border border-ht-line bg-white text-ht-ink hover:bg-ht-chip/60',
      )}
    >
      {label}
    </button>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  full = false,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
  full?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'ht-heading flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-[12.5px] tracking-[0.03em] transition-colors',
        full ? 'w-full flex-row' : 'flex-col',
        active
          ? 'bg-ht-orange text-white'
          : 'border border-ht-line bg-white text-ht-ink hover:bg-ht-chip/60',
      )}
    >
      <Icon className="size-4" strokeWidth={2} />
      {label}
    </button>
  )
}

function CollapseCard({
  title,
  icon: Icon,
  on,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: LucideIcon
  on: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card padded={false} className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-ht-chip/50"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-ht-ink" strokeWidth={2} />
          <SectionTitle>{title}</SectionTitle>
          {on ? (
            <span className="ht-heading rounded bg-ht-orange px-1.5 py-0.5 text-[10px] text-white">On</span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-ht-muted" strokeWidth={2} />
        ) : (
          <ChevronDown className="size-4 text-ht-muted" strokeWidth={2} />
        )}
      </button>
      {open ? <div className="space-y-3 border-t border-ht-line-soft px-5 py-4">{children}</div> : null}
    </Card>
  )
}

function ToggleRow({
  icon: Icon,
  kicker,
  label,
  hint,
  on,
  onChange,
  extra,
}: {
  icon: LucideIcon
  kicker?: string
  label: string
  hint: string
  on: boolean
  onChange: (value: boolean) => void
  extra?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border p-3',
        on ? 'border-ht-orange/40 bg-ht-orange-soft' : 'border-ht-line bg-white',
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-4 accent-[#FE4800]"
        />
        <span className="flex-1">
          {kicker ? (
            <span className="ht-heading mb-1 block text-[10px] tracking-[0.08em] text-ht-muted">{kicker}</span>
          ) : null}
          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ht-ink">
            <Icon className="size-3.5" strokeWidth={2} />
            {label}
          </span>
          <span className="mt-1 block text-[12.5px] leading-5 text-ht-muted">{hint}</span>
        </span>
      </label>
      {extra ? <div className="pl-7">{extra}</div> : null}
    </div>
  )
}

function SecondsInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12.5px] text-ht-muted">{label}</span>
      <NumberField value={value} min={1} max={60} onChange={(n) => onChange(n || 5)} className="w-20" />
      <span className="text-[12.5px] text-ht-muted">seconds</span>
    </div>
  )
}
