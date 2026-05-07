'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function AICoachFeedback({ drillId, duration }: { drillId: number; duration: number }) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function getFeedback() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId, duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedback(data.feedback)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to get feedback')
    } finally {
      setLoading(false)
    }
  }

  if (feedback) {
    return (
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="font-semibold text-purple-800 text-sm">AI Coach Feedback</span>
        </div>
        <p className="text-sm text-purple-900">{feedback}</p>
      </div>
    )
  }

  return (
    <Button
      onClick={getFeedback}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2 mt-4 border-purple-300 text-purple-700 hover:bg-purple-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {loading ? 'Analyzing...' : 'Get AI Coach Feedback'}
    </Button>
  )
}
