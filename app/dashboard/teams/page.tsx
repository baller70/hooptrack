import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import CoachGroupsClient from '@/components/teams/coach-groups-client'

export default async function TeamsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if ((session.actual_role || session.role) !== 'trainer') redirect('/player/requests')

  return <CoachGroupsClient />
}
