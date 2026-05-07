'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library, Video, CalendarDays, User, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard/workouts', label: 'Library', icon: Library, matchPrefixes: ['/dashboard/workouts', '/dashboard/moves', '/dashboard/classroom', '/dashboard/comparison'] },
  { href: '/dashboard/record', label: 'Record', icon: Video },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/progress', label: 'Progress', icon: Award },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export default function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50 md:static md:border-t-0 md:border-b-2">
      <div className="flex justify-around items-center h-16 max-w-4xl mx-auto">
        {tabs.map((tab) => {
          const prefixes = tab.matchPrefixes ?? [tab.href]
          const active = prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors',
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
