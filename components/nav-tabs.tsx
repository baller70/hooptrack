'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Film, Library, Video, CalendarDays, Award, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  role?: 'trainer' | 'player'
}

const baseTabs = [
  { href: '/dashboard/capture', label: 'Capture', icon: Video, matchPrefixes: ['/dashboard/capture', '/dashboard/record', '/dashboard/moves/upload'] },
  { href: '/dashboard/workouts', label: 'Library', icon: Library, matchPrefixes: ['/dashboard/workouts', '/dashboard/moves', '/dashboard/classroom'] },
  { href: '/film/index.html', label: 'Film & Video', icon: Film, matchPrefixes: ['/dashboard/analyze', '/film'] },
  { href: '/calendar/index.html', label: 'Calendar', icon: CalendarDays, matchPrefixes: ['/dashboard/calendar', '/calendar'] },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
  { href: '/dashboard/progress', label: 'Progress', icon: Award },
]

export default function NavTabs({ role: _role }: Props) {
  void _role
  const pathname = usePathname()

  const tabs = baseTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50 md:static md:border-t-0 md:border-b-2">
      <div className="flex justify-around items-center h-16 max-w-5xl mx-auto overflow-x-auto">
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
