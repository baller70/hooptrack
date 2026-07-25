import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import PlayerRequestsClient from '@/components/teams/player-requests-client'

export default async function RequestsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'player') redirect('/coach/teams')

  // AppShell already supplies <main> and the page gutters, so the client owns
  // only its own content — same shape as app/player/page.tsx.
  return <PlayerRequestsClient />
}
