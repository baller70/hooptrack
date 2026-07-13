'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Scissors, Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

interface YouTubeClipperProps {
  url: string
  initialStart?: number
  initialEnd?: number
  onClipChange: (start: number, end: number) => void
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        config: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: Record<string, (e: { target: YTPlayer }) => void>
        }
      ) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayer {
  getDuration: () => number
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  getPlayerState: () => number
  destroy: () => void
}

export default function YouTubeClipper({ url, initialStart, initialEnd, onClipChange }: YouTubeClipperProps) {
  const videoId = getYouTubeId(url)
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [clipStart, setClipStart] = useState(initialStart || 0)
  const [clipEnd, setClipEnd] = useState(initialEnd || 0)
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  // Load YouTube IFrame API
  const initPlayer = useCallback(() => {
    if (!videoId || !containerRef.current) return
    // Clear any existing player
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
    }

    const el = document.createElement('div')
    el.id = `yt-clipper-${Date.now()}`
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(el)

    playerRef.current = new window.YT.Player(el.id, {
      videoId,
      playerVars: { controls: 0, modestbranding: 1, rel: 0, fs: 0 },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          const dur = e.target.getDuration()
          setDuration(dur)
          if (!initialEnd || initialEnd <= 0) {
            setClipEnd(dur)
            onClipChange(initialStart || 0, dur)
          }
          setReady(true)
        },
      },
    })
  }, [videoId, initialStart, initialEnd, onClipChange])

  useEffect(() => {
    if (!videoId) return

    if (window.YT) {
      initPlayer()
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => initPlayer()

    return () => {
      window.onYouTubeIframeAPIReady = undefined
    }
  }, [videoId, initPlayer])

  // Time tracking interval
  useEffect(() => {
    if (playing && playerRef.current) {
      intervalRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime() || 0
        setCurrentTime(t)
        // Loop within clip range
        if (t >= clipEnd) {
          playerRef.current?.seekTo(clipStart, true)
        }
      }, 100)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, clipStart, clipEnd])

  function playClip() {
    if (!playerRef.current) return
    playerRef.current.seekTo(clipStart, true)
    playerRef.current.playVideo()
    setPlaying(true)
  }

  function pauseClip() {
    playerRef.current?.pauseVideo()
    setPlaying(false)
  }

  function resetClip() {
    setClipStart(0)
    setClipEnd(duration)
    onClipChange(0, duration)
    playerRef.current?.seekTo(0, true)
    setPlaying(false)
    playerRef.current?.pauseVideo()
  }

  // Drag handler for slider thumbs
  const handleMouseDown = useCallback((type: 'start' | 'end') => {
    setDragging(type)
  }, [])

  useEffect(() => {
    if (!dragging) return

    function handleMouseMove(e: MouseEvent | TouchEvent) {
      if (!trackRef.current || !duration) return
      const rect = trackRef.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const time = Math.round(pct * duration)

      if (dragging === 'start') {
        const newStart = Math.min(time, clipEnd - 1)
        setClipStart(newStart)
        onClipChange(newStart, clipEnd)
        playerRef.current?.seekTo(newStart, true)
      } else {
        const newEnd = Math.max(time, clipStart + 1)
        setClipEnd(newEnd)
        onClipChange(clipStart, newEnd)
      }
    }

    function handleMouseUp() {
      setDragging(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleMouseMove)
    window.addEventListener('touchend', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [dragging, duration, clipStart, clipEnd, onClipChange])

  if (!videoId) {
    return <div className="text-sm text-muted-foreground p-4">Enter a valid YouTube URL above</div>
  }

  const startPct = duration > 0 ? (clipStart / duration) * 100 : 0
  const endPct = duration > 0 ? (clipEnd / duration) * 100 : 100
  const currentPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="space-y-3">
      {/* YouTube Player */}
      <div className="aspect-video rounded-lg overflow-hidden border bg-black" ref={containerRef} />

      {ready && duration > 0 && (
        <>
          {/* Clip Range Slider */}
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Scissors className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Clip Trimmer</span>
              <span className="text-muted-foreground ml-auto">
                {formatTime(clipEnd - clipStart)} clip from {formatTime(duration)} video
              </span>
            </div>

            {/* Slider Track */}
            <div className="relative pt-6 pb-2 select-none" ref={trackRef}>
              {/* Track background */}
              <div className="h-2 bg-gray-200 rounded-full relative">
                {/* Selected range highlight */}
                <div
                  className="absolute h-full bg-purple-500 rounded-full"
                  style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
                />
                {/* Current time indicator */}
                {playing && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-red-500 z-10"
                    style={{ left: `${currentPct}%` }}
                  />
                )}
              </div>

              {/* Start handle */}
              <div
                className="absolute top-3 -translate-x-1/2 cursor-grab active:cursor-grabbing touch-none"
                style={{ left: `${startPct}%` }}
                onMouseDown={() => handleMouseDown('start')}
                onTouchStart={() => handleMouseDown('start')}
              >
                <div className="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow-md" />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-purple-600 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  {formatTime(clipStart)}
                </div>
              </div>

              {/* End handle */}
              <div
                className="absolute top-3 -translate-x-1/2 cursor-grab active:cursor-grabbing touch-none"
                style={{ left: `${endPct}%` }}
                onMouseDown={() => handleMouseDown('end')}
                onTouchStart={() => handleMouseDown('end')}
              >
                <div className="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow-md" />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-purple-600 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  {formatTime(clipEnd)}
                </div>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              {!playing ? (
                <Button onClick={playClip} size="sm" variant="outline" className="gap-1">
                  <Play className="h-3 w-3" />
                  Preview Clip
                </Button>
              ) : (
                <Button onClick={pauseClip} size="sm" variant="outline" className="gap-1">
                  <Pause className="h-3 w-3" />
                  Pause
                </Button>
              )}
              <Button onClick={resetClip} size="sm" variant="ghost" className="gap-1 text-muted-foreground">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                Drag the purple handles to trim
              </span>
            </div>
          </div>
        </>
      )}

      {!ready && (
        <div className="text-center text-sm text-muted-foreground py-2">Loading video...</div>
      )}
    </div>
  )
}
