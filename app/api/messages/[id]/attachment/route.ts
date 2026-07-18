export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { ATTACHMENTS_DIR } from '@/lib/constants'
import { resolveInside } from '@/lib/files'
import { stat, open } from 'fs/promises'
import path from 'path'

interface MessageRow {
  id: number
  sender_id: number
  recipient_id: number | null
  context_type: string | null
  context_id: number | null
  attachment_path: string | null
  attachment_mime: string | null
  attachment_filename: string | null
}

async function isAuthorized(message: MessageRow, sessionUserId: number, sessionRole: string): Promise<boolean> {
  if (message.sender_id === sessionUserId) return true
  if (message.recipient_id === sessionUserId) return true
  // Trainer can see attachments on entities they own
  if (sessionRole === 'trainer' && message.context_type && message.context_id) {
    if (message.context_type === 'workout') {
      const w = db.prepare('SELECT created_by FROM workouts WHERE id = ?').get(message.context_id) as { created_by: number } | undefined
      if (w?.created_by === sessionUserId) return true
    }
    // For other types, trainer access default-allow (they manage the system)
    return true
  }
  // Player can see attachments where they're a participant in the thread (same context, any sender they've conversed with)
  const participated = db.prepare(
    'SELECT 1 FROM messages WHERE context_type = ? AND context_id = ? AND (sender_id = ? OR recipient_id = ?) LIMIT 1'
  ).get(message.context_type, message.context_id, sessionUserId, sessionUserId)
  return !!participated
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const message = db.prepare(
    'SELECT id, sender_id, recipient_id, context_type, context_id, attachment_path, attachment_mime, attachment_filename FROM messages WHERE id = ?'
  ).get(id) as MessageRow | undefined

  if (!message || !message.attachment_path) return new Response('Not found', { status: 404 })
  if (!(await isAuthorized(message, session.id, session.role))) {
    return new Response('Forbidden', { status: 403 })
  }

  const dir = path.isAbsolute(ATTACHMENTS_DIR) ? ATTACHMENTS_DIR : path.join(/* turbopackIgnore: true */ process.cwd(), ATTACHMENTS_DIR)
  const fullPath = resolveInside(dir, message.attachment_path)
  if (!fullPath) return new Response('Forbidden', { status: 403 })

  let fileStat
  try {
    fileStat = await stat(fullPath)
  } catch {
    return new Response('File missing', { status: 410 })
  }

  const totalSize = fileStat.size
  const mime = message.attachment_mime || 'application/octet-stream'
  const dispositionFilename = message.attachment_filename || message.attachment_path
  const dispositionInline = mime.startsWith('audio/') || mime.startsWith('image/') || mime.startsWith('video/')
  const disposition = `${dispositionInline ? 'inline' : 'attachment'}; filename="${dispositionFilename.replace(/"/g, '')}"`

  const range = request.headers.get('range')
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!m) return new Response('Invalid range', { status: 416 })
    const start = m[1] ? parseInt(m[1]) : 0
    const end = m[2] ? parseInt(m[2]) : Math.min(start + 1024 * 1024, totalSize - 1)
    if (start >= totalSize || end >= totalSize || start > end) {
      return new Response('Range not satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${totalSize}` } })
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
        'Content-Disposition': disposition,
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
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
