import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024
const MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/mov': '.mov',
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'trainer') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('video') as File | null
    if (!file) {
      return Response.json({ error: 'No video file provided' }, { status: 400 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'Video file is too large' }, { status: 413 })
    }

    // Validate file type
    const mime = (file.type || '').toLowerCase()
    if (!MIME_EXTENSIONS[mime]) {
      return Response.json({ error: 'Only MP4, WebM, and MOV files are allowed' }, { status: 400 })
    }

    // Generate unique filename
    const ext = MIME_EXTENSIONS[mime]
    const filename = `move_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'moves')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, filename)

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const videoPath = `/uploads/moves/${filename}`
    return Response.json({ videoPath })
  } catch (err) {
    console.error('Upload error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
