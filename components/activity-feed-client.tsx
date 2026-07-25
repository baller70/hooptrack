'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CircleHelp,
  Film,
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Trophy,
  UploadCloud,
  Users,
  Video,
} from 'lucide-react'
import {
  Avatar,
  Card,
  ClipPoster,
  DataTable,
  EmptyState,
  GhostButton,
  Pill,
  SectionTitle,
  Td,
} from '@/components/ht/primitives'
import FilmReview, {
  clipName,
  clock,
  fullDate,
  parseAt,
  type Recording,
} from '@/components/film-review'
import { cn } from '@/lib/utils'

/* Implements two breakpoints of /coach/activity:
 *   lg+   web-desktop/004 — feed + film review + clips table
 *   <lg   ios/014         — the live activity feed on its own. The film panels
 *                           live on /coach/film (ios/015) at phone width, so
 *                           they are hidden here rather than stacked. */

type ActivityKind =
  | 'recording'
  | 'video_uploaded'
  | 'quiz_attempt'
  | 'schedule_completed'
  | 'pr_set'

interface ActivityItem {
  kind: ActivityKind
  at: string
  player_id: number
  player_name: string
  avatar_path: string | null
  title: string
  subtitle?: string
  meta?: { recordingId?: number; hasVideo?: boolean; score?: number; itemType?: string }
}

const FEED_PREVIEW = 4
const CLIPS_PREVIEW = 4

type FilterKey = 'all' | 'recordings' | 'assignments' | 'requests' | 'quizzes'

const FILTERS: Array<{
  key: FilterKey
  label: string
  kinds: ActivityKind[] | null
  icon?: typeof Video
  /** 014 adds a Quizzes chip; 004 has no room for a fifth chip. */
  mobileOnly?: boolean
}> = [
  { key: 'all', label: 'All', kinds: null },
  { key: 'recordings', label: 'Recordings', kinds: ['recording', 'video_uploaded'], icon: Video },
  {
    key: 'assignments',
    label: 'Assignments',
    kinds: ['schedule_completed', 'quiz_attempt'],
    icon: ClipboardCheck,
  },
  // /api/activity emits no request kind today, so this chip is intentionally empty.
  { key: 'requests', label: 'Requests', kinds: [], icon: Users },
  { key: 'quizzes', label: 'Quizzes', kinds: ['quiz_attempt'], icon: CircleHelp, mobileOnly: true },
]

/** Coarse grouping that drives each card's tile and trailing action. */
type Group = 'recording' | 'assignment' | 'quiz' | 'request'

function groupFor(kind: ActivityKind): Group {
  if (kind === 'recording' || kind === 'video_uploaded' || kind === 'pr_set') return 'recording'
  if (kind === 'quiz_attempt') return 'quiz'
  return 'assignment'
}

function daysAgo(at: Date) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((startOfDay(new Date()) - startOfDay(at)) / 86_400_000)
}

