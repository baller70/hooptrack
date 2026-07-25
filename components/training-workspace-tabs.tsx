import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Camera, GraduationCap, SquarePlay, Waypoints } from 'lucide-react'
import { cn } from '@/lib/utils'
import { appPath, type HoopApp } from '@/lib/app-routes'

/* The Capture / Workouts / Moves / Classroom strip from
 * design/hooptrack-raw-individual-screens/web-desktop/
 * 003-player-training-workspace-raw.png. Shared by all four workspace pages so
 * the strip never drifts between them. */

export type WorkspaceKey = 'capture' | 'workouts' | 'moves' | 'classroom'

const TABS: Array<{ key: WorkspaceKey; path: string; label: string; icon: LucideIcon }> = [
  { key: 'capture', path: '/capture', label: 'Capture', icon: Camera },
  { key: 'workouts', path: '/workouts', label: 'Workouts', icon: SquarePlay },
  { key: 'moves', path: '/moves', label: 'Moves', icon: Waypoints },
  { key: 'classroom', path: '/classroom', label: 'Classroom', icon: GraduationCap },
]

export function TrainingWorkspaceTabs({
  active,
  app = 'player',
  className,
}: {
  active: WorkspaceKey
  app?: HoopApp
  className?: string
}) {
  return (
    <nav
      aria-label="Training workspace"
      className={cn('flex overflow-x-auto border-b border-ht-line', className)}
    >
      {TABS.map((tab) => {
        const selected = tab.key === active
        const Icon = tab.icon
        return (
          <Link
            key={tab.key}
            href={appPath(app, tab.path)}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2.5 border-b-[3px] px-6 pb-3.5 pt-2 transition-colors sm:px-9',
              selected
                ? 'border-ht-orange text-ht-orange'
                : 'border-transparent text-ht-ink hover:text-ht-orange',
            )}
          >
            <Icon className="size-6 shrink-0" strokeWidth={1.7} />
            <span className="text-[17px] whitespace-nowrap">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
