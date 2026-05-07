'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export type TimerMode = 'timed' | 'stopwatch' | 'reps'

interface Props {
  mode: TimerMode
  durationSeconds: number
  targetReps: number
  onModeChange: (m: TimerMode) => void
  onDurationChange: (s: number) => void
  onTargetRepsChange: (r: number) => void
  allowReps?: boolean
  compact?: boolean
}

const MODES: { value: TimerMode; label: string; help: string }[] = [
  { value: 'timed', label: 'Timed', help: 'Countdown for a fixed duration' },
  { value: 'stopwatch', label: 'Stopwatch', help: 'Open-ended, user stops when done' },
  { value: 'reps', label: 'Reps', help: 'Count up to a target number' },
]

export default function TimerModeFields({
  mode,
  durationSeconds,
  targetReps,
  onModeChange,
  onDurationChange,
  onTargetRepsChange,
  allowReps = true,
  compact = false,
}: Props) {
  const modes = allowReps ? MODES : MODES.filter((m) => m.value !== 'reps')

  return (
    <div className="space-y-3">
      <div>
        <Label>Timer Mode</Label>
        <div className={`grid gap-2 ${modes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {modes.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onModeChange(m.value)}
              className={`border-2 rounded-md px-3 py-2 text-sm font-semibold transition-all ${
                mode === m.value
                  ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_#0A0A0A]'
                  : 'border-input bg-background hover:border-black'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1">
            {modes.find((m) => m.value === mode)?.help}
          </p>
        )}
      </div>

      {mode === 'timed' && (
        <div>
          <Label>Duration (seconds)</Label>
          <Input
            type="number"
            min={1}
            value={durationSeconds}
            onChange={(e) => onDurationChange(parseInt(e.target.value) || 60)}
          />
        </div>
      )}

      {mode === 'reps' && (
        <div>
          <Label>Target Reps</Label>
          <Input
            type="number"
            min={1}
            value={targetReps}
            onChange={(e) => onTargetRepsChange(parseInt(e.target.value) || 10)}
            placeholder="e.g. 100"
          />
        </div>
      )}

      {mode === 'stopwatch' && !compact && (
        <p className="text-xs text-muted-foreground italic">
          Open-ended — counts up until the player stops.
        </p>
      )}
    </div>
  )
}
