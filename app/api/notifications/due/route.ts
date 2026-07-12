import { getSession } from '@/lib/session'
import { sendDuePushNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const pushed = await sendDuePushNotifications(session.id)
  return Response.json({ pushed })
}
