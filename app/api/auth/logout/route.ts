import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('hooptrack_token')
  cookieStore.delete('hooptrack_view_as')
  return Response.json({ success: true })
}

