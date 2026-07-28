import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import FilmReviewClient from '@/components/film-review-client'
import { PageTitle } from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 015-coach-film-review-raw.png — reached at /coach/film. */

export default async function FilmPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'trainer') redirect('/player/progress')

  return (
    <div className="pt-2">
      <PageTitle upright>Film Review</PageTitle>
      {/* useSearchParams needs a boundary during prerender. */}
      <Suspense fallback={null}>
        <FilmReviewClient />
      </Suspense>
    </div>
  )
}
