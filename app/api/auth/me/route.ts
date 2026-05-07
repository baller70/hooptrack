export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }
  return Response.json({ user: session }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
