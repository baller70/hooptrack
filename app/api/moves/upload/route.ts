import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      return Response.json({ error: 'Only MP4, WebM, and MOV files are allowed' }, { status: 400 })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || '.mp4'
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
