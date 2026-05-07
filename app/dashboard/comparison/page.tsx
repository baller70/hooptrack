'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getVideoFromIndexedDB } from '@/lib/video-storage'
import VideoSpeedControl from '@/components/video-speed-control'
import EntityChat from '@/components/entity-chat'
import LibraryTabs from '@/components/library-tabs'

interface Recording {
  id: number
  drill_name: string
  workout_title: string
  blob_key: string
  recorded_at: string
  duration_seconds: number
  video_path: string | null
}

export default function ComparisonPage() {
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
    fetch('/api/recordings')
      .then((r) => r.json())
      .then((data) => setRecordings(data.recordings || []))
  }, [])

  useEffect(() => {
    if (!leftKey) return
    const rec = recordings.find((r) => r.blob_key === leftKey)
    if (rec?.video_path) {
      if (leftUrl?.startsWith('blob:')) URL.revokeObjectURL(leftUrl)
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
      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6">Compare Recordings</h2>

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
                    {r.drill_name} - {new Date(r.recorded_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {leftUrl ? (
                    <>
                      <video ref={leftVideoRef} src={leftUrl} controls={!synced} playsInline className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 z-10">
                        <VideoSpeedControl rate={leftRate} onChange={setLeftRateLinked} compact />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Select a recording</div>
                  )}
                </div>
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
                    {r.drill_name} - {new Date(r.recorded_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="bg-white border-2 border-black rounded-xl overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {rightUrl ? (
                    <>
                      <video ref={rightVideoRef} src={rightUrl} controls={!synced} playsInline className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 z-10">
                        <VideoSpeedControl rate={rightRate} onChange={setRightRateLinked} compact />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">Select a recording</div>
                  )}
                </div>
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
