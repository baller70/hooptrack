'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Camera,
  ClipboardList,
  Film,
  Focus,
  SquarePlay,
  UserRound,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { appPath, type HoopApp } from '@/lib/app-routes'
import { CourtBackdrop, Wordmark } from './brand'
import HtTopBar from './top-bar'

/* The nav below intentionally mirrors components/nav-tabs.tsx one-for-one —
 * the design pack's sidebar and tab bar were generated from that same spec, so
 * the two must not drift. Order and labels come straight from the PNGs. */

type NavItem = {
  path: string
  label: string
  icon: LucideIcon
  externalHref?: string
  /** Extra pathname prefixes that should light this item up. */
  matchPaths?: string[]
  /** True for the item that owns the app's home route. */
  home?: boolean
}

const PLAYER_NAV: NavItem[] = [
  { path: '/capture', label: 'Capture', icon: Focus, matchPaths: ['/capture', '/record'], home: true },
  { path: '/workouts', label: 'Workouts', icon: SquarePlay, matchPaths: ['/workouts', '/moves', '/classroom'] },
  { path: '/requests', label: 'Requests', icon: UserRoundPlus },
  { path: '/calendar', label: 'Plan', icon: ClipboardList, externalHref: '/calendar/index.html' },
  { path: '/progress', label: 'Progress', icon: BarChart3 },
  { path: '/me', label: 'Me', icon: UserRound, matchPaths: ['/me', '/profile', '/players'] },
]

const COACH_NAV: NavItem[] = [
  { path: '/players', label: 'Roster', icon: UserRound, home: true },
  { path: '/teams', label: 'Teams', icon: Users },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/capture', label: 'Capture', icon: Camera, matchPaths: ['/capture', '/record', '/moves/upload'] },
  { path: '/moves', label: 'Library', icon: SquarePlay, matchPaths: ['/moves', '/workouts', '/classroom'] },
  { path: '/progress', label: 'Progress', icon: BarChart3, matchPaths: ['/progress', '/comparison'] },
  { path: '/analyze', label: 'Film', icon: Film, externalHref: '/film/index.html', matchPaths: ['/analyze', '/film'] },
]

function isActive(pathname: string, app: HoopApp, item: NavItem) {
  const base = appPath(app)
  // The home route lights up its owning nav item (Capture for player, Roster
  // for coach) — matching 001-player-web-dashboard, where Capture is selected
  // while the dashboard is on screen.
  if (item.home && (pathname === base || pathname === '/dashboard')) return true
  if (item.externalHref && pathname.startsWith(item.externalHref.replace('/index.html', ''))) return true

  return (item.matchPaths ?? [item.path]).some((path) => {
    const full = appPath(app, path)
    const legacy = `/dashboard${path}`
    return (
      pathname === full ||
      pathname.startsWith(`${full}/`) ||
      pathname === legacy ||
      pathname.startsWith(`${legacy}/`)
    )
  })
}

function hrefFor(app: HoopApp, item: NavItem) {
  return item.externalHref ?? appPath(app, item.path)
}

export type ShellUser = {
  name: string
  role: 'trainer' | 'player'
  isImpersonating: boolean
  actualRole: 'trainer' | 'player'
}

export default function AppShell({
  user,
  children,
}: {
  user: ShellUser
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const app: HoopApp = user.role === 'trainer' ? 'coach' : 'player'
  const nav = app === 'coach' ? COACH_NAV : PLAYER_NAV

  return (
    <div className="ht-ui relative flex min-h-screen bg-ht-canvas">
      <CourtBackdrop />

      {/* Desktop sidebar — hidden on mobile, where the tab bar takes over. */}
      <aside className="relative z-10 hidden w-[280px] shrink-0 border-r border-ht-line bg-ht-surface/70 lg:block">
        <div className="sticky top-0 px-7 pt-9">
          <Link href={appPath(app)} aria-label="HoopTrack home">
            <Wordmark app={app} />
          </Link>
          <nav className="mt-10 space-y-1.5">
            {nav.map((item) => {
              const active = isActive(pathname, app, item)
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={hrefFor(app, item)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors',
                    active
                      ? 'bg-ht-orange-tint text-ht-orange'
                      : 'text-ht-ink hover:bg-ht-chip/70',
                  )}
                >
                  <Icon
                    className={cn('size-7 shrink-0', active ? 'text-ht-orange' : 'text-ht-ink')}
                    strokeWidth={1.6}
                  />
                  <span className="text-[17px]">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <HtTopBar app={app} user={user} />
        {/* 22px, not 20: the cards in 001 sit at x=21.2..367.4 of a 390pt
            screen, so each side gutter measures ~21.9css. */}
        <main className="flex-1 px-[22px] pb-28 lg:px-8 lg:pb-10">{children}</main>

        {/* Mobile tab bar — mirrors the iOS screens in the pack. */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ht-line bg-ht-surface/95 backdrop-blur lg:hidden">
          <ul className="flex">
            {nav.map((item) => {
              const active = isActive(pathname, app, item)
              const Icon = item.icon
              return (
                <li key={item.path} className="flex-1">
                  <Link
                    href={hrefFor(app, item)}
                    aria-current={active ? 'page' : undefined}
                    className="flex flex-col items-center gap-1 py-2.5"
                  >
                    <Icon
                      className={cn('size-6', active ? 'text-ht-orange' : 'text-ht-ink')}
                      strokeWidth={1.7}
                    />
                    <span
                      className={cn(
                        'text-[11px]',
                        active ? 'font-semibold text-ht-orange' : 'text-ht-ink',
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
