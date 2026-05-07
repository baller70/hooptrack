import { openDB, IDBPDatabase } from 'idb'

interface HoopTrackVideoDB {
  videos: {
    key: string
    value: Blob
  }
}

let dbPromise: Promise<IDBPDatabase<HoopTrackVideoDB>>

function getVideoDB() {
  if (!dbPromise) {
    dbPromise = openDB<HoopTrackVideoDB>('hooptrack-videos', 1, {
      upgrade(db) {
        db.createObjectStore('videos')
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
}

export async function getAllVideoKeys(): Promise<string[]> {
  const db = await getVideoDB()
  return db.getAllKeys('videos') as unknown as string[]
}
