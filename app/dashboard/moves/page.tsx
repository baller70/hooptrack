'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Folder,
  GraduationCap,
  Plus,
  Scissors,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import YouTubeEmbed from '@/components/youtube-embed'
import YouTubeClipper from '@/components/youtube-clipper'
import AIMoveRecommendations from '@/components/ai-move-recommendations'
import EntityChat from '@/components/entity-chat'
import InlineRename from '@/components/inline-rename'
import { appPath, type HoopApp } from '@/lib/app-routes'
import { cn } from '@/lib/utils'
import {
  Card,
  ClipPoster,
  EmptyState,
  GhostButton,
  PageTitle,
  Pill,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'
import { TrainingWorkspaceTabs } from '@/components/training-workspace-tabs'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 007-player-move-library-raw.png */

const SPEEDS = [0.5, 1, 1.5, 2]

/* The pack's chip order is curated rather than alphabetical; any category
 * seeded outside this list follows it, sorted by name. */
const CATEGORY_ORDER = ['Finishing', 'Shooting', 'Ball Handling', 'Footwork']

interface Move {
  id: number
  title: string
  youtube_url: string
  category: string
  description: string | null
  assigned_to_player_id: number | null
  assigned_player_name: string | null
  creator_name: string
  creator_role: string
  clip_start: number | null
  clip_end: number | null
  duration_seconds: number | null
  video_type: string
  video_path: string | null
  default_playback_rate: number
}

/** Seeded moves carry no file and no link, so "playable" is never assumed. */
function playable(move: Move) {
  if (move.video_type === 'upload') return move.video_path ? 'upload' : null
  return move.youtube_url ? 'youtube' : null
}

function clipLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** The pack shows a clip length. Only an explicit duration or a trimmed
 *  YouTube clip has one, so it is left off rather than guessed at. */
function durationLabel(move: Move) {
  if (move.duration_seconds) return clipLabel(move.duration_seconds)
  if (move.clip_start != null && move.clip_end != null && move.clip_end > move.clip_start) {
    return clipLabel(move.clip_end - move.clip_start)
  }
  return null
}

function byline(move: Move) {
  return move.creator_role === 'trainer' ? `Coach ${move.creator_name}` : move.creator_name
}

/* ------------------------------------------------------------------ shell */

export default function MovesPage() {
  const [moves, setMoves] = useState<Move[]>([])
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rate, setRate] = useState(1)
  const [studying, setStudying] = useState(false)
  const [clipping, setClipping] = useState(false)
  const [pendingClip, setPendingClip] = useState({ start: 0, end: 0 })

  const fetchMoves = useCallback(async () => {
    const res = await fetch('/api/moves')
    const data = await res.json()
    setMoves(data.moves || [])
  }, [])

  useEffect(() => {
    fetchMoves()
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) {
        setUserRole(d.user.role)
        setUserId(d.user.id)
      }
    }).catch(() => {})
  }, [fetchMoves])

  const isTrainer = userRole === 'trainer'
  const app: HoopApp = isTrainer ? 'coach' : 'player'

  const categories = useMemo(() => {
    const seen: string[] = []
    for (const move of moves) if (!seen.includes(move.category)) seen.push(move.category)
    const rank = (name: string) => {
      const index = CATEGORY_ORDER.indexOf(name)
      return index < 0 ? CATEGORY_ORDER.length : index
    }
    return seen.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  }, [moves])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return moves.filter(move => {
      if (category !== 'All' && move.category !== category) return false
      if (!needle) return true
      return (
        move.title.toLowerCase().includes(needle) ||
        (move.description ?? '').toLowerCase().includes(needle)
      )
    })
  }, [moves, category, query])

  const selected = filtered.find(move => move.id === selectedId) ?? filtered[0] ?? null

  // A new selection resets the per-move view state so panels never carry over.
  useEffect(() => {
    setStudying(false)
    setClipping(false)
    setRate(selected?.default_playback_rate || 1)
  }, [selected?.id, selected?.default_playback_rate])

  const deleteMove = useCallback(async (id: number) => {
    if (!confirm('Delete this move?')) return
    const res = await fetch(`/api/moves/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Move deleted')
      setSelectedId(null)
      fetchMoves()
    } else {
      toast.error('Delete failed')
    }
  }, [fetchMoves])

  const renameMove = useCallback(async (id: number, title: string) => {
    const res = await fetch(`/api/moves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      setMoves(current => current.map(m => (m.id === id ? { ...m, title } : m)))
      toast.success('Move renamed')
    } else {
      toast.error('Rename failed')
    }
  }, [])

  const saveClip = useCallback(async (id: number, start: number, end: number) => {
    const res = await fetch(`/api/moves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_start: start, clip_end: end }),
    })
    if (res.ok) {
      toast.success('Clip updated')
      setClipping(false)
      fetchMoves()
    } else {
      toast.error('Failed to save clip')
    }
  }, [fetchMoves])

  const source = selected ? playable(selected) : null

  return (
    <div className="pt-2 sm:pt-6">
      <PageTitle upright>Move Library</PageTitle>
      {/* The phone design goes straight from the title to the search box; the
          strip belongs to the desktop workspace layout. */}
      <TrainingWorkspaceTabs active="moves" app={app} className="mt-3 hidden lg:flex" />

      {isTrainer ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href={appPath(app, '/moves/create')}
            className="ht-heading inline-flex items-center justify-center gap-2 rounded-lg bg-ht-orange px-4 py-2.5 text-[14px] tracking-[0.02em] text-white transition-colors hover:bg-ht-orange-hover"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            YouTube
          </Link>
          <Link
            href={appPath(app, '/moves/upload')}
            className="ht-heading inline-flex items-center justify-center gap-2 rounded-lg border border-ht-orange bg-white px-4 py-2.5 text-[14px] tracking-[0.02em] text-ht-orange transition-colors hover:bg-ht-orange-soft"
          >
            <Upload className="size-4" strokeWidth={2.5} />
            Upload
          </Link>
        </div>
      ) : null}

      <div className="relative mt-5">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ht-muted"
          strokeWidth={2}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search moves"
          aria-label="Search moves"
          className="h-11 w-full rounded-xl border border-ht-line bg-ht-surface pr-4 pl-11 text-[15px] text-ht-ink placeholder:text-ht-muted focus:border-ht-orange focus:outline-none"
        />
      </div>

      {/* Wrapped, not scrolled: real category names are longer than the four in
          the design and a scroll row silently hid the last chip. */}
      <div className="mt-3 flex flex-wrap gap-2.5">
        {['All', ...categories].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            aria-pressed={category === name}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-[14px] transition-colors',
              category === name
                ? 'border-ht-orange bg-ht-orange text-white'
                : 'border-ht-line bg-ht-surface text-ht-ink hover:bg-ht-chip',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {moves.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={Folder}
            title="No moves yet"
            body="Upload a player clip or add a YouTube reference so this library becomes useful during review."
            action={
              isTrainer ? (
                <PrimaryButton href={appPath(app, '/moves/upload')}>
                  <Upload className="size-[18px]" strokeWidth={2.5} />
                  Upload Move
                </PrimaryButton>
              ) : undefined
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={Search}
            title="No moves match"
            body="Try a different search or category filter."
          />
        </Card>
      ) : (
        <div className="mt-4 space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
          <div className="space-y-4">
            {selected ? (
              <>
                <MoveHero move={selected} source={source} rate={rate} />

                <div className="grid grid-cols-2 gap-3">
                  {/* The design outlines this one in ink, not brand orange —
                      orange is reserved for the upload call to action. */}
                  <GhostButton
                    onClick={() => setStudying(open => !open)}
                    aria-pressed={studying}
                    className="border-ht-ink text-ht-ink hover:bg-ht-chip"
                  >
                    <GraduationCap className="size-[18px]" strokeWidth={2} />
                    Study Clip
                  </GhostButton>
                  <PrimaryButton href={appPath(app, '/capture')}>
                    <Upload className="size-[18px]" strokeWidth={2} />
                    Upload Your Rep
                  </PrimaryButton>
                </div>

                <div>
                  {/* A field label, not a card heading — SectionTitle's 22px is
                      wrong here, so this is plain condensed type instead. */}
                  <p className="ht-heading text-[14px] tracking-[0.04em] text-ht-ink">
                    Playback Speed
                  </p>
                  <div className="mt-2 grid grid-cols-4 overflow-hidden rounded-xl border border-ht-line">
                    {SPEEDS.map((speed, index) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setRate(speed)}
                        aria-pressed={rate === speed}
                        className={cn(
                          'py-2.5 text-[15px] transition-colors',
                          index > 0 && 'border-l border-ht-line',
                          rate === speed
                            ? 'bg-ht-orange text-white'
                            : 'bg-ht-surface text-ht-ink hover:bg-ht-chip',
                        )}
                      >
                        {speed.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </div>

                {isTrainer ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <InlineRename
                      value={selected.title}
                      onSave={(v) => renameMove(selected.id, v)}
                      variant="h4"
                    />
                    {selected.youtube_url ? (
                      <button
                        type="button"
                        onClick={() => setClipping(open => !open)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ht-line px-3 py-1.5 text-[13px] text-ht-ink transition-colors hover:bg-ht-chip"
                      >
                        <Scissors className="size-3.5" strokeWidth={2} />
                        {clipping ? 'Cancel' : 'Edit Clip'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => deleteMove(selected.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ht-line px-3 py-1.5 text-[13px] text-ht-red transition-colors hover:bg-ht-red-tint"
                    >
                      <Trash2 className="size-3.5" strokeWidth={2} />
                      Delete
                    </button>
                  </div>
                ) : null}

                {clipping && selected.youtube_url ? (
                  <Card>
                    <YouTubeClipper
                      url={selected.youtube_url}
                      initialStart={selected.clip_start || 0}
                      initialEnd={selected.clip_end || 0}
                      onClipChange={(start, end) => setPendingClip({ start, end })}
                    />
                    <div className="mt-3">
                      <PrimaryButton
                        onClick={() => saveClip(selected.id, pendingClip.start, pendingClip.end)}
                      >
                        Save Clip
                      </PrimaryButton>
                    </div>
                  </Card>
                ) : null}

                {studying ? (
                  <Card>
                    <SectionTitle>About This Move</SectionTitle>
                    <p className="mt-2 text-[15px] leading-[1.5] text-ht-ink">
                      {selected.description || 'No teaching notes on this move yet.'}
                    </p>
                    {selected.clip_start != null && selected.clip_end != null ? (
                      <p className="mt-2 text-[13px] text-ht-muted">
                        Clip {clipLabel(selected.clip_start)} – {clipLabel(selected.clip_end)}
                      </p>
                    ) : null}
                    {/* /api/messages/thread only admits a move's creator or the
                        player it is assigned to — anyone else 403s, so the
                        thread is not rendered for them at all. */}
                    {isTrainer || (userId != null && selected.assigned_to_player_id === userId) ? (
                      <div className="mt-3">
                        <EntityChat
                          contextType="move"
                          contextId={selected.id}
                          contextTitle={selected.title}
                          compact
                          embedded
                        />
                      </div>
                    ) : null}
                  </Card>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="space-y-3">
            {filtered
              .filter(move => move.id !== selected?.id)
              .map(move => (
                <MoveRow key={move.id} move={move} onSelect={() => setSelectedId(move.id)} />
              ))}
            {isTrainer ? <AIMoveRecommendations onAdded={fetchMoves} /> : null}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- sub-pieces */

function UploadedVideoPlayer({ src, rate }: { src: string; rate: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      playsInline
      onLoadedMetadata={() => {
        if (videoRef.current) videoRef.current.playbackRate = rate
      }}
      className="aspect-video w-full rounded-xl bg-black object-contain"
    />
  )
}

/**
 * The pack draws the hero as a poster with a play button, so the player is
 * mounted on that press rather than on load — which also keeps a third-party
 * YouTube frame off the screen until it is actually wanted.
 */
function MoveHero({
  move,
  source,
  rate,
}: {
  move: Move
  source: string | null
  rate: number
}) {
  const [playing, setPlaying] = useState(false)

  // Selecting another move returns to its poster instead of carrying playback.
  useEffect(() => setPlaying(false), [move.id])

  if (playing && source === 'upload' && move.video_path) {
    return <UploadedVideoPlayer src={move.video_path} rate={rate} />
  }

  if (playing && source === 'youtube') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <YouTubeEmbed
          url={move.youtube_url}
          clipStart={move.clip_start}
          clipEnd={move.clip_end}
          defaultPlaybackRate={rate}
          showSpeedControl={false}
          autoplay
        />
      </div>
    )
  }

  return <MovePoster move={move} onPlay={source ? () => setPlaying(true) : null} />
}

/** The design's hero card: dark poster, copy on the left, play mark centred. */
function MovePoster({ move, onPlay }: { move: Move; onPlay: (() => void) | null }) {
  const duration = durationLabel(move)

  const card = (
    <>
      {/* Untitled on purpose: the poster captions itself with the title, which
          this card already sets in display type on top of it. */}
      <ClipPoster className="absolute inset-0 rounded-none" />
      {/* Darkens only the copy's half, so a long coach name stays legible where
          it crosses the poster's play mark. A wide card has room for both, so
          the scrim pulls back there and leaves the mark at full strength. */}
      <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-black from-[62%] to-transparent lg:w-[45%]" />
      <div className="relative flex h-full max-w-[58%] flex-col justify-center px-5 text-left">
        <h2 className="ht-heading text-[25px] leading-tight text-white">{move.title}</h2>
        <p className="mt-2 text-[15px] text-white/85">{byline(move)}</p>
        {duration ? <p className="mt-1 text-[15px] text-white/85">{duration}</p> : null}
        <div className="mt-3">
          <Pill tone="orange" className="border-ht-orange bg-transparent">
            {move.category}
          </Pill>
        </div>
      </div>
      {onPlay ? null : (
        <span className="absolute right-4 bottom-3 text-[12px] text-white/60">No video yet</span>
      )}
    </>
  )

  const shell = 'relative block aspect-[2.2/1] w-full overflow-hidden rounded-xl bg-ht-ink'

  // The poster's own play mark is the affordance, so the whole card is the
  // button rather than stacking a second play glyph on top of it.
  if (!onPlay) return <div className={shell}>{card}</div>

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${move.title}`}
      className={cn(shell, 'transition-opacity hover:opacity-90')}
    >
      {card}
    </button>
  )
}

function MoveRow({ move, onSelect }: { move: Move; onSelect: () => void }) {
  return (
    <Card padded={false}>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3.5 p-3 text-left transition-colors hover:bg-ht-chip/50"
      >
        {/* The pack shows a video frame here. Without a file on disk the
            placeholder poster stands in, zoomed past its caption. */}
        <span className="block h-[60px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-ht-ink">
          <ClipPoster title={move.title} className="scale-[1.6] rounded-none" />
        </span>
        <span className="min-w-0 flex-1">
          {/* Measured off 007: the row title's cap height is 13.54css (18.5px in
              this face) and the byline's is 8.58css (12px). Ours had the title
              at 16px and the byline at 14px, which flattened the pack's
              hierarchy — the title reads as the row, the byline as a footnote. */}
          <span className="ht-heading block truncate text-[18.5px] text-ht-ink">{move.title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-ht-muted">{byline(move)}</span>
          <span className="mt-1.5 block">
            <Pill tone="orange" className="bg-transparent">
              {move.category}
            </Pill>
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
      </button>
    </Card>
  )
}
