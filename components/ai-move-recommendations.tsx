'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ExternalLink, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Recommendation {
  title: string
  category: string
  description: string
  youtube_search: string
  why: string
}

export default function AIMoveRecommendations({ onAdded }: { onAdded?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set())
  const [addingIndex, setAddingIndex] = useState<number | null>(null)

  async function getRecommendations() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillLevel: 'intermediate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecommendations(data.recommendations || [])
      setAddedIndexes(new Set())
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to get recommendations')
    } finally {
      setLoading(false)
    }
  }

  async function addToCatalog(rec: Recommendation, index: number) {
    setAddingIndex(index)
    try {
      // Step 1: Search YouTube for a real video
      const searchRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(rec.youtube_search)}`)
      const searchData = await searchRes.json()

      let youtubeUrl = ''
      if (searchRes.ok && searchData.videos?.length > 0) {
        youtubeUrl = searchData.videos[0].url
      }

      // Step 2: Save the move with the real video URL
      const res = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rec.title,
          youtube_url: youtubeUrl,
          category: rec.category,
          description: `${rec.description}\n\nWhy: ${rec.why}`,
          video_type: 'youtube',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add')
      }
      setAddedIndexes((prev) => new Set(prev).add(index))
      toast.success(`"${rec.title}" added with video!`)
      if (onAdded) onAdded()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add move')
    } finally {
      setAddingIndex(null)
    }
  }

  return (
    <div>
      {recommendations.length === 0 ? (
        <Button
          onClick={getRecommendations}
          disabled={loading}
          className="gap-2 bg-purple-600 hover:bg-purple-700 w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI is thinking...' : 'Get AI Move Recommendations'}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-sm">AI Recommended Moves</span>
            </div>
            <Button onClick={getRecommendations} disabled={loading} variant="outline" size="sm" className="gap-1 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Refresh
            </Button>
          </div>
          {recommendations.map((rec, i) => (
            <div key={i} className="bg-white border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  <p className="text-xs text-purple-700 mt-1 italic">{rec.why}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.youtube_search)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-700 p-1.5"
                    title="Search on YouTube"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {addedIndexes.has(i) ? (
                    <span className="text-green-600 p-1.5">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <button
                      onClick={() => addToCatalog(rec, i)}
                      disabled={addingIndex !== null}
                      className="text-purple-600 hover:text-purple-800 p-1.5 disabled:opacity-50"
                      title="Add to catalog with video"
                    >
                      {addingIndex === i ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
