'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ht/primitives'

/**
 * The "OVERALL <letter>" card from 013-coach-player-profile-review-raw.png.
 * The grade is computed by /api/progress/report, so it is fetched client-side
 * rather than duplicating that scoring model here.
 */
export default function OverallGrade({ playerId }: { playerId: number }) {
  const [letter, setLetter] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/progress/report?playerId=${playerId}&period=month`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { overall_letter?: string } | null) => {
        if (!cancelled) setLetter(d?.overall_letter ?? null)
      })
      .catch(() => {
        // The grade is supplementary — a failed fetch shows "—", never breaks the page.
        if (!cancelled) setLetter(null)
      })
    return () => {
      cancelled = true
    }
  }, [playerId])

  return (
    <Card className="shrink-0 px-4 py-3 text-center">
      <div className="ht-heading text-[11px] tracking-[0.04em] text-ht-ink">Overall</div>
      <div className="ht-num mt-1.5 text-[34px] leading-none text-ht-orange">
        {letter ?? '—'}
      </div>
    </Card>
  )
}
