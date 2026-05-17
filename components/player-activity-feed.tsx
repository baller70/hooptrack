'use client'

import { useEffect, useState } from 'react'
import { Video, Award, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import EntityChat from '@/components/entity-chat'
import AdaptiveVideo from '@/components/adaptive-video'

type ActivityKind = 'recording' | 'quiz_attempt' | 'schedule_completed' | 'schedule_overdue'

interface ActivityItem {
  kind: ActivityKind
  at: string
  title: string
  subtitle?: string
  link?: string
  meta?: { recordingId?: number; hasVideo?: boolean; score?: number }
}

interface Props {
  playerId: number
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function iconFor(kind: ActivityKind) {
  if (kind === 'recording') return <Video className="h-4 w-4" />
  if (kind === 'quiz_attempt') return <Award className="h-4 w-4" />
  if (kind === 'schedule_completed') return <CheckCircle2 className="h-4 w-4 text-green-600" />
  return <AlertCircle className="h-4 w-4 text-red-600" />
}

export default function PlayerActivityFeed({ playerId }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openVideoId, setOpenVideoId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const r = await fetch(`/api/players/${playerId}/activity`, { cache: 'no-store' })
        const d = await r.json()
        if (!cancelled) setItems(d.items || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  if (loading) {
    return (
      <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-6 text-center text-sm text-muted-foreground">
        No activity yet.
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] divide-y-2 divide-gray-100">
      {items.map((it, idx) => {
        const recId = it.meta?.recordingId
        const hasVideo = it.meta?.hasVideo
        const isOpen = recId != null && openVideoId === recId
        return (
          <div key={idx} className="p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{iconFor(it.kind)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-sm truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground shrink-0">{relTime(it.at)}</p>
                </div>
                {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                {it.kind === 'recording' && hasVideo && recId != null && (
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-hoop-orange hover:underline"
                    onClick={() => setOpenVideoId(isOpen ? null : recId)}
                  >
                    {isOpen ? 'Hide video' : 'Play video'}
                  </button>
                )}
              </div>
            </div>
            {isOpen && recId != null && (
              <div className="mt-3">
                <AdaptiveVideo
                  src={`/api/recordings/${recId}/video`}
                  controls
                  playsInline
                  autoPlay
                />
                <div className="mt-2 border-2 border-gray-200 rounded-lg overflow-hidden">
                  <EntityChat
                    contextType="recording"
                    contextId={recId}
                    contextTitle={it.title}
                    compact
                    embedded
                    defaultOpen
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
