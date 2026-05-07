import { TrendingUp, TrendingDown, Minus, Crosshair, CircleDot, Footprints, ShieldCheck, Dumbbell, BrainCircuit, CalendarCheck, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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

function letterColor(letter: string): string {
  if (letter.startsWith('A')) return 'text-green-700'
  if (letter.startsWith('B')) return 'text-blue-700'
  if (letter.startsWith('C')) return 'text-yellow-700'
  if (letter === 'D') return 'text-orange-700'
  return 'text-red-700'
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
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-5 w-5 shrink-0" />
          <h4 className="font-semibold text-sm truncate">{subject}</h4>
        </div>
        <TrendIcon className={`h-4 w-4 shrink-0 ${trendColor}`} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-[family-name:var(--font-russo)] text-4xl ${letterColor(letter)}`}>{letter}</span>
        <span className="text-xs text-muted-foreground">{score}/100</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-black rounded-full"
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      {hours > 0 && (
        <p className="text-xs text-muted-foreground">{hours} hrs this period</p>
      )}
    </div>
  )
}
