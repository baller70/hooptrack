'use client'

import Link from 'next/link'
import { Award, ArrowRight, Sparkles } from 'lucide-react'

export default function AIProgressReport({ playerId }: { playerId?: number }) {
  const href = playerId ? `/dashboard/progress?playerId=${playerId}` : '/dashboard/progress'

  return (
    <Link
      href={href}
      className="block bg-white border-2 border-black rounded-xl p-5 shadow-[3px_3px_0px_0px_#0A0A0A] hover:shadow-[1px_1px_0px_0px_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
          <Award className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-[family-name:var(--font-russo)] text-lg flex items-center gap-2">
            Progress Report
            <Sparkles className="h-4 w-4 text-purple-600" />
          </h3>
          <p className="text-sm text-muted-foreground">
            Letter grades, hours practiced, charts, and a coaching plan to level up.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
