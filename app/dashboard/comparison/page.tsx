'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Film, Link2, Pause, Play, RotateCcw, SquarePlay } from 'lucide-react'
import { getVideoFromIndexedDB } from '@/lib/video-storage'
import VideoSpeedControl from '@/components/video-speed-control'
import EntityChat from '@/components/entity-chat'
import AdaptiveVideo from '@/components/adaptive-video'
import {
  Card,
  EmptyState,
  GhostButton,
  PageTitle,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'

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

const SELECT_CLASS =
  'h-11 w-full rounded-lg border border-ht-line bg-ht-surface px-3 text-[14px] text-ht-ink outline-none focus:border-ht-orange'

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
    if (!leftKey) {
      if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
      return
    }
    const rec = recordings.find((r) => r.blob_key === leftKey)
    if (rec?.video_path) {
      if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
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
    if (!rightKey) {
      if (rightUrl?.startsWith('blob:')) URL.revokeObjectURL(rightUrl)
      return
    }
    const rec = recordings.find((r) => r.blob_key === rightKey)
    if (rec?.video_path) {
      if (rightUrl?.startsWith('blob:')) URL.revokeObjectURL(rightUrl)
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

  function setLeftRateLinked(r: number) {
    setLeftRate(r)
    if (linkSpeeds) setRightRate(r)
  }
  function setRightRateLinked(r: number) {
    setRightRate(r)
    if (linkSpeeds) setLeftRate(r)
  }

  const leftSelected = recordings.find((r) => r.blob_key === leftKey)
  const rightSelected = recordings.find((r) => r.blob_key === rightKey)
  const leftSrc = leftSelected?.video_path ? `/api/recordings/${leftSelected.id}/video` : leftUrl
  const rightSrc = rightSelected?.video_path ? `/api/recordings/${rightSelected.id}/video` : rightUrl

  useEffect(() => {
    if (leftVideoRef.current) leftVideoRef.current.playbackRate = leftRate
  }, [leftRate, leftSrc])

  useEffect(() => {
    if (rightVideoRef.current) rightVideoRef.current.playbackRate = rightRate
  }, [rightRate, rightSrc])

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

  function optionLabel(r: Recording) {
    const who = role === 'trainer' && r.player_name ? `${r.player_name} · ` : ''
    return `${who}${r.drill_name} - ${new Date(r.recorded_at).toLocaleDateString()}`
  }

  return (
    <div className="pt-2 lg:max-w-6xl">
      <PageTitle>Compare Recordings</PageTitle>

      {role === 'trainer' && (
        <Card className="mt-4 flex flex-wrap items-center gap-3 lg:max-w-md">
          <label htmlFor="compare-player" className="ht-heading text-[13px] tracking-[0.04em] text-ht-ink">
            Player
          </label>
          <select
            id="compare-player"
            value={filterPlayerId}
            onChange={(e) => {
              setFilterPlayerId(e.target.value)
              setLeftKey('')
              setRightKey('')
              if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
              if (rightUrl?.startsWith('blob:')) URL.revokeObjectURL(rightUrl)
              setLeftUrl('')
              setRightUrl('')
            }}
            className={`${SELECT_CLASS} min-w-0 flex-1`}
          >
            <option value="">All players</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Card>
      )}

      {recordings.length < 2 && (
        <Card className="mt-4">
          <EmptyState
            icon={Film}
            title="Not enough recordings to compare"
            body="Two clips are needed for a side-by-side. Record a couple of drills first."
          />
        </Card>
      )}

      {recordings.length >= 2 && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Left panel */}
            <div className="space-y-2.5">
              <label htmlFor="compare-left" className="sr-only">Left recording</label>
              <select
                id="compare-left"
                value={leftKey}
                onChange={(e) => {
                  if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
                  setLeftUrl('')
                  setLeftKey(e.target.value)
                }}
                className={SELECT_CLASS}
              >
                <option value="">Select recording...</option>
                {recordings.map((r) => (
                  <option key={r.id} value={r.blob_key}>{optionLabel(r)}</option>
                ))}
              </select>
              <Card padded={false} className="overflow-hidden">
                {leftSrc ? (
                  <div className="relative">
                    <AdaptiveVideo
                      ref={leftVideoRef}
                      src={leftSrc}
                      controls={!synced}
                      playsInline
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <VideoSpeedControl rate={leftRate} onChange={setLeftRateLinked} compact />
                    </div>
                  </div>
                ) : (
                  <PanelPlaceholder selected={!!leftSelected} />
                )}
                {leftSelected ? (
                  <EntityChat
                    contextType="recording"
                    contextId={leftSelected.id}
                    contextTitle={`${leftSelected.drill_name} (${new Date(leftSelected.recorded_at).toLocaleDateString()})`}
                    compact
                    embedded
                  />
                ) : null}
              </Card>
            </div>

            {/* Right panel */}
            <div className="space-y-2.5">
              <label htmlFor="compare-right" className="sr-only">Right recording</label>
              <select
                id="compare-right"
                value={rightKey}
                onChange={(e) => {
                  if (rightUrl?.startsWith('blob:')) URL.revokeObjectURL(rightUrl)
                  setRightUrl('')
                  setRightKey(e.target.value)
                }}
                className={SELECT_CLASS}
              >
                <option value="">Select recording...</option>
                {recordings.map((r) => (
                  <option key={r.id} value={r.blob_key}>{optionLabel(r)}</option>
                ))}
              </select>
              <Card padded={false} className="overflow-hidden">
                {rightSrc ? (
                  <div className="relative">
                    <AdaptiveVideo
                      ref={rightVideoRef}
                      src={rightSrc}
                      controls={!synced}
                      playsInline
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <VideoSpeedControl rate={rightRate} onChange={setRightRateLinked} compact />
                    </div>
                  </div>
                ) : (
                  <PanelPlaceholder selected={!!rightSelected} />
                )}
                {rightSelected ? (
                  <EntityChat
                    contextType="recording"
                    contextId={rightSelected.id}
                    contextTitle={`${rightSelected.drill_name} (${new Date(rightSelected.recorded_at).toLocaleDateString()})`}
                    compact
                    embedded
                  />
                ) : null}
              </Card>
            </div>
          </div>

          <Card className="mt-4">
            <SectionTitle>Playback</SectionTitle>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2 text-[14px] text-ht-ink">
                <input
                  type="checkbox"
                  checked={synced}
                  onChange={(e) => setSynced(e.target.checked)}
                  className="size-4 accent-ht-orange"
                />
                Sync playback
              </label>
              <label className="flex items-center gap-2 text-[14px] text-ht-ink">
                <input
                  type="checkbox"
                  checked={linkSpeeds}
                  onChange={(e) => setLinkSpeeds(e.target.checked)}
                  className="size-4 accent-ht-orange"
                />
                <Link2 className="size-4 text-ht-muted" strokeWidth={1.8} />
                Link speeds
              </label>

              {synced && (
                <div className="flex flex-1 flex-wrap items-center gap-2.5 lg:justify-end">
                  <PrimaryButton onClick={syncPlay} className="w-auto px-5 py-2.5 text-[14px]">
                    <Play className="size-4" strokeWidth={2} />
                    Play
                  </PrimaryButton>
                  <GhostButton onClick={syncPause} className="w-auto px-5 py-2.5 text-[14px]">
                    <Pause className="size-4" strokeWidth={2} />
                    Pause
                  </GhostButton>
                  <GhostButton onClick={syncReset} className="w-auto px-5 py-2.5 text-[14px]">
                    <RotateCcw className="size-4" strokeWidth={2} />
                    Reset
                  </GhostButton>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

/**
 * Recordings captured on device keep their video in the browser's IndexedDB and
 * have no server-side file, so a selected clip can legitimately have no source.
 * Say which of the two it is instead of mounting an empty <video>.
 */
function PanelPlaceholder({ selected }: { selected: boolean }) {
  return (
    <div className="flex aspect-video items-center justify-center bg-ht-chip">
      {selected ? (
        <EmptyState
          icon={SquarePlay}
          title="No video for this clip"
          body="This recording was captured on another device, so its video is not on this browser."
        />
      ) : (
        <EmptyState icon={SquarePlay} title="Select a recording" />
      )}
    </div>
  )
}
