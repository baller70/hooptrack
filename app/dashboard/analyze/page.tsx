import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function AnalyzePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  redirect('/film/index.html')
}
