'use client'

import { useEffect, useRef, useState } from 'react'
import VideoSpeedControl from '@/components/video-speed-control'

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

let ytApiPromise: Promise<void> | null = null
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (ytApiPromise) return ytApiPromise
  const w = window as unknown as { YT?: { Player: new (...args: unknown[]) => unknown }, onYouTubeIframeAPIReady?: () => void }
  ytApiPromise = new Promise((resolve) => {
    if (w.YT && w.YT.Player) { resolve(); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
  })
  return ytApiPromise
}

interface YTPlayer {
  setPlaybackRate: (rate: number) => void
  destroy: () => void
}

export default function YouTubeEmbed({
  url,
  clipStart,
  clipEnd,
  defaultPlaybackRate = 1,
  showSpeedControl = true,
}: {
  url: string
  clipStart?: number | null
  clipEnd?: number | null
  defaultPlaybackRate?: number
  showSpeedControl?: boolean
}) {
  const videoId = getYouTubeId(url)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [rate, setRate] = useState(defaultPlaybackRate || 1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!videoId || !containerRef.current) return
    let cancelled = false

    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return
      const w = window as unknown as { YT: { Player: new (el: HTMLElement, opts: object) => YTPlayer } }

      containerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.style.width = '100%'
      div.style.height = '100%'
      containerRef.current.appendChild(div)

      const playerVars: Record<string, number | string> = {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      }
      if (clipStart != null && clipStart > 0) playerVars.start = clipStart
      if (clipEnd != null && clipEnd > 0) playerVars.end = clipEnd

      playerRef.current = new w.YT.Player(div, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars,
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (cancelled) return
            setReady(true)
            if (rate !== 1) {
              try { e.target.setPlaybackRate(rate) } catch {}
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, clipStart, clipEnd])

  function changeRate(r: number) {
    setRate(r)
    if (ready && playerRef.current) {
      try { playerRef.current.setPlaybackRate(r) } catch {}
    }
  }

  if (!videoId) {
    return (
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-sm text-muted-foreground">
        Invalid YouTube URL
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {showSpeedControl && (
        <div className="absolute top-2 right-2 z-10">
          <VideoSpeedControl rate={rate} onChange={changeRate} compact />
        </div>
      )}
    </div>
  )
}
