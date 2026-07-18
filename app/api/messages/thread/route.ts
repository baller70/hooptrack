export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'
import { ATTACHMENTS_DIR } from '@/lib/constants'
import { canAccessContext, getContextParticipants } from '@/lib/access'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { objectionableContentReason, usersAreBlocked } from '@/lib/content-safety'

const execFileAsync = promisify(execFile)

const CONTEXT_TYPES = ['workout', 'drill', 'move', 'quiz', 'recording', 'general'] as const
const ATTACHMENT_TYPES = ['voice', 'image', 'video', 'file'] as const

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

class BadRequestError extends Error {}

const postSchema = z.object({
  context_type: z.enum(CONTEXT_TYPES),
  context_id: z.number().int(),
  context_title: z.string().max(200).optional(),
  body: z.string().max(4000).optional().default(''),
})

interface MessageRow {
  id: number
  sender_id: number
  recipient_id: number | null
  body: string
  context_type: string | null
  context_id: number | null
  context_title: string | null
  created_at: string
  read_at: string | null
  attachment_type: string | null
  attachment_path: string | null
  attachment_mime: string | null
  attachment_size_bytes: number | null
  attachment_duration_seconds: number | null
  attachment_filename: string | null
  sender_name: string
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const contextType = searchParams.get('context_type')
  const contextId = searchParams.get('context_id')
  const since = searchParams.get('since')
  const parsedContextId = contextId ? parseInt(contextId, 10) : NaN
  if (!contextType || Number.isNaN(parsedContextId)) {
    return Response.json({ error: 'Missing context' }, { status: 400 })
  }
  if (!canAccessContext(session, contextType, parsedContextId)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let q = `SELECT m.*, u.name as sender_name FROM messages m
           JOIN users u ON u.id = m.sender_id
           WHERE m.context_type = ? AND m.context_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM blocked_users b
               WHERE (b.blocker_id = ? AND b.blocked_id = m.sender_id)
                  OR (b.blocked_id = ? AND b.blocker_id = m.sender_id)
             )`
  const params: (string | number)[] = [contextType, parsedContextId, session.id, session.id]
  if (since) {
    q += ' AND m.created_at > ?'
    params.push(since)
  }
  q += ' ORDER BY m.created_at ASC LIMIT 200'

  const messages = db.prepare(q).all(...params) as MessageRow[]

  db.prepare(
    'UPDATE messages SET read_at = ? WHERE context_type = ? AND context_id = ? AND recipient_id = ? AND read_at IS NULL'
  ).run(new Date().toISOString(), contextType, parsedContextId, session.id)

  return Response.json({ messages })
}

interface ParsedInput {
  context_type: typeof CONTEXT_TYPES[number]
  context_id: number
  context_title?: string
  body: string
  attachment?: {
    type: typeof ATTACHMENT_TYPES[number]
    file: File
    mime: string
    duration_seconds?: number
  }
}

async function parseInput(request: Request): Promise<ParsedInput> {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const fd = await request.formData()
    const ctx = String(fd.get('context_type') || '')
    const ctxId = parseInt(String(fd.get('context_id') || ''))
    const ctxTitle = fd.get('context_title') ? String(fd.get('context_title')) : undefined
    const body = String(fd.get('body') || '')
    const attType = String(fd.get('attachment_type') || '') as typeof ATTACHMENT_TYPES[number]
    const file = fd.get('attachment') as File | null

    if (!CONTEXT_TYPES.includes(ctx as typeof CONTEXT_TYPES[number])) throw new BadRequestError('Invalid context_type')
    if (Number.isNaN(ctxId)) throw new BadRequestError('Invalid context_id')

    let attachment: ParsedInput['attachment']
    if (file && ATTACHMENT_TYPES.includes(attType)) {
      if (file.size > MAX_BYTES) throw new BadRequestError('Attachment too large (50 MB max)')
      const dur = fd.get('attachment_duration_seconds')
      attachment = {
        type: attType,
        file,
        mime: (file.type || '').toLowerCase(),
        duration_seconds: dur ? parseInt(String(dur)) : undefined,
      }
    }

    if (!body && !attachment) throw new BadRequestError('Message must have body or attachment')

    return {
      context_type: ctx as typeof CONTEXT_TYPES[number],
      context_id: ctxId,
      context_title: ctxTitle,
      body,
      attachment,
    }
  }

