import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function MyLibraryPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'trainer') redirect('/coach/players')
  redirect(`/player/players/${session.id}`)
}
