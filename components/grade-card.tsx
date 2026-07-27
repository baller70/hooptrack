import {
  BrainCircuit,
  CalendarCheck,
  CircleDot,
  Clock,
  Crosshair,
  Dumbbell,
  Footprints,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* Subject tile for design/hooptrack-raw-individual-screens/ios/
 * 011-player-progress-report-raw.png — grades read in brand orange there, so
 * the letter is not colour-coded by band. */

const SUBJECT_ICON: Record<string, LucideIcon> = {
  Shooting: Crosshair,
  'Ball Handling': CircleDot,
  Footwork: Footprints,
  Defense: ShieldCheck,
  Conditioning: Dumbbell,
  'Basketball IQ': BrainCircuit,
  Consistency: CalendarCheck,
  Effort: Clock,
}

interface Props {
  subject: string
  score: number
  letter: string
  hours: number
  trend: 'up' | 'down' | 'flat'
}

export default function GradeCard({ subject, score, letter, hours, trend }: Props) {
  const Icon = SUBJECT_ICON[subject] || Crosshair
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-ht-green' : trend === 'down' ? 'text-ht-red' : 'text-ht-muted'

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ht-line bg-ht-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-[18px] shrink-0 text-ht-ink" strokeWidth={1.7} />
          <h4 className="truncate text-[14px] font-medium text-ht-ink">{subject}</h4>
        </div>
        <TrendIcon className={`size-4 shrink-0 ${trendColor}`} strokeWidth={2} />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="ht-num text-[32px] leading-none text-ht-orange">{letter}</span>
        <span className="text-[12.5px] text-ht-muted">{score}/100</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ht-ring">
        <div
          className="h-full rounded-full bg-ht-orange"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      {hours > 0 && <p className="text-[12.5px] text-ht-muted">{hours} hrs this period</p>}
    </div>
  )
}
