import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import PlayerRequestsClient from '@/components/teams/player-requests-client'

export default async function RequestsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'player') redirect('/coach/teams')

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <PlayerRequestsClient />
    </main>
  )
}
