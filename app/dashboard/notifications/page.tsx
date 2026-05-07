'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Dumbbell, PlayCircle, GraduationCap, MessageSquareQuote, Trophy, Flame, Info, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
}

const FILTERS = ['all', 'unread', 'workouts', 'moves', 'quizzes', 'prs'] as const
type Filter = typeof FILTERS[number]

function fmt(iso: string): string {
  return new Date(iso).toLocaleString()
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

  useEffect(() => { load() }, [])

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
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-[family-name:var(--font-russo)] text-2xl flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </h2>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-semibold capitalize rounded-md border-2 ${
              filter === f
                ? 'border-black bg-black text-white'
                : 'border-input bg-background hover:border-black'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">Nothing here.</p>
      )}

      <div className="space-y-2">
        {filtered.map((n) => {
          const Icon = TYPE_ICON[n.type] || Info
          return (
            <button
              key={n.id}
              onClick={() => markRead(n)}
              className={`w-full text-left bg-white border-2 border-black rounded-xl p-4 flex items-start gap-3 shadow-[3px_3px_0px_0px_#0A0A0A] hover:shadow-[1px_1px_0px_0px_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${!n.read_at ? 'bg-orange-50' : ''}`}
            >
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${!n.read_at ? 'text-hoop-orange' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read_at ? 'font-semibold' : ''}`}>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="h-2.5 w-2.5 rounded-full bg-hoop-orange shrink-0 mt-1.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
