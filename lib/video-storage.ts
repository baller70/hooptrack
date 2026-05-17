import { openDB, IDBPDatabase, DBSchema } from 'idb'

export type VideoSyncStatus = 'pending' | 'synced' | 'failed'

export interface VideoMeta {
  key: string
  drillId: number
  drillName: string
  duration: number
  repCount: number | null
  createdAt: number
  status: VideoSyncStatus
  serverRecordingId: number | null
  lastError: string | null
}

interface HoopTrackVideoDB extends DBSchema {
  videos: {
    key: string
    value: Blob
  }
  videoMeta: {
    key: string
    value: VideoMeta
  }
}

let dbPromise: Promise<IDBPDatabase<HoopTrackVideoDB>> | null = null

function getVideoDB() {
  if (!dbPromise) {
    dbPromise = openDB<HoopTrackVideoDB>('hooptrack-videos', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) db.createObjectStore('videos')
        if (oldVersion < 2) db.createObjectStore('videoMeta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function saveVideoToIndexedDB(blob: Blob): Promise<string> {
  const db = await getVideoDB()
  const key = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await db.put('videos', blob, key)
  return key
}

export async function getVideoFromIndexedDB(key: string): Promise<Blob | undefined> {
  const db = await getVideoDB()
  return db.get('videos', key)
}

export async function deleteVideoFromIndexedDB(key: string): Promise<void> {
  const db = await getVideoDB()
  await db.delete('videos', key)
  try {
    await db.delete('videoMeta', key)
  } catch {
    // best-effort
  }
}

export async function getAllVideoKeys(): Promise<string[]> {
  const db = await getVideoDB()
  return db.getAllKeys('videos') as unknown as string[]
}

export async function saveVideoMeta(meta: VideoMeta): Promise<void> {
  const db = await getVideoDB()
  await db.put('videoMeta', meta)
}

export async function updateVideoMeta(key: string, patch: Partial<VideoMeta>): Promise<VideoMeta | null> {
  const db = await getVideoDB()
  const existing = await db.get('videoMeta', key)
  if (!existing) return null
  const next = { ...existing, ...patch, key }
  await db.put('videoMeta', next)
  return next
}

export async function getVideoMeta(key: string): Promise<VideoMeta | undefined> {
  const db = await getVideoDB()
  return db.get('videoMeta', key)
}

export async function getAllVideoMeta(): Promise<VideoMeta[]> {
  const db = await getVideoDB()
  return db.getAll('videoMeta')
}

// Returns metadata entries whose blob hasn't been confirmed by the server.
export async function getUnsyncedVideos(): Promise<VideoMeta[]> {
  const all = await getAllVideoMeta()
  return all.filter((m) => m.status !== 'synced')
}
