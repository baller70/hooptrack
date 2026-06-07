import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'trainer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ai_model, ai_credentials } = await request.json()

    db.prepare(`
      UPDATE users 
      SET ai_model = ?, ai_credentials = ? 
      WHERE id = ?
    `).run(
      ai_model, 
      ai_credentials ? JSON.stringify(ai_credentials) : null, 
      session.id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
