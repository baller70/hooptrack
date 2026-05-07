'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, PlayCircle, GraduationCap, SplitSquareHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tab { href: string; label: string; icon: LucideIcon; matchPrefix: string }

const TABS: Tab[] = [
  { href: '/dashboard/workouts', label: 'Workouts', icon: Dumbbell, matchPrefix: '/dashboard/workouts' },
  { href: '/dashboard/moves', label: 'Moves', icon: PlayCircle, matchPrefix: '/dashboard/moves' },
  { href: '/dashboard/classroom', label: 'Class', icon: GraduationCap, matchPrefix: '/dashboard/classroom' },
  { href: '/dashboard/comparison', label: 'Compare', icon: SplitSquareHorizontal, matchPrefix: '/dashboard/comparison' },
]

export default function LibraryTabs() {
  const pathname = usePathname() || ''

  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] p-1 mb-4 grid grid-cols-4 gap-1">
      {TABS.map((tab) => {
        const active = pathname === tab.matchPrefix || pathname.startsWith(tab.matchPrefix + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 rounded-md text-xs font-semibold transition-colors',
              active ? 'bg-black text-white' : 'text-foreground hover:bg-gray-50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