/** Feed timestamps: time today, "Yesterday", then "May 10". */
function feedTime(value: string) {
  const at = parseAt(value)
  if (Number.isNaN(at.getTime())) return value
  const days = daysAgo(at)
  if (days <= 0) return at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** 014 shows the day and the clock together: "Today 10:24 AM". */
function feedTimeLong(value: string) {
  const at = parseAt(value)
  if (Number.isNaN(at.getTime())) return value
  const clockPart = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const days = daysAgo(at)
  if (days <= 0) return `Today ${clockPart}`
  if (days === 1) return `Yesterday ${clockPart}`
  return `${at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${clockPart}`
}

function feedVerb(kind: ActivityKind) {
  if (kind === 'recording' || kind === 'video_uploaded') return 'uploaded'
  if (kind === 'pr_set') return 'set a PR on'
  return 'completed'
}

/**
 * The design's three status colours, mapped onto what a recording row can
 * actually tell us: a file on disk, coach notes against the clip, or neither.
 * There is no "accepted" state on a recording — see report.
 */
function ClipStatus({ clip }: { clip: Recording }) {
  if (clip.video_path) return <Pill tone="blue">Uploaded</Pill>
  if ((clip.feedback_count ?? 0) > 0) return <Pill tone="green">Reviewed</Pill>
  return <Pill tone="neutral">Recorded</Pill>
}

function FeedIcon({ kind }: { kind: ActivityKind }) {
  if (kind === 'recording' || kind === 'video_uploaded') {
    return <UploadCloud className="size-[22px] shrink-0 text-ht-orange" strokeWidth={1.8} />
  }
  if (kind === 'pr_set') {
    return <Trophy className="size-[22px] shrink-0 text-ht-orange" strokeWidth={1.8} />
  }
  return <CheckCircle2 className="size-[22px] shrink-0 text-ht-green" strokeWidth={1.8} />
}

/** ViewAllLink's look, but it expands the list in place instead of routing. */
function ViewAllToggle({
  expanded,
  onClick,
  children,
}: {
  expanded: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ht-heading flex w-full items-center justify-center gap-1.5 py-3 text-[14px] tracking-[0.04em] text-ht-orange hover:underline"
    >
      {children}
      <ChevronRight
        className={cn('size-4 transition-transform', expanded && '-rotate-90')}
        strokeWidth={2.5}
      />
    </button>
  )
}

export default function ActivityFeedClient() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [feedExpanded, setFeedExpanded] = useState(false)
  const [clipsExpanded, setClipsExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [menuId, setMenuId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [activityRes, recordingsRes] = await Promise.all([
      fetch('/api/activity?limit=100', { cache: 'no-store' }),
      fetch('/api/recordings', { cache: 'no-store' }),
    ])
    const activity = activityRes.ok ? await activityRes.json() : { items: [] }
    const clips = recordingsRes.ok ? await recordingsRes.json() : { recordings: [] }
    setItems(activity.items ?? [])
    setRecordings(clips.recordings ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    load()
      .catch(() => {
        if (!cancelled) toast.error('Could not load activity')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await load()
      toast.success('Activity refreshed')
    } catch {
      toast.error('Could not refresh activity')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (menuId == null) return
    const onDown = () => setMenuId(null)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  const byId = useMemo(() => new Map(recordings.map((r) => [r.id, r])), [recordings])

  // Newest clip with a runtime is featured until the coach picks another one;
  // a zero-second row gives the player and phase strip nothing to show.
  const selected = useMemo(() => {
    if (selectedId != null) return byId.get(selectedId) ?? null
    return recordings.find((r) => r.duration_seconds > 0) ?? recordings[0] ?? null
  }, [byId, recordings, selectedId])

  const filtered = useMemo(() => {
    const kinds = FILTERS.find((f) => f.key === filter)?.kinds
    if (!kinds) return items
    return items.filter((item) => kinds.includes(item.kind))
  }, [items, filter])

  const feedRows = feedExpanded ? filtered : filtered.slice(0, FEED_PREVIEW)
  const clipRows = clipsExpanded ? recordings : recordings.slice(0, CLIPS_PREVIEW)

  /** 014 card: media tile, orange rule, who/what/when, per-kind action. */
  const renderMobileCard = (item: ActivityItem, index: number) => {
    const recording = item.meta?.recordingId ? byId.get(item.meta.recordingId) : undefined
    const label = recording ? clipName(recording) : item.title
    const group = groupFor(item.kind)

    const tile =
      group === 'recording' ? (
        <span className="relative flex size-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ht-ink">
          {recording ? <ClipPoster title={label} className="absolute inset-0 rounded-none" /> : null}
          <span className="relative flex size-8 items-center justify-center rounded-full border-2 border-white/90">
            <Play className="ml-0.5 size-3.5 fill-white text-white" />
          </span>
        </span>
      ) : (
        <span className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-ht-orange-tint">
          {group === 'quiz' ? (
            <CircleHelp className="size-9 text-ht-orange" strokeWidth={1.7} />
          ) : group === 'request' ? (
            <Users className="size-9 text-ht-orange" strokeWidth={1.7} />
          ) : (
            <ClipboardCheck className="size-9 text-ht-orange" strokeWidth={1.7} />
          )}
        </span>
      )

    let action: React.ReactNode
    if (group === 'recording') {
      action = (
        <span className="ht-heading flex shrink-0 items-center gap-0.5 text-[12px] tracking-[0.02em] text-ht-orange">
          Open Recording
          <ChevronRight className="size-4 shrink-0" strokeWidth={2.5} />
        </span>
      )
    } else if (group === 'request') {
      action = (
        <span className="ht-heading flex shrink-0 items-center gap-0.5 text-[12px] tracking-[0.02em] text-ht-orange">
          View Request
          <ChevronRight className="size-4 shrink-0" strokeWidth={2.5} />
        </span>
      )
    } else if (group === 'quiz' && item.meta?.score != null) {
      action = (
        <span className="shrink-0 rounded-lg border border-ht-green/30 bg-ht-green-tint px-2.5 py-1.5 text-center">
          <span className="ht-heading block text-[16px] leading-none text-ht-green">
            {item.meta.score}%
          </span>
          <span className="mt-0.5 block text-[10px] text-ht-green">Score</span>
        </span>
      )
    } else {
      action = (
        <Pill tone="green" className="shrink-0 gap-1">
          <CheckCircle2 className="size-3.5" strokeWidth={2.2} />
          Completed
        </Pill>
      )
    }

    const body = (
      <>
        {tile}
        <span className="w-[3px] shrink-0 self-stretch rounded-full bg-ht-orange" />
        <span className="min-w-0 flex-1">
          <span className="ht-heading block truncate text-[14px] text-ht-ink">
            {item.player_name}
          </span>
          <span className="block text-[12px] text-ht-muted">{feedVerb(item.kind)}</span>
          <span className="block truncate text-[14px] font-semibold text-ht-ink">{label}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ht-muted">
            <Clock className="size-3" strokeWidth={2} />
            {feedTimeLong(item.at)}
          </span>
        </span>
        {action}
      </>
    )

    const shell =
      'flex w-full items-center gap-2 rounded-xl border border-ht-line bg-ht-surface p-2.5 text-left'
    const key = `m-${item.kind}-${item.at}-${index}`

    // At phone width the film review is its own screen (015), so a recording
    // card navigates there instead of selecting in place.
    return recording ? (
      <Link key={key} href={`/coach/film?clip=${recording.id}`} className={shell}>
        {body}
      </Link>
    ) : (
      <div key={key} className={shell}>
        {body}
      </div>
    )
  }

  return (
    <div className="mt-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- FEED */}
        <Card
          padded={false}
          className="flex min-w-0 flex-col max-lg:border-0 max-lg:bg-transparent"
        >
          <div className="min-w-0 px-5 pt-5 max-lg:px-0 max-lg:pt-0">
            <SectionTitle className="max-lg:hidden">Activity Feed</SectionTitle>
            {/* All five wrap onto a second row on the phone; 004's four sit on
                one line at lg. Either way the page never widens. */}
            <div className="flex flex-wrap gap-1.5 pb-1 lg:mt-3.5 lg:flex-nowrap">
              {FILTERS.map((chip) => {
                const active = chip.key === filter
                const Icon = chip.icon
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setFilter(chip.key)
                      setFeedExpanded(false)
                    }}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 font-sans text-[13px] whitespace-nowrap transition-colors',
                      'lg:rounded-md lg:px-2.5 lg:py-1',
                      chip.mobileOnly && 'lg:hidden',
                      active
                        ? 'border-ht-orange bg-ht-orange text-white lg:bg-white lg:text-ht-orange'
                        : 'border-ht-line bg-white text-ht-ink hover:border-ht-ring lg:text-ht-muted',
                    )}
                  >
                    {Icon ? <Icon className="size-4 shrink-0 lg:hidden" strokeWidth={1.9} /> : null}
                    {chip.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            className={cn(
              'mt-2 min-w-0 flex-1 px-5 max-lg:px-0',
              feedExpanded && 'lg:max-h-[420px] lg:overflow-y-auto',
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-[14px] text-ht-muted">
                <Loader2 className="size-4 animate-spin" /> Loading activity…
              </div>
            ) : feedRows.length === 0 ? (
              <EmptyState
                icon={Film}
                title="Nothing here yet"
                body={
                  filter === 'requests'
                    ? 'Team requests are not part of the activity feed yet.'
                    : 'Player activity will show up here as it happens.'
                }
              />
            ) : (
              <>
                {/* Phone: 014 cards. Desktop: 004 hairline rows. */}
                <div className="flex flex-col gap-2.5 lg:hidden">
                  {feedRows.map(renderMobileCard)}
                </div>

                <div className="max-lg:hidden">
                  {feedRows.map((item, index) => {
                    const recording = item.meta?.recordingId
                      ? byId.get(item.meta.recordingId)
                      : undefined
                    const label = recording ? clipName(recording) : item.title
                    const isSelected = !!recording && recording.id === selected?.id
                    return (
                      <button
                        key={`${item.kind}-${item.at}-${index}`}
                        type="button"
                        disabled={!recording}
                        onClick={() => recording && setSelectedId(recording.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 border-b border-ht-line-soft py-3.5 text-left',
                          recording ? 'cursor-pointer' : 'cursor-default',
                          isSelected && 'bg-ht-orange-tint/50',
                        )}
                      >
                        <FeedIcon kind={item.kind} />
                        <Avatar name={item.player_name} src={item.avatar_path} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[15px] font-semibold text-ht-ink">
                              {item.player_name}
                            </span>
                            <span className="shrink-0 text-[12.5px] text-ht-muted">
                              {feedTime(item.at)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[14px] text-ht-muted">
                            {feedVerb(item.kind)} <span className="text-ht-orange">{label}</span>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="px-5 pb-1 max-lg:px-0">
            {filtered.length > FEED_PREVIEW ? (
              <ViewAllToggle
                expanded={feedExpanded}
                onClick={() => setFeedExpanded((open) => !open)}
              >
                {feedExpanded ? 'Show Less' : 'View All Activity'}
              </ViewAllToggle>
            ) : null}
            {/* 014 closes the feed with a Refresh button. */}
            <div className="pb-3 lg:hidden">
              <GhostButton onClick={refresh} disabled={refreshing} className="normal-case">
                {refreshing ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : (
                  <RefreshCw className="size-[18px]" strokeWidth={2} />
                )}
                Refresh
              </GhostButton>
            </div>
          </div>
        </Card>

        {/* Film review is its own screen on the phone (015), so both of its
            blocks sit out below lg. `contents` keeps them as grid children. */}
        <div className="contents max-lg:hidden">
          <FilmReview clip={selected} loading={loading} />
        </div>
      </div>

      {/* --------------------------------------------------- RECENT CLIPS */}
      <Card className="mt-4 max-lg:hidden">
        <SectionTitle>Recent Clips</SectionTitle>
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[14px] text-ht-muted">
              <Loader2 className="size-4 animate-spin" /> Loading clips…
            </div>
          ) : clipRows.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No clips yet"
              body="Recorded clips from your roster will be listed here."
            />
          ) : (
            <DataTable
              columns={['Player', 'Clip', 'Date', 'Status', 'Type', 'Duration', 'Actions']}
            >
              {clipRows.map((clip) => {
                const isClip = clip.parent_recording_id != null
                return (
                  <tr key={clip.id} className="border-b border-ht-line-soft last:border-0">
                    <Td>
                      <span className="flex items-center gap-3">
                        <Avatar
                          name={clip.player_name ?? '?'}
                          src={clip.avatar_path}
                          size={28}
                        />
                        <span className="truncate">{clip.player_name ?? 'Unknown'}</span>
                      </span>
                    </Td>
                    <Td>{clipName(clip)}</Td>
                    <Td className="whitespace-nowrap">{fullDate(clip.recorded_at)}</Td>
                    <Td>
                      <ClipStatus clip={clip} />
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        {isClip ? (
                          <Film className="size-4 text-ht-muted" strokeWidth={1.8} />
                        ) : (
                          <Video className="size-4 text-ht-muted" strokeWidth={1.8} />
                        )}
                        {isClip ? 'Clip' : 'Recording'}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{clock(clip.duration_seconds)}</Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Review ${clipName(clip)}`}
                          onClick={() => setSelectedId(clip.id)}
                          className="flex size-8 items-center justify-center rounded-md border border-ht-line text-ht-ink hover:border-ht-orange hover:text-ht-orange"
                        >
                          <Play className="size-3.5 fill-current" />
                        </button>
                        <span className="relative">
                          <button
                            type="button"
                            aria-label={`More actions for ${clipName(clip)}`}
                            aria-expanded={menuId === clip.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              setMenuId(menuId === clip.id ? null : clip.id)
                            }}
                            className="flex size-8 items-center justify-center rounded-md border border-ht-line text-ht-ink hover:border-ht-orange hover:text-ht-orange"
                          >
                            <MoreHorizontal className="size-4" strokeWidth={2} />
                          </button>
                          {menuId === clip.id ? (
                            <span className="absolute right-0 top-full z-20 mt-1 block w-44 overflow-hidden rounded-lg border border-ht-line bg-white shadow-lg">
                              <Link
                                href={`/coach/film?clip=${clip.id}`}
                                className="block px-3 py-2.5 text-[13px] text-ht-ink hover:bg-ht-chip"
                              >
                                Open film review
                              </Link>
                              <Link
                                href={`/coach/players/${clip.player_id}`}
                                className="block border-t border-ht-line-soft px-3 py-2.5 text-[13px] text-ht-ink hover:bg-ht-chip"
                              >
                                Player profile
                              </Link>
                              <Link
                                href="/coach/comparison"
                                className="block border-t border-ht-line-soft px-3 py-2.5 text-[13px] text-ht-ink hover:bg-ht-chip"
                              >
                                Compare clips
                              </Link>
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Td>
                  </tr>
                )
              })}
            </DataTable>
          )}
        </div>

        {recordings.length > CLIPS_PREVIEW ? (
          <ViewAllToggle expanded={clipsExpanded} onClick={() => setClipsExpanded((open) => !open)}>
            {clipsExpanded ? 'Show Less' : 'View All Clips'}
          </ViewAllToggle>
        ) : null}
      </Card>
    </div>
  )
}
