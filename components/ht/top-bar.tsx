'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, UserRound } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { appPath, type HoopApp } from '@/lib/app-routes'
import { Wordmark } from './brand'
import type { ShellUser } from './app-shell'

/**
 * Topbar from the desktop screens: mode chip on the left, unread bell +
 * avatar menu on the right. On mobile the wordmark moves in here because the
 * sidebar that normally carries it is hidden.
 */
export default function HtTopBar({ app, user }: { app: HoopApp; user: ShellUser }) {
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  /* 001-player-home is the one screen in the pack that stacks the wordmark —
   * HOOPTRACK over a letterspaced PLAYER, roughly twice the size it is
   * elsewhere. 003-coach-home and every inner screen set it inline instead. */
  const stackedWordmark = pathname === appPath(app)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { count?: number }
        if (!cancelled) setUnread(json.count ?? 0)
      } catch {
        // Badge is decorative — a failed poll must never break the shell.
      }
    }
    load()
    const timer = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const modeLabel = user.isImpersonating
    ? `Viewing as ${user.name}`
    : app === 'coach'
      ? 'Coach Mode'
      : 'Player Mode'

  return (
    <header className="flex items-center gap-4 px-5 pt-6 pb-2 lg:px-8">
      <Link href={appPath(app)} className="lg:hidden" aria-label="HoopTrack home">
        {stackedWordmark && app === 'player' ? (
          /* 67px / 16px: 001 measures HOOPTRACK at a 47.40css cap and PLAYER
             at 12.19css, against 31.00 and 10.00 for the shared 44px/13px the
             desktop sidebar uses. */
          <Wordmark app={app} markClassName="text-[67px]" labelClassName="text-[16px]" />
        ) : (
          <Wordmark app={app} inline className="text-[22px]" />
        )}
      </Link>

      <div
        className={cn(
          'hidden items-center gap-2 rounded-lg px-4 py-2.5 lg:inline-flex',
          user.isImpersonating ? 'bg-ht-orange-soft text-ht-orange' : 'bg-ht-chip text-ht-ink',
        )}
      >
        <UserRound className="size-4" strokeWidth={2} />
        <span className="ht-heading text-[13px] tracking-[0.06em]">{modeLabel}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Link
          href={appPath(app, '/notifications')}
          className="relative"
          aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        >
          <Bell className="size-6 text-ht-ink" strokeWidth={1.8} />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-ht-orange ring-2 ring-white" />
          ) : null}
        </Link>

        <span className="hidden h-7 w-px bg-ht-line lg:block" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2.5"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="ht-heading inline-flex size-9 items-center justify-center rounded-full bg-ht-orange-soft text-[14px] text-ht-orange">
              {user.name.trim()[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="hidden text-[16px] font-medium text-ht-ink lg:inline">
              {user.name.split(' ')[0]}
            </span>
            <ChevronDown className="hidden size-5 text-ht-muted lg:block" strokeWidth={2} />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-ht-line bg-white shadow-lg"
            >
              <Link
                href={appPath(app, '/profile')}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-3 text-[14px] text-ht-ink hover:bg-ht-chip"
                onClick={() => setMenuOpen(false)}
              >
                <UserRound className="size-4" strokeWidth={2} />
                Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="flex w-full items-center gap-3 border-t border-ht-line-soft px-4 py-3 text-left text-[14px] text-ht-ink hover:bg-ht-chip"
              >
                <LogOut className="size-4" strokeWidth={2} />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
