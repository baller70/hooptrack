export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { RECORDINGS_DIR } from '@/lib/constants'
import { notifyAllTrainers } from '@/lib/notifications'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_MIME = ['video/webm', 'video/mp4']
const MAX_BYTES = 500 * 1024 * 1024 // 500 MB

interface RecordingRow {
  id: number
  player_id: number
  blob_key: string
  video_path: string | null
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('video') as File | null
    const recordingIdRaw = formData.get('recording_id')
    const blobKey = formData.get('blob_key') as string | null

    if (!file) return Response.json({ error: 'No video file' }, { status: 400 })
    if (!recordingIdRaw) return Response.json({ error: 'Missing recording_id' }, { status: 400 })
    const recordingId = parseInt(String(recordingIdRaw))
    if (Number.isNaN(recordingId)) return Response.json({ error: 'Invalid recording_id' }, { status: 400 })

    if (file.size > MAX_BYTES) return Response.json({ error: 'File too large' }, { status: 413 })

    const mime = (file.type || '').toLowerCase()
    const acceptable = ALLOWED_MIME.some((m) => mime.startsWith(m))
    if (!acceptable) return Response.json({ error: 'Only WebM or MP4 video is allowed' }, { status: 400 })

    // Authorize: must own the recording row
    const row = db.prepare('SELECT id, player_id, blob_key, video_path FROM recordings WHERE id = ?')
      .get(recordingId) as RecordingRow | undefined
    if (!row) return Response.json({ error: 'Recording not found' }, { status: 404 })
    if (row.player_id !== session.id && session.role !== 'trainer') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (row.video_path) {
      // Already uploaded — idempotent: just return existing path
      return Response.json({ video_path: row.video_path, already_uploaded: true })
    }

    // Validate blob_key (stops cross-recording uploads)
    if (blobKey && row.blob_key !== blobKey) {
      return Response.json({ error: 'blob_key mismatch' }, { status: 400 })
    }

    const ext = mime.includes('webm') ? '.webm' : '.mp4'
    const filename = `${recordingId}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`

    const dir = path.isAbsolute(RECORDINGS_DIR) ? RECORDINGS_DIR : path.join(process.cwd(), RECORDINGS_DIR)
    await mkdir(dir, { recursive: true })
    const fullPath = path.join(dir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)

    const relPath = filename
    db.prepare('UPDATE recordings SET video_path = ?, video_size_bytes = ?, video_mime = ? WHERE id = ?')
      .run(relPath, buffer.length, mime, recordingId)

    // Surface video uploads from players to trainers
    if (session.role === 'player' && row.player_id === session.id) {
      const playerName = (db
        .prepare('SELECT name FROM users WHERE id = ?')
        .get(session.id) as { name: string } | undefined)?.name || 'Player'
      const drillName = (db
        .prepare('SELECT d.name FROM drills d JOIN recordings r ON r.drill_id = d.id WHERE r.id = ?')
        .get(recordingId) as { name: string } | undefined)?.name || 'a drill'
      notifyAllTrainers({
        message: `${playerName} uploaded video for ${drillName}`,
        type: 'video_uploaded',
        actor_id: session.id,
        link_url: `/dashboard/players/${session.id}?recording=${recordingId}`,
        push_title: 'Video uploaded',
      }).catch(() => {})
    }

    return Response.json({ video_path: relPath, size: buffer.length })
  } catch (err) {
    console.error('Recording upload error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
