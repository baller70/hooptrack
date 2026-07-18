import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ActivityFeedClient from '@/components/activity-feed-client'

export default async function ActivityPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'trainer') redirect('/player/progress')

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-1">Activity</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Everything your players have done, newest first.
      </p>
      <ActivityFeedClient />
    </div>
  )
}
