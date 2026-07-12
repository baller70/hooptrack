import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavTabs from '@/components/nav-tabs'
import NotificationBell from '@/components/notification-bell'
import PushBootstrap from '@/components/push-bootstrap'
import ViewAsBanner from '@/components/view-as-banner'
import ViewAsToggle from '@/components/view-as-toggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  // The "real" role for the toggle: if impersonating, the trainer is in actual_role.
  const realRole = session.actual_role || session.role
  const isImpersonating = !!session.actual_id

  // Mode strip at the very top — tells the user exactly what view they're in.
  const modeStripClass = isImpersonating
    ? 'bg-orange-500 text-white'
    : session.role === 'trainer'
    ? 'bg-black text-white'
    : 'bg-hoop-orange text-white'
  const modeStripText = isImpersonating
    ? `PLAYER VIEW · viewing as ${session.name}`
    : session.role === 'trainer'
    ? 'TRAINER MODE'
    : 'PLAYER MODE'

  return (
    <div className="min-h-screen flex flex-col">
      <div className={`${modeStripClass} text-center text-[11px] font-bold tracking-wider uppercase py-1 border-b-2 border-black`}>
        {modeStripText}
      </div>
      <ViewAsBanner />
      <header className="bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard/capture" className="font-[family-name:var(--font-russo)] text-xl hover:text-hoop-orange transition-colors">
          HoopTrack
        </Link>
        <div className="flex items-center gap-2">
          <ViewAsToggle actualRole={realRole} isImpersonating={isImpersonating} />
          <NotificationBell />
          <Link href="/dashboard/profile" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">
            {session.name}
          </Link>
          <Link
            href="/dashboard/profile"
            className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize border-2 ${
                isImpersonating
                  ? 'bg-orange-500 text-white border-black'
                  : session.role === 'trainer'
                    ? 'bg-hoop-black text-white border-black'
                    : 'bg-hoop-orange text-white border-black'
              }`}
          >
            {session.role}{isImpersonating ? ' (preview)' : ''}
          </Link>
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-4">{children}</main>
      <NavTabs role={session.role} />
      <PushBootstrap />
    </div>
  )
}
