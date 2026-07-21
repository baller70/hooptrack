export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { canAccessPlayer } from '@/lib/access'
import { RECORDINGS_DIR } from '@/lib/constants'
import { resolveInside } from '@/lib/files'
import { stat, open } from 'fs/promises'
import path from 'path'

interface RecordingRow {
  id: number
  player_id: number
  video_path: string | null
  video_mime: string | null
  video_size_bytes: number | null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const row = db.prepare(
    'SELECT id, player_id, video_path, video_mime, video_size_bytes FROM recordings WHERE id = ?'
  ).get(id) as RecordingRow | undefined

  if (!row || !row.video_path) return new Response('Not found', { status: 404 })
  if (!canAccessPlayer(session, row.player_id)) {
    return new Response('Forbidden', { status: 403 })
  }

  const dir = path.isAbsolute(RECORDINGS_DIR) ? RECORDINGS_DIR : path.join(/* turbopackIgnore: true */ process.cwd(), RECORDINGS_DIR)
  const fullPath = resolveInside(dir, row.video_path)
  if (!fullPath) return new Response('Forbidden', { status: 403 })

  let fileStat
  try {
    fileStat = await stat(fullPath)
  } catch {
    return new Response('Video file missing on disk', { status: 410 })
  }
  const totalSize = fileStat.size
  const mime = row.video_mime || 'video/webm'

  const range = request.headers.get('range')
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!m) return new Response('Invalid range', { status: 416 })
    const start = m[1] ? parseInt(m[1]) : 0
    const end = m[2] ? parseInt(m[2]) : Math.min(start + 1024 * 1024, totalSize - 1)
    if (start >= totalSize || end >= totalSize || start > end) {
      return new Response('Range not satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      })
    }
    const length = end - start + 1
    const fh = await open(fullPath, 'r')
    const stream = fh.createReadStream({ start, end })
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(length),
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  const fh = await open(fullPath, 'r')
  const stream = fh.createReadStream()
  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(totalSize),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