  // JSON path (text-only)
  const json = await request.json()
  const data = postSchema.parse(json)
  if (!data.body) throw new BadRequestError('Missing body')
  return data as ParsedInput
}

interface SavedAttachment {
  filename: string
  mime: string
  sizeBytes: number
}

async function saveAttachment(messageId: number, file: File, type: string): Promise<SavedAttachment> {
  const dir = path.isAbsolute(ATTACHMENTS_DIR) ? ATTACHMENTS_DIR : path.join(/* turbopackIgnore: true */ process.cwd(), ATTACHMENTS_DIR)
  await mkdir(dir, { recursive: true })

  // Pick extension from mime first, fallback to filename
  const mime = (file.type || '').toLowerCase()
  let ext = ''
  if (mime.startsWith('audio/webm')) ext = '.webm'
  else if (mime.startsWith('audio/mp4') || mime.startsWith('audio/m4a')) ext = '.m4a'
  else if (mime.startsWith('audio/mpeg')) ext = '.mp3'
  else if (mime.startsWith('audio/ogg')) ext = '.ogg'
  else if (mime.startsWith('image/png')) ext = '.png'
  else if (mime.startsWith('image/jpeg')) ext = '.jpg'
  else if (mime.startsWith('image/webp')) ext = '.webp'
  else if (mime.startsWith('image/gif')) ext = '.gif'
  else if (mime.startsWith('image/heic')) ext = '.heic'
  else if (mime.startsWith('video/webm')) ext = '.webm'
  else if (mime.startsWith('video/mp4')) ext = '.mp4'
  else if (mime.startsWith('video/quicktime')) ext = '.mov'
  else {
    const fromName = path.extname(file.name)
    ext = fromName ? fromName.toLowerCase() : ''
  }

  const filename = `${messageId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
  const fullPath = path.join(dir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  // iOS Safari can't decode webm/opus or ogg/opus inside an <audio> element.
  // Transcode voice messages to m4a (AAC) so every recipient device can play
  // them. Voice clips are short, so this finishes fast.
  if (type === 'voice' && (mime.startsWith('audio/webm') || mime.startsWith('audio/ogg'))) {
    const m4aFilename = filename.replace(/\.[^.]+$/, '.m4a')
    const m4aFullPath = path.join(dir, m4aFilename)
    try {
      await execFileAsync(
        'ffmpeg',
        ['-i', fullPath, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-y', m4aFullPath],
        { timeout: 30_000 },
      )
      // Original file is now redundant; remove it.
      try { await unlink(fullPath) } catch {}
      const { stat } = await import('fs/promises')
      const s = await stat(m4aFullPath)
      return { filename: m4aFilename, mime: 'audio/mp4', sizeBytes: s.size }
    } catch (e) {
      console.error('Voice transcode failed, keeping original:', e)
      // Fall through and return the original webm — better than nothing.
    }
  }

  return { filename, mime, sizeBytes: buffer.length }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await parseInput(request)
    const unsafeReason = objectionableContentReason(data.body)
    if (unsafeReason) return Response.json({ error: unsafeReason }, { status: 422 })
    if (!canAccessContext(session, data.context_type, data.context_id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const recipients = new Set<number>()
    const participants = getContextParticipants(data.context_type, data.context_id)
    if (!participants) return Response.json({ error: 'Context not found' }, { status: 404 })
    for (const participantId of participants) {
      if (participantId !== session.id) recipients.add(participantId)
    }

    const past = db.prepare(
      'SELECT DISTINCT sender_id FROM messages WHERE context_type = ? AND context_id = ? AND sender_id != ?'
    ).all(data.context_type, data.context_id, session.id) as { sender_id: number }[]
    for (const r of past) recipients.add(r.sender_id)

    if (session.role === 'player' && recipients.size === 0) {
      const trainers = db.prepare("SELECT id FROM users WHERE role = 'trainer'").all() as { id: number }[]
      for (const t of trainers) recipients.add(t.id)
    }

    const recipientArr = Array.from(recipients).filter((recipientId) => !usersAreBlocked(session.id, recipientId))
    if (recipients.size > 0 && recipientArr.length === 0) {
      return Response.json({ error: 'Messaging is unavailable for this conversation' }, { status: 403 })
    }
    const primaryRecipient = recipientArr.length > 0 ? recipientArr[0] : null

    const result = db.prepare(
      'INSERT INTO messages (sender_id, recipient_id, body, context_type, context_id, context_title) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      session.id,
      primaryRecipient,
      data.body,
      data.context_type,
      data.context_id,
      data.context_title ?? null,
    )
    const messageId = result.lastInsertRowid as number

    // Save attachment to storage box if present
    if (data.attachment) {
      const saved = await saveAttachment(messageId, data.attachment.file, data.attachment.type)
      db.prepare(
        `UPDATE messages SET
          attachment_type = ?,
          attachment_path = ?,
          attachment_mime = ?,
          attachment_size_bytes = ?,
          attachment_duration_seconds = ?,
          attachment_filename = ?
        WHERE id = ?`
      ).run(
        data.attachment.type,
        saved.filename,
        saved.mime,
        saved.sizeBytes,
        data.attachment.duration_seconds ?? null,
        data.attachment.file.name || null,
        messageId,
      )
    }

    const linkMap: Record<string, string> = {
      workout: `/dashboard/workouts/${data.context_id}`,
      drill: `/dashboard/workouts`,
      move: `/dashboard/moves`,
      quiz: `/dashboard/classroom/${data.context_id}`,
      recording: `/dashboard/comparison`,
      general: '/dashboard/calendar',
    }
    const linkUrl = linkMap[data.context_type] || '/dashboard/calendar'
    const ctx = data.context_title ? ` about ${data.context_title}` : ''

    let preview: string
    if (data.attachment) {
      const labels: Record<string, string> = {
        voice: 'sent a voice message',
        image: 'sent a photo',
        video: 'sent a video',
        file: 'sent a file',
      }
      preview = labels[data.attachment.type] || 'sent an attachment'
      if (data.body) preview = `${preview}: ${data.body.slice(0, 60)}`
    } else {
      preview = data.body.length > 80 ? data.body.slice(0, 77) + '...' : data.body
    }

    // For recording-context messages, route each recipient to the surface
    // where they can play the video and continue the chat.
    let recordingOwnerId: number | null = null
    if (data.context_type === 'recording') {
      const r = db.prepare('SELECT player_id FROM recordings WHERE id = ?').get(data.context_id) as
        | { player_id: number }
        | undefined
      recordingOwnerId = r?.player_id ?? null
    }

    for (const rid of recipientArr) {
      let link = linkUrl
      if (data.context_type === 'recording' && recordingOwnerId != null) {
        link = rid === recordingOwnerId
          ? '/dashboard/me'
          : `/dashboard/players/${recordingOwnerId}`
      }
      createNotification({
        player_id: rid,
        actor_id: session.id,
        type: 'message_received',
        message: `${session.name}${ctx}: ${preview}`,
        link_url: link,
        push_title: `Message from ${session.name}`,
      }).catch(() => {})
    }

    return Response.json({ id: messageId }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0].message }, { status: 400 })
    }
    if (err instanceof BadRequestError) {
      return Response.json({ error: err.message }, { status: 400 })
    }
    console.error('Thread post error:', err)
    return Response.json({ error: 'Failed to post' }, { status: 500 })
  }
}
