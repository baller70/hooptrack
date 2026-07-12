import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function CalendarPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  redirect('/calendar/index.html')
}
