'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Film, Library, Video, CalendarDays, Award, Activity, Users, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { appPath, type HoopApp } from '@/lib/app-routes'

interface Props {
  role?: 'trainer' | 'player'
}

type TabSpec = {
  path: string
  label: string
  icon: LucideIcon
  externalHref?: string
  matchPaths?: string[]
}

const playerTabs: TabSpec[] = [
  { path: '/capture', label: 'Capture', icon: Video, matchPaths: ['/capture', '/record'] },
  { path: '/workouts', label: 'Workouts', icon: Library, matchPaths: ['/workouts', '/moves', '/classroom'] },
  { path: '/calendar', label: 'Plan', icon: CalendarDays, externalHref: '/calendar/index.html', matchPaths: ['/calendar'] },
  { path: '/progress', label: 'Progress', icon: Award },
  { path: '/me', label: 'Me', icon: UserRound, matchPaths: ['/me', '/profile'] },
]

const coachTabs: TabSpec[] = [
  { path: '/players', label: 'Roster', icon: Users },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/capture', label: 'Capture', icon: Video, matchPaths: ['/capture', '/record', '/moves/upload'] },
  { path: '/workouts', label: 'Library', icon: Library, matchPaths: ['/workouts', '/moves', '/classroom'] },
  { path: '/progress', label: 'Progress', icon: Award },
  { path: '/analyze', label: 'Film', icon: Film, externalHref: '/film/index.html', matchPaths: ['/analyze', '/film'] },
]

function currentApp(pathname: string, role?: 'trainer' | 'player'): HoopApp {
  if (pathname.startsWith('/coach')) return 'coach'
  if (pathname.startsWith('/player')) return 'player'
  return role === 'trainer' ? 'coach' : 'player'
}

function isActive(pathname: string, app: HoopApp, tab: TabSpec) {
  if (tab.externalHref && pathname.startsWith(tab.externalHref.replace('/index.html', ''))) return true
  const paths = tab.matchPaths ?? [tab.path]
  return paths.some((path) => {
    const full = appPath(app, path)
    const legacy = `/dashboard${path}`
    return pathname === full || pathname.startsWith(`${full}/`) || pathname === legacy || pathname.startsWith(`${legacy}/`)
  })
}

export default function NavTabs({ role }: Props) {
  const pathname = usePathname()
  const app = currentApp(pathname, role)
  const tabs = app === 'coach' ? coachTabs : playerTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50 md:static md:border-t-0 md:border-b-2">
      <div className="flex justify-around items-center h-16 max-w-5xl mx-auto overflow-x-auto">
        {tabs.map((tab) => {
          const href = tab.externalHref ?? appPath(app, tab.path)
          const active = isActive(pathname, app, tab)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors shrink-0',
                active ? 'text-hoop-orange' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
