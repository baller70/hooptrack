import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Camera, Dumbbell, GraduationCap, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type WorkspaceKey = 'capture' | 'workouts' | 'moves' | 'classroom'

const workflow: Array<{
  key: WorkspaceKey
  href: string
  label: string
  helper: string
  icon: LucideIcon
}> = [
  { key: 'capture', href: '/dashboard/capture', label: 'Capture', helper: 'Record or upload', icon: Camera },
  { key: 'workouts', href: '/dashboard/workouts', label: 'Workouts', helper: 'Build the plan', icon: Dumbbell },
  { key: 'moves', href: '/dashboard/moves', label: 'Moves', helper: 'Teach the details', icon: PlayCircle },
  { key: 'classroom', href: '/dashboard/classroom', label: 'Classroom', helper: 'Check learning', icon: GraduationCap },
]

export function TrainingWorkspaceShell({
  active,
  title,
  eyebrow = 'Training workspace',
  description,
  primary,
  stats,
  children,
  sidebar,
}: {
  active: WorkspaceKey
  title: string
  eyebrow?: string
  description: string
  primary?: React.ReactNode
  stats?: React.ReactNode
  children: React.ReactNode
  sidebar?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
      <section className="overflow-hidden rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A]">
        <div className="border-b-2 border-black bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_46%,#ecfeff_100%)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-hoop-orange">{eyebrow}</p>
              <h1 className="mt-1 font-[family-name:var(--font-russo)] text-3xl leading-none text-hoop-black sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {primary && <div className="flex flex-wrap gap-2 lg:justify-end">{primary}</div>}
          </div>
          {stats && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{stats}</div>}
        </div>

        <nav className="grid grid-cols-2 border-b-2 border-black bg-white sm:grid-cols-4" aria-label="Training workflow">
          {workflow.map((item) => {
            const Icon = item.icon
            const selected = item.key === active
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'min-h-[74px] border-black p-3 transition-colors sm:border-r-2 sm:last:border-r-0',
                  'border-b-2 sm:border-b-0',
                  selected ? 'bg-hoop-black text-white' : 'bg-white text-hoop-black hover:bg-orange-50',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-5 w-5', selected ? 'text-hoop-orange' : 'text-hoop-orange')} />
                  <span className="font-[family-name:var(--font-russo)] text-lg leading-none">{item.label}</span>
                </div>
                <p className={cn('mt-1 text-xs', selected ? 'text-white/70' : 'text-muted-foreground')}>{item.helper}</p>
              </Link>
            )
          })}
        </nav>
      </section>

      <div className={cn('mt-4 grid gap-4', sidebar ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1')}>
        <main className="min-w-0 space-y-4">{children}</main>
        {sidebar && <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">{sidebar}</aside>}
      </div>
    </div>
  )
}

export function WorkspacePanel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border-2 border-black bg-white shadow-[3px_3px_0px_0px_#0A0A0A]">
      <div className="flex flex-col gap-2 border-b-2 border-black p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-russo)] text-xl leading-none">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border-2 border-black bg-white px-3 py-2 shadow-[2px_2px_0px_0px_#0A0A0A]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-russo)] text-2xl leading-none text-hoop-black">{value}</p>
    </div>
  )
}

export function WorkspaceActionLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#0A0A0A] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-orange-50 hover:shadow-[1px_1px_0px_0px_#0A0A0A]"
    >
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-hoop-black text-hoop-orange">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold leading-tight">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">{body}</span>
        </span>
      </div>
    </Link>
  )
}

export function EmptyWorkspaceState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-hoop-orange" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
