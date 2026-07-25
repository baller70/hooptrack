'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import FilmReview, { type Recording } from '@/components/film-review'

/* Standalone film-review screen — ios/015-coach-film-review-raw.png.
 * Reached from the 014 feed as /coach/film?clip=<recordingId>. */

export default function FilmReviewClient() {
  const searchParams = useSearchParams()
  const requested = Number.parseInt(searchParams.get('clip') ?? '', 10)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/recordings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { recordings: [] }))
      .then((json) => {
        if (!cancelled) setRecordings(json.recordings ?? [])
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load clips')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ?clip= wins; otherwise review the newest clip that has a runtime, since a
  // zero-second row gives the player and phase strip nothing to show.
  const clip = useMemo(() => {
    if (Number.isInteger(requested)) {
      const match = recordings.find((r) => r.id === requested)
      if (match) return match
    }
    return recordings.find((r) => r.duration_seconds > 0) ?? recordings[0] ?? null
  }, [recordings, requested])

  return (
    <div className="mt-5 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
      <FilmReview clip={clip} loading={loading} />
    </div>
  )
}
