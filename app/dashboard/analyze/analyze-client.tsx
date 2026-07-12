'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Loader2,
  MessageSquareText,
  Play,
  Plus,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-react'
import AdaptiveVideo from '@/components/adaptive-video'
import EntityChat from '@/components/entity-chat'
import VideoSpeedControl from '@/components/video-speed-control'
import { Button } from '@/components/ui/button'

interface Recording {
  id: number
  drill_name: string
  drill_category: string
  workout_title: string
  recorded_at: string
  duration_seconds: number
  video_path: string | null
  player_name?: string | null
  player_id?: number
}

interface Move {
  id: number
  title: string
  category: string
  description: string | null
  youtube_url: string | null
  video_type: 'youtube' | 'upload'
  video_path: string | null
  created_at: string
  assigned_player_name?: string | null
  default_playback_rate?: number
}

interface Player {
  id: number
  name: string
}

interface FilmItem {
  id: string
  numericId: number
  contextType: 'recording' | 'move'
  source: 'recording' | 'upload' | 'youtube'
  title: string
  subtitle: string
  category: string
  playerName: string | null
  createdAt: string
  durationSeconds: number | null
  url: string
  summary: string | null
}

interface CapturedFrame {
  id: string
  timestamp: number
  dataUrl: string
}

type SourceFilter = 'all' | FilmItem['source']

const sourceLabels: Record<SourceFilter, string> = {
  all: 'All film',
  recording: 'Recordings',
  upload: 'Uploaded moves',
  youtube: 'YouTube',
}

function formatTime(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  const hundredths = Math.floor((value % 1) * 100)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}

function formatTimestamp(value: number | null): string | null {
  if (value == null || Number.isNaN(value)) return null
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function parseYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match?.[1] ?? null
}

