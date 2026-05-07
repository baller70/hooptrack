'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Loader2, Save, X, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  recordingId: number
  videoSrc: string
  durationSeconds: number
  initialStart: number
  initialEnd: number | null
  onSaved: (start: number, end: number) => void
  onClipCreated?: (newRecordingId: number) => void
  onCancel: () => void
}

function fmt(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RecordingClipper({
  recordingId,
  videoSrc,
  durationSeconds,
  initialStart,
  initialEnd,
  onSaved,
  onClipCreated,
  onCancel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(durationSeconds || 0)
  const [start, setStart] = useState(initialStart || 0)
  const [end, setEnd] = useState(initialEnd && initialEnd > 0 ? initialEnd : durationSeconds || 0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(start)
  const [saving, setSaving] = useState(false)
  const [savingNew, setSavingNew] = useState(false)
  const [clipName, setClipName] = useState('')
  const draggingRef = useRef<'start' | 'end' | null>(null)

  // Sync duration when video loads (in case prop is stale)
  function onLoadedMetadata() {
    if (videoRef.current && videoRef.current.duration && Number.isFinite(videoRef.current.duration)) {
      const d = Math.floor(videoRef.current.duration)
      setDuration(d)
      if (!initialEnd || initialEnd <= 0) setEnd(d)
    }
  }

  function onTimeUpdate() {
    if (!videoRef.current) return
    const t = videoRef.current.currentTime
    setCurrentTime(t)
    // Auto-stop at end handle
    if (playing && t >= end) {
      videoRef.current.pause()
      videoRef.current.currentTime = start
      setPlaying(false)
    }
  }

  function togglePlay() {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
      setPlaying(false)
    } else {
      // Always replay from start handle
      videoRef.current.currentTime = start
      videoRef.current.play()
      setPlaying(true)
    }
  }

  // Drag handles
  useEffect(() => {
    function handleMove(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current || !trackRef.current || duration <= 0) return
      e.preventDefault()
      const rect = trackRef.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newTime = Math.round(ratio * duration)
      if (draggingRef.current === 'start') {
        const clamped = Math.max(0, Math.min(newTime, end - 1))
        setStart(clamped)
        if (videoRef.current) videoRef.current.currentTime = clamped
      } else {
        const clamped = Math.max(start + 1, Math.min(newTime, duration))
        setEnd(clamped)
        if (videoRef.current) videoRef.current.currentTime = clamped
      }
    }
    function handleUp() { draggingRef.current = null }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [start, end, duration])

  async function save() {
    setSaving(true)
    try {
      const isFullClip = start === 0 && end >= duration
      const res = await fetch(`/api/recordings/${recordingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_start: isFullClip ? null : start,
          clip_end: isFullClip ? null : end,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success(isFullClip ? 'Clip cleared' : `Trimmed to ${fmt(start)} – ${fmt(end)}`)
      onSaved(start, end)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save clip')
    } finally {
      setSaving(false)
    }
  }

  async function saveAsNew() {
    if (!clipName.trim()) {
      toast.error('Give the clip a name')
      return
    }
    if (end <= start) {
      toast.error('Clip end must be after start')
      return
    }
    setSavingNew(true)
    try {
      const res = await fetch(`/api/recordings/${recordingId}/clip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_start: start,
          clip_end: end,
          title: clipName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success(`Saved "${clipName.trim()}" (${fmt(end - start)})`)
      onClipCreated?.(data.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save clip')
    } finally {
      setSavingNew(false)
    }
  }

  const startPct = duration > 0 ? (start / duration) * 100 : 0
  const endPct = duration > 0 ? (end / duration) * 100 : 100
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Timeline with two handles */}
      <div className="px-2">
        <div
          ref={trackRef}
          className="relative h-10 bg-gray-200 rounded-md select-none"
        >
          {/* Selected range */}
          <div
            className="absolute top-0 bottom-0 bg-orange-200 border-y-2 border-hoop-orange"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-black pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          />
          {/* Start handle */}
          <div
            onMouseDown={() => { draggingRef.current = 'start' }}
            onTouchStart={() => { draggingRef.current = 'start' }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-12 bg-black border-2 border-hoop-orange rounded cursor-ew-resize touch-none"
            style={{ left: `${startPct}%` }}
            aria-label="Clip start"
          />
          {/* End handle */}
          <div
            onMouseDown={() => { draggingRef.current = 'end' }}
            onTouchStart={() => { draggingRef.current = 'end' }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-12 bg-black border-2 border-hoop-orange rounded cursor-ew-resize touch-none"
            style={{ left: `${endPct}%` }}
            aria-label="Clip end"
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Start: <strong className="text-foreground">{fmt(start)}</strong></span>
          <span>Length: {fmt(end - start)}</span>
          <span>End: <strong className="text-foreground">{fmt(end)}</strong></span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 text-center">
          Drag the orange handles to set start and end of the clip.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={togglePlay} className="gap-1">
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? 'Pause' : 'Preview'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setStart(0); setEnd(duration) }}>
          Reset to full
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="ml-auto gap-1">
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>

      {/* Save as new named clip */}
      <div className="border-2 border-black rounded-lg p-3 bg-white space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Scissors className="h-3.5 w-3.5" /> Save as new clip
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Saves a {fmt(end - start)} clip as its own item. The original recording stays untouched.
        </p>
        <div className="flex gap-2">
          <Input
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            placeholder='Name this clip e.g. "Best layup"'
            maxLength={200}
            className="flex-1"
          />
          <Button size="sm" onClick={saveAsNew} disabled={savingNew || !clipName.trim()} className="gap-1 shrink-0">
            {savingNew ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save as new
          </Button>
        </div>
      </div>

      {/* Trim original (in-place) */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Or trim the original (non-destructive)
        </summary>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={save} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Trim original to {fmt(start)}–{fmt(end)}
          </Button>
        </div>
      </details>
    </div>
  )
}
