'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Video, Award, CheckCircle2, Trophy, Loader2, Upload } from 'lucide-react'
import EntityChat from '@/components/entity-chat'
import AdaptiveVideo from '@/components/adaptive-video'

type ActivityKind = 'recording' | 'video_uploaded' | 'quiz_attempt' | 'schedule_completed' | 'pr_set'

interface ActivityItem {
  kind: ActivityKind
  at: string
  player_id: number
  player_name: string
  title: string
  subtitle?: string
  meta?: { recordingId?: number; hasVideo?: boolean; score?: number }
}

interface Player {
  id: number
  name: string
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
  if (kind === 'video_uploaded') return <Upload className="h-4 w-4 text-hoop-orange" />
  if (kind === 'quiz_attempt') return <Award className="h-4 w-4" />
  if (kind === 'pr_set') return <Trophy className="h-4 w-4 text-yellow-600" />
  return <CheckCircle2 className="h-4 w-4 text-green-600" />
}

export default function ActivityFeedClient() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [filterPlayerId, setFilterPlayerId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [openVideoId, setOpenVideoId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/players', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPlayers(d.players || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const url = filterPlayerId ? `/api/activity?playerId=${filterPlayerId}` : '/api/activity'
        const r = await fetch(url, { cache: 'no-store' })
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
  }, [filterPlayerId])

  return (
    <div>
      <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-3 mb-4 flex items-center gap-2">
        <label className="text-sm font-semibold">Filter:</label>
        <select
          value={filterPlayerId}
          onChange={(e) => setFilterPlayerId(e.target.value)}
          className="flex-1 rounded-md border-2 border-input bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All players</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-6 text-center text-sm text-muted-foreground">
          No activity yet.
        </div>
      )}

      {!loading && items.length > 0 && (
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
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <Link
                        href={`/dashboard/players/${it.player_id}`}
                        className="font-semibold text-sm hover:text-hoop-orange"
                      >
                        {it.player_name}
                      </Link>
                      <p className="text-xs text-muted-foreground shrink-0">{relTime(it.at)}</p>
                    </div>
                    <p className="text-sm">{it.title}</p>
                    {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                    {(it.kind === 'recording' || it.kind === 'video_uploaded') && hasVideo && recId != null && (
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
                        contextTitle={`${it.player_name} · ${it.title}`}
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
      )}
    </div>
  )
}
