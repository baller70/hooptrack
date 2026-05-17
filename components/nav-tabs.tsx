'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library, Video, CalendarDays, User, Award, Users, Activity, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  role?: 'trainer' | 'player'
}

const baseTabs = [
  { href: '/dashboard/workouts', label: 'Library', icon: Library, matchPrefixes: ['/dashboard/workouts', '/dashboard/moves', '/dashboard/classroom', '/dashboard/comparison'] },
  { href: '/dashboard/record', label: 'Record', icon: Video },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/progress', label: 'Progress', icon: Award },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

const trainerExtraTabs = [
  { href: '/dashboard/players', label: 'Players', icon: Users },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
]

const playerExtraTabs = [
  { href: '/dashboard/me', label: 'My Stuff', icon: FolderOpen, matchPrefixes: ['/dashboard/me', '/dashboard/players'] },
]

export default function NavTabs({ role }: Props) {
  const pathname = usePathname()

  const tabs = role === 'trainer'
    ? [...baseTabs.slice(0, 1), ...trainerExtraTabs, ...baseTabs.slice(1)]
    : [...baseTabs.slice(0, 1), ...playerExtraTabs, ...baseTabs.slice(1)]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50 md:static md:border-t-0 md:border-b-2">
      <div className="flex justify-around items-center h-16 max-w-4xl mx-auto overflow-x-auto">
        {tabs.map((tab) => {
          const prefixes = (tab as { matchPrefixes?: string[] }).matchPrefixes ?? [tab.href]
          const active = prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
