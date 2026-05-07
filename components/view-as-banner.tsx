'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X, Loader2 } from 'lucide-react'

interface MeResponse {
  user: {
    id: number
    name: string
    role: 'trainer' | 'player'
    actual_id?: number
    actual_role?: 'trainer' | 'player'
    actual_name?: string
  } | null
}

export default function ViewAsBanner() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse['user']>(null)
  const [exiting, setExiting] = useState(false)

  async function load() {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' })
      const d = await r.json()
      setMe(d?.user || null)
    } catch {}
  }

  useEffect(() => { load() }, [])

  if (!me?.actual_id) return null

  async function exit() {
    setExiting(true)
    try {
      await fetch('/api/auth/view-as', { method: 'DELETE' })
      router.refresh()
      // Hard refresh too so server-rendered pages re-resolve session
      setTimeout(() => window.location.reload(), 100)
    } finally {
      setExiting(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-orange-500 text-white border-b-4 border-black px-3 py-2 flex items-center justify-between gap-2 text-sm font-semibold shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-5 w-5 shrink-0" />
        <span className="truncate">
          PLAYER PREVIEW — viewing as <strong className="underline">{me.name}</strong>. Signed in as {me.actual_name}.
        </span>
      </div>
      <button
        onClick={exit}
        disabled={exiting}
        className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 shrink-0 border-2 border-white"
      >
        {exiting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        Exit preview
      </button>
    </div>
  )
}
