'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AIInspiration() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/inspiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) setMessage(data.message)
    } catch {} finally {
      setLoading(false)
    }
  }

  if (!message) {
    return (
      <Button onClick={generate} disabled={loading} variant="outline" size="sm" className="gap-2 border-purple-300 text-purple-700">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        Daily Motivation
      </Button>
    )
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-orange-50 border-2 border-purple-200 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="h-3 w-3 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">AI Coach Says</span>
          </div>
          <p className="text-sm font-medium italic">&ldquo;{message}&rdquo;</p>
        </div>
        <button onClick={generate} disabled={loading} className="text-purple-600 hover:text-purple-800 p-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
