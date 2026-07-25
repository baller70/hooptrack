'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { CameraOff, Loader2, X } from 'lucide-react'
import RecordSetup, { type PRData, type ResolvedDrill } from '@/components/record-setup'
import { Card, EmptyState, SectionTitle } from '@/components/ht/primitives'
import type { RecorderOptions } from '@/components/video-recorder'

const VideoRecorder = dynamic(() => import('@/components/video-recorder'), { ssr: false })

const NO_PR: PRData = {
  previous_seconds: null,
  best_seconds: null,
  previous_reps: null,
  best_reps: null,
}

/**
 * Implements design/hooptrack-raw-individual-screens/ios/008-player-live-recording-raw.png.
 * The recorder is the screen; session options live in a sheet reached from the
 * drill card, so the live layout stays exactly as designed.
 */
export default function RecordClient({
  drill: initialDrill,
  pr: initialPr,
}: {
  drill?: ResolvedDrill | null
  pr?: PRData
}) {
  const [drill, setDrill] = useState<ResolvedDrill | null>(initialDrill ?? null)
  const [pr, setPr] = useState<PRData>(initialPr ?? NO_PR)
  const [options, setOptions] = useState<RecorderOptions | undefined>(undefined)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No drill in the URL means a free session: resolve (or create) the player's
  // own Free Play drill so the recording always has a valid drill_id.
  useEffect(() => {
    if (drill) return
    let cancelled = false
    fetch('/api/drills/free-play', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as { drill?: ResolvedDrill; error?: string }
        if (!res.ok || !data.drill) throw new Error(data.error || 'Could not start a session.')
        if (!cancelled) setDrill(data.drill)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start a session.')
      })
    return () => {
      cancelled = true
    }
  }, [drill])

  if (error) {
    return (
      <Card className="mx-auto mt-4 max-w-[560px]">
        <EmptyState icon={CameraOff} title="Session unavailable" body={error} />
      </Card>
    )
  }

  if (!drill) {
    return (
      <div className="mx-auto mt-8 flex max-w-[560px] items-center justify-center gap-2 text-ht-muted">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-[14px]">Preparing your session…</span>
      </div>
    )
  }

  return (
    <>
      <VideoRecorder
        key={`${drill.id}-${options ? 'custom' : 'default'}`}
        drill={drill}
        pr={pr}
        options={options}
        onOpenOptions={() => setSheetOpen(true)}
      />

      {sheetOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/40" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close session options"
            className="flex-1"
            onClick={() => setSheetOpen(false)}
          />
          <div className="max-h-[88vh] overflow-y-auto rounded-t-2xl bg-ht-canvas px-5 pb-8 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Session Options</SectionTitle>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ht-muted hover:bg-ht-chip"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>
            <RecordSetup
              initialDrillId={initialDrill?.id ?? null}
              onApply={({ drill: nextDrill, pr: nextPr, options: nextOptions }) => {
                setDrill(nextDrill)
                setPr(nextPr)
                setOptions(nextOptions)
                setSheetOpen(false)
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
