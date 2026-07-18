import path from 'path'
import { unlink } from 'fs/promises'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { verifyPassword } from '@/lib/auth'
import { ATTACHMENTS_DIR, RECORDINGS_DIR } from '@/lib/constants'
import { db } from '@/lib/db'
import { resolveInside } from '@/lib/files'
import { getSession } from '@/lib/session'

const schema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('DELETE'),
})

function absoluteStorageDir(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath)
}

async function removeOwnedFiles(baseDir: string, relativePaths: string[]) {
  await Promise.all(relativePaths.map(async (relativePath) => {
    const fullPath = resolveInside(baseDir, relativePath)
    if (!fullPath) return
    try {
      await unlink(fullPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Account file cleanup failed:', fullPath, error)
      }
    }
  }))
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.actual_id) return Response.json({ error: 'Exit player preview before deleting an account' }, { status: 403 })
  if (session.role !== 'player') {
    return Response.json({ error: 'Coach organization accounts must be closed through Support' }, { status: 403 })
  }

  try {
    const data = schema.parse(await request.json())
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(session.id) as
      | { password_hash: string }
      | undefined
    if (!user || !(await verifyPassword(data.password, user.password_hash))) {
      return Response.json({ error: 'Password is incorrect' }, { status: 401 })
    }

    const recordingFiles = db.prepare(`
      SELECT DISTINCT r.video_path
      FROM recordings r
      WHERE r.player_id = ? AND r.video_path IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM recordings other
          WHERE other.video_path = r.video_path AND other.player_id != ?
        )
    `).all(session.id, session.id) as Array<{ video_path: string }>
    const attachmentFiles = db.prepare(`
      SELECT DISTINCT attachment_path
      FROM messages
      WHERE (sender_id = ? OR recipient_id = ?) AND attachment_path IS NOT NULL
    `).all(session.id, session.id) as Array<{ attachment_path: string }>

    const deleteAccount = db.transaction(() => {
      const recordingIds = db.prepare('SELECT id FROM recordings WHERE player_id = ?').all(session.id) as Array<{ id: number }>
      if (recordingIds.length > 0) {
        const placeholders = recordingIds.map(() => '?').join(',')
        db.prepare(`UPDATE recordings SET parent_recording_id = NULL WHERE parent_recording_id IN (${placeholders})`).run(
          ...recordingIds.map((row) => row.id),
        )
      }

      db.prepare('UPDATE player_moves SET assigned_to_player_id = NULL WHERE assigned_to_player_id = ?').run(session.id)
      db.prepare('DELETE FROM quiz_attempts WHERE player_id = ?').run(session.id)
      db.prepare('DELETE FROM schedule WHERE player_id = ?').run(session.id)
      db.prepare('DELETE FROM notifications WHERE player_id = ?').run(session.id)
      db.prepare('UPDATE notifications SET actor_id = NULL WHERE actor_id = ?').run(session.id)
      db.prepare('DELETE FROM recordings WHERE player_id = ?').run(session.id)
      db.prepare('DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?').run(session.id, session.id)
      db.prepare('DELETE FROM users WHERE id = ?').run(session.id)
    })
    deleteAccount()

    await Promise.all([
      removeOwnedFiles(absoluteStorageDir(RECORDINGS_DIR), recordingFiles.map((row) => row.video_path)),
      removeOwnedFiles(absoluteStorageDir(ATTACHMENTS_DIR), attachmentFiles.map((row) => row.attachment_path)),
    ])

    const cookieStore = await cookies()
    cookieStore.delete('hooptrack_token')
    cookieStore.delete('hooptrack_view_as')
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0].message }, { status: 400 })
    console.error('Account deletion error:', error)
    return Response.json({ error: 'Account deletion could not be completed. Contact Support for help.' }, { status: 500 })
  }
}
