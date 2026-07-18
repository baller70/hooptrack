import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { dashboardPathForRole } from '@/lib/app-routes'

export default async function DashboardIndexPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  redirect(dashboardPathForRole(session.role))
}
