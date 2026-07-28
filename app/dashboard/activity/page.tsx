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
      {/* Two titles, not one: 014 sets LIVE ACTIVITY upright on the phone while
          the desktop 004 slants ACTIVITY AND FILM REVIEW, and a single h1
          cannot carry both. */}
      <PageTitle upright className="lg:hidden">
        Live Activity
      </PageTitle>
      <PageTitle className="max-lg:hidden">Activity and Film Review</PageTitle>
      <ActivityFeedClient />
    </div>
  )
}
