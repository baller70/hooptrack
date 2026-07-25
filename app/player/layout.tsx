import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/ht/app-shell'
import PushBootstrap from '@/components/push-bootstrap'
import ViewAsBanner from '@/components/view-as-banner'

/**
 * Wraps only /player itself. Deeper paths (/player/workouts, …) are rewritten
 * to /dashboard/* by next.config.ts and pick up the dashboard layout instead —
 * both render the same AppShell, so the chrome is identical either way.
 */
export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <AppShell
      user={{
        name: session.name,
        role: session.role,
        actualRole: session.actual_role || session.role,
        isImpersonating: !!session.actual_id,
      }}
    >
      <ViewAsBanner />
      {children}
      <PushBootstrap />
    </AppShell>
  )
}
