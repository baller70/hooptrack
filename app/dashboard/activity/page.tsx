import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ActivityFeedClient from '@/components/activity-feed-client'
import { PageTitle } from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/
 *   web-desktop/004-coach-activity-film-review-raw.png (lg+)
 *   ios/014-coach-live-activity-raw.png                (phone) */

export default async function ActivityPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'trainer') redirect('/player/progress')

  return (
    <div className="pt-2">
      <PageTitle>
        <span className="lg:hidden">Live Activity</span>
        <span className="max-lg:hidden">Activity and Film Review</span>
      </PageTitle>
      <ActivityFeedClient />
    </div>
  )
}
