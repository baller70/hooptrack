'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Copy,
  Film,
  Loader2,
  Maximize,
  MessageSquare,
  MoreVertical,
  Pause,
  Play,
  PlusCircle,
  X,
} from 'lucide-react'
import {
  Card,
  ClipPoster,
  GhostButton,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'
import { cn } from '@/lib/utils'

/* The film-review surface shared by two screens:
 *   web-desktop/004 — as the middle + right columns of /coach/activity
 *   ios/015        — stacked on its own /coach/film route
 *
 * Renders as a fragment of exactly two blocks (stage, feedback) so the caller
 * can drop it straight into a grid or stack it in a flex column. */

export interface Recording {
  id: number
  player_id: number
  player_name: string | null
  avatar_path: string | null
  title: string | null
  drill_name: string
  drill_category: string | null
  workout_title: string
  duration_seconds: number
  recorded_at: string
  video_path: string | null
  parent_recording_id: number | null
  /** Coach notes already posted against this clip. */
  feedback_count?: number
}

interface ThreadMessage {
  id: number
  sender_id: number
  sender_name: string
  body: string
  created_at: string
}

const MAX_FEEDBACK = 500
const RATES = [1, 1.5, 2]

/** The four review phases in the design. No table backs these — see report. */
const PHASES = ['Setup', 'Footwork', 'Release', 'Follow Through']

/** SQLite hands back "YYYY-MM-DD HH:MM:SS", which Safari refuses to parse. */
export function parseAt(value: string) {
  return new Date(value.includes('T') ? value : value.replace(' ', 'T'))
}

export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function fullDate(value: string) {
  const at = parseAt(value)
  if (Number.isNaN(at.getTime())) return value
  return at.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function clipName(recording: Recording) {
  return recording.title || recording.drill_name
}

export default function FilmReview({ clip, loading }: { clip: Recording | null; loading?: boolean }) {
  const [phase, setPhase] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [rate, setRate] = useState(0)

  const [videoBroken, setVideoBroken] = useState(false)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [feedback, setFeedback] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [posting, setPosting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const clipId = clip?.id ?? null
  const duration = clip?.duration_seconds ?? 0
  // A row can carry a video_path whose file is gone from disk; treat that the
  // same as no video rather than leaving a dead <video> on screen.
  const hasVideo = !!clip?.video_path && !videoBroken

  const loadThread = useCallback(async (id: number) => {
    const res = await fetch(
      `/api/messages/thread?context_type=recording&context_id=${id}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return
    const json = (await res.json()) as { messages?: ThreadMessage[] }
    setThread(json.messages ?? [])
  }, [])

  // Reset per-clip state and pull that clip's existing coach notes.
  useEffect(() => {
    setPhase(0)
    setElapsed(0)
    setPlaying(false)
    setFeedback('')
    setThread([])
    setVideoBroken(false)
    if (!clip) return
    const seeds = [clip.drill_category, clip.drill_name].filter(
      (value): value is string => !!value,
    )
    setFocusAreas(Array.from(new Set(seeds)))
    loadThread(clip.id).catch(() => {})
  }, [clip, loadThread])

  /** Even split of the clip's real runtime; there is no per-phase table. */
  const phases = useMemo(() => {
    const base = Math.floor(duration / PHASES.length)
    const last = PHASES.length - 1
    return PHASES.map((label, index) => ({
      label,
      start: base * index,
      length: Math.max(0, index === last ? duration - base * last : base),
    }))
  }, [duration])

  const togglePlay = () => {
    if (!hasVideo) {
      toast.error('This clip has no video file to play.')
      return
    }
    const el = videoRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => toast.error('Playback failed'))
    else el.pause()
  }

  const seekTo = (seconds: number) => {
    setElapsed(seconds)
    if (videoRef.current) videoRef.current.currentTime = seconds
  }

  const scrub = (event: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    seekTo(ratio * duration)
  }

  const cycleRate = () => {
    const next = (rate + 1) % RATES.length
    setRate(next)
    if (videoRef.current) videoRef.current.playbackRate = RATES[next]
  }

  const submitFeedback = async () => {
    if (!clip) return
    const body = feedback.trim()
    if (!body) {
      toast.error('Write your feedback before sending it.')
      return
    }
    setPosting(true)
    try {
      const areas = focusAreas.length ? `\n\nFocus areas: ${focusAreas.join(', ')}` : ''
      const res = await fetch('/api/messages/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context_type: 'recording',
          context_id: clip.id,
          context_title: clipName(clip),
          body: `${body}${areas}`,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Feedback failed (${res.status})`)
      }
      toast.success(`Feedback sent to ${clip.player_name ?? 'player'}`)
      setFeedback('')
      if (clipId != null) await loadThread(clipId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post feedback')
    } finally {
      setPosting(false)
    }
  }

  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0

  return (
    <>
      {/* Desktop: one dark card holding stage + phases. Phone (015): dark
          video card, then the phases in their own light card. */}
      <div className="flex min-w-0 flex-col lg:overflow-hidden lg:rounded-xl lg:bg-ht-ink">
        {clip ? (
          <>
            <div
              ref={stageRef}
              className="flex flex-col overflow-hidden rounded-xl bg-ht-ink text-white lg:rounded-none"
            >
              <div className="relative flex min-h-[230px] flex-1 items-center justify-center bg-black lg:min-h-[300px]">
                {hasVideo ? (
                  <video
                    ref={videoRef}
                    src={`/api/recordings/${clip.id}/video`}
                    playsInline
                    className="absolute inset-0 size-full object-contain"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
                    onEnded={() => setPlaying(false)}
                    // Silent: a missing file is a state to show, not an alert
                    // to raise on a screen the coach may not even be looking at.
                    onError={() => setVideoBroken(true)}
                  />
                ) : (
                  // No file on disk — a visibly stylised poster rather than a
                  // still that could pass for real footage.
                  <ClipPoster
                    title={clipName(clip)}
                    className="absolute inset-0 rounded-none opacity-90"
                  />
                )}

                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4 lg:p-5">
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-semibold leading-tight lg:text-[20px]">
                      {clipName(clip)}
                    </p>
                    <p className="mt-1 truncate text-[14px] text-white/85 lg:text-[15px]">
                      {clip.player_name ?? 'Unknown player'}
                    </p>
                    <p className="mt-0.5 text-[14px] text-white/85 lg:text-[15px]">
                      <span className="lg:hidden">{clock(duration)}</span>
                      <span className="max-lg:hidden">{fullDate(clip.recorded_at)}</span>
                    </p>
                  </div>
                  <MoreVertical className="size-5 shrink-0 text-white/80" strokeWidth={2} />
                </div>

                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? 'Pause clip' : 'Play clip'}
                  className="relative flex size-[76px] items-center justify-center rounded-full bg-white/95 transition-transform hover:scale-105 lg:size-[92px]"
                >
                  {playing ? (
                    <Pause className="size-8 fill-ht-ink text-ht-ink lg:size-9" />
                  ) : (
                    <Play className="ml-1.5 size-8 fill-ht-ink text-ht-ink lg:size-9" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-3 text-[13px] text-white lg:gap-3 lg:px-4">
                <span className="tabular-nums">{clock(elapsed)}</span>
                <div
                  role="slider"
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={Math.round(elapsed)}
                  tabIndex={0}
                  onClick={scrub}
                  className="relative flex h-4 min-w-0 flex-1 cursor-pointer items-center"
                >
                  <span className="h-1.5 w-full rounded-full bg-white/25" />
                  <span
                    className="absolute left-0 h-1.5 rounded-full bg-ht-orange"
                    style={{ width: `${progress}%` }}
                  />
                  <span
                    className="absolute size-3.5 -translate-x-1/2 rounded-full border-2 border-ht-orange bg-white"
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <span className="tabular-nums">{clock(duration)}</span>
                <span className="text-white/30">|</span>
                <button type="button" onClick={cycleRate} className="tabular-nums hover:text-ht-orange">
                  {RATES[rate].toFixed(1)}x
                </button>
                <button
                  type="button"
                  onClick={() => stageRef.current?.requestFullscreen?.().catch(() => {})}
                  aria-label="Fullscreen"
                >
                  <Maximize className="size-4 hover:text-ht-orange" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-ht-line bg-ht-surface p-3 lg:mt-0 lg:gap-2.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-4 lg:pb-4">
              {phases.map((segment, index) => (
                <button
                  key={segment.label}
                  type="button"
                  onClick={() => {
                    setPhase(index)
                    seekTo(segment.start)
                  }}
                  className="min-w-0 text-left"
                >
                  <span className="block text-center text-[10px] leading-tight text-ht-ink lg:text-[13px] lg:text-white/90">
                    {segment.label}
                  </span>
                  <span
                    className={cn(
                      'relative mt-1.5 flex h-[74px] items-center justify-center overflow-hidden rounded-md border-2 bg-ht-chip lg:h-[92px] lg:bg-white/[0.06]',
                      index === phase ? 'border-ht-orange' : 'border-transparent',
                    )}
                  >
                    <ClipPoster title={clipName(clip)} className="rounded-none" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] tabular-nums text-white lg:px-1.5 lg:text-[11px]">
                      {clock(segment.length)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl bg-ht-ink px-6 text-center text-white lg:min-h-[420px] lg:rounded-none">
            <div>
              {loading ? (
                <Loader2 className="mx-auto size-8 animate-spin text-white/40" />
              ) : (
                <>
                  <Film className="mx-auto size-9 text-white/25" strokeWidth={1.5} />
                  <p className="ht-heading mt-3 text-[15px]">No clips to review</p>
                  <p className="mt-1 text-[13px] text-white/50">
                    Clips appear here once your players record them.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Card className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-ht-orange lg:hidden" strokeWidth={2} />
          <SectionTitle>Coach Feedback</SectionTitle>
        </div>

        {/* 015 shows the notes already on the clip. */}
        {thread.length > 0 ? (
          <div className="mt-3 space-y-2">
            {thread.slice(-3).map((message) => (
              <p
                key={message.id}
                className="whitespace-pre-line text-[14px] leading-6 text-ht-ink"
              >
                {message.body}
              </p>
            ))}
          </div>
        ) : null}

        <div className="relative mt-3.5 rounded-lg border border-ht-line">
          <textarea
            value={feedback}
            maxLength={MAX_FEEDBACK}
            disabled={!clip}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Add your feedback for this clip..."
            className="h-[110px] w-full resize-none rounded-lg bg-transparent px-3 pb-7 pt-3 text-[14px] text-ht-ink outline-none placeholder:text-ht-muted disabled:cursor-not-allowed lg:h-[170px]"
          />
          <span className="absolute bottom-2 right-3 text-[12px] text-ht-muted">
            {feedback.length}/{MAX_FEEDBACK}
          </span>
        </div>

        <h3 className="ht-heading mt-4 text-[13px] tracking-[0.06em] text-ht-ink">Focus Areas</h3>
        <div className="mt-2.5 flex min-h-[30px] flex-wrap gap-2">
          {focusAreas.length === 0 ? (
            <span className="text-[13px] text-ht-muted">None on this clip.</span>
          ) : (
            focusAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-md border border-ht-orange bg-white px-2.5 py-1 text-[12.5px] font-medium text-ht-orange"
              >
                {area}
                <button
                  type="button"
                  aria-label={`Remove ${area}`}
                  onClick={() => setFocusAreas((list) => list.filter((v) => v !== area))}
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* 015 sets the two buttons side by side; 004 stacks them. */}
        <div className="mt-auto flex gap-3 pt-5 lg:flex-col">
          <GhostButton
            href="/coach/comparison"
            className="min-w-0 flex-1 whitespace-nowrap border-ht-ink px-3 normal-case text-ht-ink hover:bg-ht-chip lg:flex-none lg:px-5"
          >
            <Copy className="size-[18px] shrink-0" strokeWidth={2} />
            Compare
          </GhostButton>
          <PrimaryButton
            onClick={submitFeedback}
            disabled={!clip || posting}
            className="min-w-0 flex-1 whitespace-nowrap px-3 normal-case lg:flex-none lg:px-5"
          >
            {posting ? (
              <Loader2 className="size-[18px] shrink-0 animate-spin" />
            ) : (
              <PlusCircle className="size-[18px] shrink-0" strokeWidth={2} />
            )}
            Add Feedback
          </PrimaryButton>
        </div>
      </Card>
    </>
  )
}
