import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('hooptrack_token')
  return Response.json({ success: true })
}
