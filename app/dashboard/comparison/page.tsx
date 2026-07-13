'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Play, Pause, RotateCcw, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getVideoFromIndexedDB } from '@/lib/video-storage'
import VideoSpeedControl from '@/components/video-speed-control'
import EntityChat from '@/components/entity-chat'
import LibraryTabs from '@/components/library-tabs'
import AdaptiveVideo from '@/components/adaptive-video'

interface Recording {
  id: number
  drill_name: string
  workout_title: string
  blob_key: string
  recorded_at: string
  duration_seconds: number
  video_path: string | null
  player_name?: string | null
  player_id?: number
}

interface Player {
  id: number
  name: string
}

export default function ComparisonPage() {
  const searchParams = useSearchParams()
  const initialPlayerId = searchParams.get('playerId') || ''
  const [role, setRole] = useState<'trainer' | 'player' | ''>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [filterPlayerId, setFilterPlayerId] = useState<string>(initialPlayerId)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [leftKey, setLeftKey] = useState('')
  const [rightKey, setRightKey] = useState('')
  const [leftUrl, setLeftUrl] = useState('')
  const [rightUrl, setRightUrl] = useState('')
  const [synced, setSynced] = useState(true)
  const [leftRate, setLeftRate] = useState(1)
  const [rightRate, setRightRate] = useState(1)
  const [linkSpeeds, setLinkSpeeds] = useState(true)

  const leftVideoRef = useRef<HTMLVideoElement>(null)
  const rightVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role || ''))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (role === 'trainer') {
      fetch('/api/players', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setPlayers(d.players || []))
        .catch(() => {})
    }
  }, [role])

  useEffect(() => {
    const url = filterPlayerId ? `/api/recordings?playerId=${filterPlayerId}` : '/api/recordings'
    fetch(url)
      .then((r) => r.json())
      .then((data) => setRecordings(data.recordings || []))
  }, [filterPlayerId])

  useEffect(() => {
    if (!leftKey) return
    const rec = recordings.find((r) => r.blob_key === leftKey)
    if (rec?.video_path) {
      if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolving from recordings list, not a fetch
      setLeftUrl(`/api/recordings/${rec.id}/video`)
      return
    }
    getVideoFromIndexedDB(leftKey).then((blob) => {
      if (blob) {
        if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
        setLeftUrl(URL.createObjectURL(blob))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftKey, recordings])

  useEffect(() => {
    if (!rightKey) return
    const rec = recordings.find((r) => r.blob_key === rightKey)
    if (rec?.video_path) {
      if (rightUrl?.startsWith('blob:')) URL.revokeObjectURL(rightUrl)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolving from recordings list, not a fetch
      setRightUrl(`/api/recordings/${rec.id}/video`)
      return
    }
    getVideoFromIndexedDB(rightKey).then((blob) => {
      if (blob) {
        if (rightUrl?.startsWith('blob:')) URL.revokeObjectURL(rightUrl)
        setRightUrl(URL.createObjectURL(blob))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightKey, recordings])

  useEffect(() => {
    if (leftVideoRef.current) leftVideoRef.current.playbackRate = leftRate
  }, [leftRate, leftUrl])

  useEffect(() => {
    if (rightVideoRef.current) rightVideoRef.current.playbackRate = rightRate
  }, [rightRate, rightUrl])

  function setLeftRateLinked(r: number) {
    setLeftRate(r)
    if (linkSpeeds) setRightRate(r)
  }
  function setRightRateLinked(r: number) {
    setRightRate(r)
    if (linkSpeeds) setLeftRate(r)
  }

  function syncPlay() {
    leftVideoRef.current?.play()
    rightVideoRef.current?.play()
  }

  function syncPause() {
    leftVideoRef.current?.pause()
    rightVideoRef.current?.pause()
  }

  function syncReset() {
    if (leftVideoRef.current) leftVideoRef.current.currentTime = 0
    if (rightVideoRef.current) rightVideoRef.current.currentTime = 0
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <LibraryTabs />
      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-4">Compare Recordings</h2>

      {role === 'trainer' && (
        <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-3 mb-4 flex items-center gap-2">
          <label className="text-sm font-semibold">Player:</label>
          <select
            value={filterPlayerId}
            onChange={(e) => {
              setFilterPlayerId(e.target.value)
              setLeftKey('')
              setRightKey('')
            }}
            className="flex-1 rounded-md border-2 border-input bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All players</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {recordings.length < 2 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>You need at least 2 recordings to compare.</p>
          <p className="text-sm mt-1">Record some drills first!</p>
        </div>
      )}

      {recordings.length >= 2 && (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Left panel */}
            <div className="space-y-2">
              <select
                value={leftKey}
                onChange={(e) => setLeftKey(e.target.value)}
                className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select recording...</option>
                {recordings.map((r) => (
                  <option key={r.id} value={r.blob_key}>
                    {role === 'trainer' && r.player_name ? `${r.player_name} · ` : ''}{r.drill_name} - {new Date(r.recorded_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
                {leftUrl ? (
                  <div className="relative">
                    <AdaptiveVideo
                      ref={leftVideoRef}
                      src={leftUrl}
                      controls={!synced}
                      playsInline
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <VideoSpeedControl rate={leftRate} onChange={setLeftRateLinked} compact />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-black w-full flex items-center justify-center text-gray-500">Select a recording</div>
                )}
                {leftKey && (() => {
                  const rec = recordings.find((r) => r.blob_key === leftKey)
                  if (!rec) return null
                  return (
                    <EntityChat
                      contextType="recording"
                      contextId={rec.id}
                      contextTitle={`${rec.drill_name} (${new Date(rec.recorded_at).toLocaleDateString()})`}
                      compact
                      embedded
                    />
                  )
                })()}
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-2">
              <select
                value={rightKey}
                onChange={(e) => setRightKey(e.target.value)}
                className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select recording...</option>
                {recordings.map((r) => (
                  <option key={r.id} value={r.blob_key}>
                    {role === 'trainer' && r.player_name ? `${r.player_name} · ` : ''}{r.drill_name} - {new Date(r.recorded_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
                {rightUrl ? (
                  <div className="relative">
                    <AdaptiveVideo
                      ref={rightVideoRef}
                      src={rightUrl}
                      controls={!synced}
                      playsInline
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <VideoSpeedControl rate={rightRate} onChange={setRightRateLinked} compact />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-black w-full flex items-center justify-center text-gray-500">Select a recording</div>
                )}
                {rightKey && (() => {
                  const rec = recordings.find((r) => r.blob_key === rightKey)
                  if (!rec) return null
                  return (
                    <EntityChat
                      contextType="recording"
                      contextId={rec.id}
                      contextTitle={`${rec.drill_name} (${new Date(rec.recorded_at).toLocaleDateString()})`}
                      compact
                      embedded
                    />
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Sync controls */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={synced}
                onChange={(e) => setSynced(e.target.checked)}
                className="rounded"
              />
              Sync playback
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={linkSpeeds}
                onChange={(e) => setLinkSpeeds(e.target.checked)}
                className="rounded"
              />
              <Link2 className="h-3.5 w-3.5" />
              Link speeds
            </label>
            {synced && (
              <>
                <Button onClick={syncPlay} size="sm" className="gap-1">
                  <Play className="h-4 w-4" />
                  Play
                </Button>
                <Button onClick={syncPause} size="sm" variant="outline" className="gap-1">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button onClick={syncReset} size="sm" variant="outline" className="gap-1">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
