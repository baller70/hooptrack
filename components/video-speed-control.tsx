'use client'

import { Gauge } from 'lucide-react'

const SPEEDS = [1, 0.75, 0.5, 0.25] as const

interface Props {
  rate: number
  onChange: (rate: number) => void
  compact?: boolean
}

export default function VideoSpeedControl({ rate, onChange, compact = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-1 bg-white/95 border-2 border-black rounded-md ${compact ? 'p-0.5' : 'p-1'} shadow-[2px_2px_0px_0px_#0A0A0A]`}>
      <Gauge className={`${compact ? 'h-3 w-3 mx-1' : 'h-3.5 w-3.5 mx-1'} text-muted-foreground shrink-0`} />
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} rounded font-semibold transition-colors ${
            rate === s ? 'bg-black text-white' : 'text-foreground hover:bg-gray-100'
          }`}
          aria-label={`${s}x speed`}
        >
          {s === 1 ? '1x' : `${s}x`}
        </button>
      ))}
    </div>
  )
}

export const SPEED_OPTIONS = SPEEDS