function toFilmItems(recordings: Recording[], moves: Move[]): FilmItem[] {
  const recordingItems = recordings
    .filter((recording) => recording.video_path)
    .map((recording): FilmItem => ({
      id: `recording-${recording.id}`,
      numericId: recording.id,
      contextType: 'recording',
      source: 'recording',
      title: recording.drill_name,
      subtitle: `${recording.workout_title} · ${recording.drill_category}`,
      category: recording.drill_category,
      playerName: recording.player_name ?? null,
      createdAt: recording.recorded_at,
      durationSeconds: recording.duration_seconds,
      url: `/api/recordings/${recording.id}/video`,
      summary: 'Captured from HoopTrack practice recording.',
    }))

  const moveItems = moves
    .filter((move) => move.video_type === 'youtube' ? move.youtube_url : move.video_path)
    .map((move): FilmItem => ({
      id: `move-${move.id}`,
      numericId: move.id,
      contextType: 'move',
      source: move.video_type === 'youtube' ? 'youtube' : 'upload',
      title: move.title,
      subtitle: `${move.category}${move.assigned_player_name ? ` · ${move.assigned_player_name}` : ''}`,
      category: move.category,
      playerName: move.assigned_player_name ?? null,
      createdAt: move.created_at,
      durationSeconds: null,
      url: move.video_type === 'youtube' ? (move.youtube_url || '') : (move.video_path || ''),
      summary: move.description || 'Custom move video from the HoopTrack library.',
    }))

  return [...recordingItems, ...moveItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function FilmThumb({ item }: { item: FilmItem }) {
  const ytId = item.source === 'youtube' ? parseYouTubeId(item.url) : null
  if (ytId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="h-12 w-20 shrink-0 rounded-md bg-gray-100 object-cover" />
    )
  }
  return (
    <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-gray-100 text-muted-foreground">
      <Film className="h-5 w-5" aria-hidden="true" />
    </span>
  )
}

function SourceBadge({ source }: { source: FilmItem['source'] }) {
  const copy = source === 'recording' ? 'Recording' : source === 'upload' ? 'Upload' : 'YouTube'
  return <span className="rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{copy}</span>
}

function VideoSurface({
  item,
  videoRef,
  rate,
  onLoaded,
  onTime,
}: {
  item: FilmItem
  videoRef?: React.RefObject<HTMLVideoElement | null>
  rate: number
  onLoaded?: (duration: number) => void
  onTime?: (time: number) => void
}) {
  const ytId = item.source === 'youtube' ? parseYouTubeId(item.url) : null
  if (ytId) {
    return (
      <iframe
        className="aspect-video w-full rounded-lg bg-black"
        src={`https://www.youtube.com/embed/${ytId}`}
        title={item.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  return (
    <AdaptiveVideo
      ref={videoRef}
      src={item.url}
      controls
      playsInline
      onLoadedMetadata={(event) => {
        event.currentTarget.playbackRate = rate
        onLoaded?.(event.currentTarget.duration || 0)
      }}
      onTimeUpdate={(event) => onTime?.(event.currentTarget.currentTime || 0)}
    />
  )
}

export default function AnalyzeClient() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [role, setRole] = useState<'trainer' | 'player' | ''>('')
  const [players, setPlayers] = useState<Player[]>([])
  const [playerId, setPlayerId] = useState('')
  const [items, setItems] = useState<FilmItem[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [category, setCategory] = useState('')
  const [rate, setRate] = useState(0.5)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [frames, setFrames] = useState<CapturedFrame[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [leftCompareId, setLeftCompareId] = useState('')
  const [rightCompareId, setRightCompareId] = useState('')

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role || ''))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (role !== 'trainer') return
    fetch('/api/players', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPlayers(d.players || []))
      .catch(() => {})
  }, [role])

  useEffect(() => {
    const playerParam = playerId ? `?playerId=${playerId}` : ''
    let active = true
    Promise.all([
      fetch(`/api/recordings${playerParam}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/moves${playerParam}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([recordingData, moveData]) => {
        if (!active) return
        const nextItems = toFilmItems(recordingData.recordings || [], moveData.moves || [])
        setItems(nextItems)
        setSelectedId((current) => nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id ?? null)
        setLeftCompareId((current) => nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id ?? '')
        setRightCompareId((current) => nextItems.some((item) => item.id === current) ? current : nextItems[1]?.id ?? nextItems[0]?.id ?? '')
        setFrames([])
      })
      .catch(() => {
        if (active) setItems([])
      })
    return () => {
      active = false
    }
  }, [playerId])

  const filmItems = useMemo(() => items ?? [], [items])
  const selected = filmItems.find((item) => item.id === selectedId) || null
  const loading = items === null

  const categories = useMemo(
    () => Array.from(new Set(filmItems.map((item) => item.category).filter(Boolean))).sort(),
    [filmItems],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return filmItems.filter((item) => {
      if (source !== 'all' && item.source !== source) return false
      if (category && item.category !== category) return false
      if (!needle) return true
      return [item.title, item.subtitle, item.playerName ?? '', item.category].join(' ').toLowerCase().includes(needle)
    })
  }, [filmItems, source, category, query])

  const hero = useMemo(() => {
    const withMoments = frames.length
    const thisMonth = filmItems.filter((item) => {
      const d = new Date(item.createdAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { total: filmItems.length, withMoments, thisMonth }
  }, [filmItems, frames.length])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate, selectedId])

  function step(seconds: number) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min((video.currentTime || 0) + seconds, duration || video.duration || 0))
  }

  function reset() {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
  }

  function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    setFrames((current) => [{
      id: `${selected?.id || 'film'}-${Date.now()}`,
      timestamp: video.currentTime,
      dataUrl: canvas.toDataURL('image/png'),
    }, ...current].slice(0, 8))
  }

  function clearFilters() {
    setQuery('')
    setSource('all')
    setCategory('')
  }

  const canUseFrameTools = selected?.source !== 'youtube'
  const leftCompare = filmItems.find((item) => item.id === leftCompareId) || filmItems[0]
  const rightCompare = filmItems.find((item) => item.id === rightCompareId) || filmItems[1] || filmItems[0]

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-hoop-orange">Film room</p>
          <h1 className="font-[family-name:var(--font-russo)] text-3xl flex items-center gap-2">
            <Film className="h-7 w-7 text-hoop-orange" />
            Film & Video
          </h1>
          <p className="text-sm text-muted-foreground">
            {hero.total} clip{hero.total === 1 ? '' : 's'} · {hero.withMoments} teaching frame{hero.withMoments === 1 ? '' : 's'} · {hero.thisMonth} added this month
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/moves/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-3 py-2 text-sm font-semibold hover:opacity-90"
          >
            <Upload className="h-4 w-4" />
            Add film
          </Link>
          <Link
            href="/dashboard/capture"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-semibold hover:bg-orange-50"
          >
            <Camera className="h-4 w-4 text-hoop-orange" />
            Capture
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#0A0A0A] lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clips, players, categories"
            className="h-10 w-full rounded-md border-2 border-input bg-white pl-9 pr-3 text-sm"
          />
        </label>
        <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)} className="h-10 rounded-md border-2 border-input bg-white px-3 text-sm">
          {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-md border-2 border-input bg-white px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        {role === 'trainer' && (
          <select value={playerId} onChange={(event) => {
            setItems(null)
            setPlayerId(event.target.value)
          }} className="h-10 rounded-md border-2 border-input bg-white px-3 text-sm">
            <option value="">All players</option>
            {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        )}
        {(query || source !== 'all' || category) && (
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
        )}
        {filmItems.length >= 2 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" />
            Compare
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-white py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading film room
        </div>
      ) : filmItems.length === 0 ? (
        <div className="rounded-xl border-2 border-black bg-white py-16 text-center shadow-[4px_4px_0px_0px_#0A0A0A]">
          <Film className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-[family-name:var(--font-russo)] text-xl">No film yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Record from your phone or upload a move video. Film lands here for review, comparison, teaching frames, and notes.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/dashboard/capture" className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white">
              <Camera className="h-4 w-4" />
              Capture now
            </Link>
            <Link href="/dashboard/moves/upload" className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Upload video
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#0A0A0A]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Clips</h2>
              <span className="text-xs text-muted-foreground">{filtered.length} of {filmItems.length}</span>
            </div>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No clips match those filters.</p>
            ) : (
              <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
                {filtered.map((item) => {
                  const active = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id)
                        setCurrentTime(0)
                        setDuration(0)
                        setFrames([])
                      }}
                      className={`flex w-full gap-3 rounded-lg border-2 p-2 text-left transition-colors ${
                        active ? 'border-black bg-orange-50' : 'border-gray-200 bg-white hover:border-black'
                      }`}
                    >
                      <FilmThumb item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.playerName ? `${item.playerName}: ` : ''}{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                        <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <SourceBadge source={item.source} />
                          <span>{formatDate(item.createdAt)}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </aside>

          <main className="space-y-4">
            <section className="rounded-xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#0A0A0A]">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-[family-name:var(--font-russo)] text-xl">{selected.title}</h2>
                        <SourceBadge source={selected.source} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[selected.playerName, selected.subtitle, formatDate(selected.createdAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {canUseFrameTools && <VideoSpeedControl rate={rate} onChange={setRate} />}
                  </div>

                  <VideoSurface item={selected} videoRef={videoRef} rate={rate} onLoaded={setDuration} onTime={setCurrentTime} />

                  {canUseFrameTools ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-mono text-muted-foreground">
                        {formatTime(currentTime)} / {formatTime(duration || selected.durationSeconds || 0)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => step(-1)}>
                          <ChevronLeft className="h-4 w-4" />
                          1s
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => step(1)}>
                          1s
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={reset}>
                          <RotateCcw className="h-4 w-4" />
                          Reset
                        </Button>
                        <Button type="button" size="sm" onClick={captureFrame}>
                          <Camera className="h-4 w-4" />
                          Capture frame
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      YouTube clips can be reviewed and discussed here. Use uploaded or recorded video for frame capture and second-by-second stepping.
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <Play className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>Select a clip to review.</p>
                </div>
              )}
            </section>

            {selected && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#0A0A0A]">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 text-hoop-orange" />
                    Key moments
                  </h3>
                  {frames.length === 0 ? (
                    <div className="space-y-3 text-sm text-muted-foreground">
                      {selected.summary && <p>{selected.summary}</p>}
                      <p>Pause at the teachable moment, then capture a frame. Use moments for release point, footwork, balance, reads, or defensive position.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {frames.map((frame) => (
                        <figure key={frame.id} className="overflow-hidden rounded-lg border bg-gray-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={frame.dataUrl} alt={`Captured frame at ${formatTime(frame.timestamp)}`} className="aspect-video w-full bg-black object-contain" />
                          <figcaption className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                            <button type="button" onClick={() => {
                              if (videoRef.current) videoRef.current.currentTime = frame.timestamp
                            }} className="font-semibold hover:text-foreground">
                              {formatTime(frame.timestamp)}
                            </button>
                            <button type="button" onClick={() => setFrames((current) => current.filter((item) => item.id !== frame.id))} aria-label="Remove frame">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#0A0A0A]">
                  <div className="border-b-2 border-gray-100 p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <MessageSquareText className="h-4 w-4 text-hoop-orange" />
                      Discussion
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Write what they did right, what needs fixing, and the next rep cue.
                    </p>
                  </div>
                  <EntityChat
                    contextType={selected.contextType}
                    contextId={selected.numericId}
                    contextTitle={`${selected.title} (${formatDate(selected.createdAt)})`}
                    embedded
                  />
                </section>
              </div>
            )}
          </main>
        </div>
      )}

      {compareOpen && leftCompare && rightCompare && (
        <div className="fixed inset-0 z-[70] bg-black/50 p-3 sm:p-6">
          <div className="mx-auto flex max-h-full max-w-6xl flex-col overflow-hidden rounded-xl border-2 border-black bg-white shadow-[6px_6px_0px_0px_#0A0A0A]">
            <div className="flex items-center justify-between border-b-2 border-black p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-hoop-orange">Film comparison</p>
                <h2 className="font-[family-name:var(--font-russo)] text-xl">Compare two clips</h2>
              </div>
              <button type="button" onClick={() => setCompareOpen(false)} className="rounded-md border-2 border-black p-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 overflow-y-auto p-4 lg:grid-cols-2">
              <CompareSide label="Before" value={leftCompareId} onChange={setLeftCompareId} clips={filmItems} item={leftCompare} />
              <CompareSide label="After" value={rightCompareId} onChange={setRightCompareId} clips={filmItems} item={rightCompare} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompareSide({
  label,
  value,
  onChange,
  clips,
  item,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  clips: FilmItem[]
  item: FilmItem
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border-2 border-input bg-white px-3 text-sm">
          {clips.map((clip) => <option key={clip.id} value={clip.id}>{clip.title}</option>)}
        </select>
      </label>
      <VideoSurface item={item} rate={1} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <SourceBadge source={item.source} />
        <span>{formatDate(item.createdAt)}</span>
        {formatTimestamp(item.durationSeconds) && <span>{formatTimestamp(item.durationSeconds)}</span>}
      </div>
      {item.summary && <p className="text-sm leading-relaxed text-muted-foreground">{item.summary}</p>}
    </div>
  )
}
