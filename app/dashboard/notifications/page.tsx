'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BellOff,
  Check,
  Dumbbell,
  Flame,
  GraduationCap,
  Info,
  MessageSquareQuote,
  PlayCircle,
  Trophy,
  UserRoundPlus,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, EmptyState, GhostButton, PageTitle, Pill } from '@/components/ht/primitives'

interface Notification {
  id: number
  message: string
  type: string
  link_url: string | null
  read_at: string | null
  created_at: string
}

const TYPE_ICON: Record<string, LucideIcon> = {
  workout_assigned: Dumbbell,
  workout_completed: Check,
  move_assigned: PlayCircle,
  quiz_assigned: GraduationCap,
  quote_assigned: MessageSquareQuote,
  pr_set: Trophy,
  streak_milestone: Flame,
  reminder: Bell,
  inspirational: MessageSquareQuote,
  system: Info,
  team_invite: UserRoundPlus,
  message_received: MessageSquareQuote,
  video_uploaded: Video,
}

const FILTERS = ['all', 'unread', 'workouts', 'moves', 'quizzes', 'prs'] as const
type Filter = typeof FILTERS[number]

function fmt(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const ms = Date.now() - then
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/notifications?limit=100', { cache: 'no-store' })
    const d = await r.json()
    setItems(d.notifications || [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setItems/setLoading are in the async fetch chain
    load()
  }, [])

  async function markRead(n: Notification) {
    if (!n.read_at) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' })
      setItems(items.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
    }
    if (n.link_url) router.push(n.link_url)
  }

  async function markAllRead() {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    load()
  }

  const unreadCount = items.filter((n) => !n.read_at).length

  const filtered = items.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read_at
    if (filter === 'workouts') return n.type === 'workout_assigned' || n.type === 'workout_completed'
    if (filter === 'moves') return n.type === 'move_assigned'
    if (filter === 'quizzes') return n.type === 'quiz_assigned'
    if (filter === 'prs') return n.type === 'pr_set' || n.type === 'streak_milestone'
    return true
  })

  return (
    <div className="pt-2 lg:max-w-3xl">
      {/* Wraps on phones — the title, count and action do not fit on one 390px row. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
        <div className="flex items-center gap-3">
          <PageTitle>Notifications</PageTitle>
          {unreadCount > 0 ? <Pill tone="orange">{unreadCount} new</Pill> : null}
        </div>
        {unreadCount > 0 ? (
          <GhostButton onClick={markAllRead} className="ml-auto w-auto shrink-0 px-4 py-2 text-[13px]">
            Mark All Read
          </GhostButton>
        ) : null}
      </div>

      {/* Bleeds to the screen edge so a clipped chip reads as "scroll for more". */}
      <div className="-mx-5 mt-4 flex gap-2.5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-[14px] whitespace-nowrap capitalize transition-colors',
                active
                  ? 'border-ht-orange bg-ht-orange font-semibold text-white'
                  : 'border-ht-line bg-ht-surface text-ht-ink hover:bg-ht-chip',
              )}
            >
              {f}
            </button>
          )
        })}
      </div>

      <div className="mt-3.5 space-y-3">
        {loading ? (
          <Card>
            <EmptyState icon={Bell} title="Loading notifications" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellOff}
              title={filter === 'all' ? 'No notifications yet' : 'Nothing in this filter'}
              body={
                filter === 'all'
                  ? 'Assignments, team requests and milestones land here.'
                  : 'Try another filter to see the rest.'
              }
            />
          </Card>
        ) : (
          filtered.map((n) => {
            const Icon = TYPE_ICON[n.type] || Info
            const unread = !n.read_at
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n)}
                className={cn(
                  'flex w-full items-start gap-3.5 rounded-xl border px-4 py-4 text-left transition-colors',
                  unread
                    ? 'border-ht-orange/40 bg-ht-orange-tint hover:bg-ht-orange-soft'
                    : 'border-ht-line bg-ht-surface hover:bg-ht-chip/60',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    unread ? 'bg-ht-orange' : 'bg-ht-chip',
                  )}
                >
                  <Icon
                    className={cn('size-5', unread ? 'text-white' : 'text-ht-muted')}
                    strokeWidth={1.8}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[15px] leading-6 whitespace-pre-line',
                      unread ? 'font-semibold text-ht-ink' : 'text-ht-muted',
                    )}
                  >
                    {n.message}
                  </span>
                  <span className="mt-1 block text-[13px] text-ht-muted">{fmt(n.created_at)}</span>
                </span>

                {unread ? (
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-ht-orange" />
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
