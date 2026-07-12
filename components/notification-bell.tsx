'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, BellOff, Dumbbell, PlayCircle, GraduationCap, MessageSquareQuote, Trophy, Flame, Info, Check, BellRing } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Notification {
  id: number
  player_id: number
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

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const sec = Math.floor((Date.now() - then) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  return `${Math.floor(sec / 86400)}d ago`
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  const [pushEnabled, setPushEnabled] = useState<'unknown' | 'granted' | 'denied' | 'default'>('unknown')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef<number | null>(null)

  const playReminderSound = useCallback(() => {
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return
      const ctx = new AudioContextCtor()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.36)
    } catch {}
  }, [])

  const fetchCount = useCallback(async () => {
    try {
      await fetch('/api/notifications/due', { method: 'POST', cache: 'no-store' }).catch(() => null)
      const r = await fetch('/api/notifications/unread-count', { cache: 'no-store' })
      const d = await r.json()
      const nextCount = d.count || 0
      if (lastCountRef.current !== null && nextCount > lastCountRef.current) {
        playReminderSound()
      }
      lastCountRef.current = nextCount
      setCount(nextCount)
    } catch {}
  }, [playReminderSound])

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications?limit=20', { cache: 'no-store' })
      const d = await r.json()
      setItems(d.notifications || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchCount()
    const t = setInterval(fetchCount, 30_000)
    return () => clearInterval(t)
  }, [fetchCount])

  useEffect(() => {
    if (open) fetchItems()
  }, [open, fetchItems])

  // Click-outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Push permission state
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPushEnabled(Notification.permission as 'granted' | 'denied' | 'default')
  }, [])

  async function markRead(n: Notification) {
    if (!n.read_at) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' })
      setItems(items.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
      setCount(Math.max(0, count - 1))
    }
    setOpen(false)
    if (n.link_url) router.push(n.link_url)
  }

  async function markAllRead() {
    const r = await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    if (r.ok) {
      setCount(0)
      setItems(items.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })))
    }
  }

  async function enablePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Your browser does not support notifications.')
      return
    }
    const perm = await Notification.requestPermission()
    setPushEnabled(perm as 'granted' | 'denied' | 'default')
    if (perm !== 'granted') return

    try {
      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { console.error('VAPID key missing'); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          user_agent: navigator.userAgent,
        }),
      })
    } catch (err) {
      console.error('Push subscribe failed:', err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b-2 border-gray-100">
            <h4 className="font-[family-name:var(--font-russo)] text-sm">Notifications</h4>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button onClick={markAllRead} className="text-xs text-purple-700 hover:text-purple-900 font-medium">
                  Mark all read
                </button>
              )}
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>
          </div>

          {/* Push enable banner */}
          {pushEnabled === 'default' && (
            <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between gap-2">
              <p className="text-xs text-orange-900">Get notified even when the app is closed.</p>
              <button onClick={enablePush} className="text-xs font-semibold bg-black text-white px-2 py-1 rounded hover:opacity-90 flex items-center gap-1">
                <BellRing className="h-3 w-3" /> Turn on
              </button>
            </div>
          )}
          {pushEnabled === 'denied' && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BellOff className="h-3 w-3" /> Push is blocked in browser settings.
              </p>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICON[n.type] || Info
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 flex items-start gap-2 ${!n.read_at ? 'bg-orange-50' : ''}`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${!n.read_at ? 'text-hoop-orange' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read_at ? 'font-semibold' : ''}`}>{n.message}</p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-hoop-orange shrink-0 mt-1.5" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
