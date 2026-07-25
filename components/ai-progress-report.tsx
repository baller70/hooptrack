'use client'

import Link from 'next/link'
import { Award, ChevronRight, Sparkles } from 'lucide-react'

export default function AIProgressReport({ playerId }: { playerId?: number }) {
  const href = playerId ? `/dashboard/progress?playerId=${playerId}` : '/dashboard/progress'

  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-ht-line bg-ht-surface p-5 transition-colors hover:bg-ht-orange-tint/60"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ht-orange-soft">
        <Award className="size-6 text-ht-orange" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ht-heading flex items-center gap-2 text-[17px] tracking-[0.01em] text-ht-ink">
          Progress Report
          <Sparkles className="size-4 text-ht-orange" strokeWidth={2} />
        </span>
        <span className="mt-1 block text-[14px] leading-6 text-ht-muted">
          Letter grades, hours practiced, charts, and a coaching plan to level up.
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
    </Link>
  )
}
