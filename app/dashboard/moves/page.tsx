'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, PlayCircle, Trash2, Upload, Film, Scissors, ChevronDown, ChevronRight, Folder, CircleDot, Crosshair, Footprints, Flame, Zap, Wind, ShieldCheck, BrainCircuit, Dumbbell } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DRILL_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import YouTubeEmbed from '@/components/youtube-embed'
import YouTubeClipper from '@/components/youtube-clipper'
import AIMoveRecommendations from '@/components/ai-move-recommendations'
import VideoSpeedControl from '@/components/video-speed-control'
import EntityChat from '@/components/entity-chat'
import InlineRename from '@/components/inline-rename'
import LibraryTabs from '@/components/library-tabs'

function UploadedVideoPlayer({ src, defaultRate }: { src: string; defaultRate: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [rate, setRate] = useState(defaultRate || 1)

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])

  return (
    <div className="relative aspect-video">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        onLoadedMetadata={() => { if (videoRef.current) videoRef.current.playbackRate = rate }}
        className="w-full h-full object-contain bg-black rounded-lg"
      />
      <div className="absolute top-2 right-2 z-10">
        <VideoSpeedControl rate={rate} onChange={setRate} compact />
      </div>
    </div>
  )
}

interface Move {
  id: number
  title: string
  youtube_url: string
  category: string
  description: string | null
  assigned_player_name: string | null
  creator_name: string
  clip_start: number | null
  clip_end: number | null
  video_type: string
  video_path: string | null
  default_playback_rate: number
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Ball Handling': CircleDot,
  'Shooting': Crosshair,
  'Footwork': Footprints,
  'Finishing': Flame,
  'Triple Threat': Zap,
  'Speed & Agility': Wind,
  'Defense': ShieldCheck,
  'Mentality': BrainCircuit,
  'Strength & Conditioning': Dumbbell,
}

export default function MovesPage() {
  const [moves, setMoves] = useState<Move[]>([])
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingClipId, setEditingClipId] = useState<number | null>(null)
  const [pendingClip, setPendingClip] = useState<{ start: number; end: number }>({ start: 0, end: 0 })
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    fetchMoves()
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setUserRole(d.user.role)
    }).catch(() => {})
  }, [])

  async function fetchMoves() {
    const res = await fetch('/api/moves')
    const data = await res.json()
    setMoves(data.moves || [])
  }

  function toggleCategory(cat: string) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  async function saveClip(id: number, start: number, end: number) {
    const res = await fetch(`/api/moves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_start: start, clip_end: end }),
    })
    if (res.ok) {
      toast.success('Clip updated!')
      setEditingClipId(null)
      fetchMoves()
    } else {
      toast.error('Failed to save clip')
    }
  }

  async function deleteMove(id: number) {
    if (!confirm('Delete this move?')) return
    const res = await fetch(`/api/moves/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Move deleted')
      fetchMoves()
    }
  }

  async function renameMove(id: number, newTitle: string) {
    const res = await fetch(`/api/moves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    if (res.ok) {
      setMoves(moves.map((m) => (m.id === id ? { ...m, title: newTitle } : m)))
      toast.success('Move renamed')
    } else {
      toast.error('Rename failed')
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Group moves by category
  const grouped: Record<string, Move[]> = {}
  for (const move of moves) {
    if (!grouped[move.category]) grouped[move.category] = []
    grouped[move.category].push(move)
  }

  // All categories — show ones with moves first, then empty ones
  const categoriesWithMoves = DRILL_CATEGORIES.filter(c => grouped[c]?.length > 0)
  const categoriesEmpty = DRILL_CATEGORIES.filter(c => !grouped[c]?.length)
  // Also include any custom categories from AI that aren't in DRILL_CATEGORIES
  const customCategories = Object.keys(grouped).filter(c => !DRILL_CATEGORIES.includes(c as typeof DRILL_CATEGORIES[number]))

  const totalMoves = moves.length

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <LibraryTabs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-[family-name:var(--font-russo)] text-2xl">Players Moves</h2>
          <p className="text-sm text-muted-foreground">{totalMoves} moves across {categoriesWithMoves.length + customCategories.length} categories</p>
        </div>
        {userRole === 'trainer' && (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/moves/create"
              className="flex items-center gap-1 bg-hoop-orange text-white px-3 py-2 rounded-lg font-semibold text-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              YouTube
            </Link>
            <Link
              href="/dashboard/moves/upload"
              className="flex items-center gap-1 bg-hoop-black text-white px-3 py-2 rounded-lg font-semibold text-sm hover:opacity-90"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Link>
          </div>
        )}
      </div>

      {/* AI Recommendations — trainer only */}
      {userRole === 'trainer' && (
        <div className="mb-6">
          <AIMoveRecommendations onAdded={fetchMoves} />
        </div>
      )}

      {/* Category Sections */}
      <div className="space-y-3">
        {/* Categories with moves */}
        {[...categoriesWithMoves, ...customCategories].map((category) => {
          const items = grouped[category] || []
          const isOpen = openCategories.has(category)
          const IconComponent = CATEGORY_ICONS[category] || Folder

          return (
            <div key={category} className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] overflow-hidden">
              {/* Category Header — click to expand */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="h-6 w-6 text-hoop-orange" />
                  <div className="text-left">
                    <h3 className="font-[family-name:var(--font-russo)] text-lg">{category}</h3>
                    <p className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? 'move' : 'moves'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
              </button>

              {/* Moves inside category */}
              {isOpen && (
                <div className="border-t-2 border-gray-100">
                  {items.map((move) => (
                    <div key={move.id} className="border-b border-gray-100 last:border-b-0">
                      <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(expandedId === move.id ? null : move.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{move.title}</h4>
                            {userRole === 'trainer' && (
                              <InlineRename value={move.title} onSave={(v) => renameMove(move.id, v)} variant="h4" iconOnly />
                            )}
                            {move.video_type === 'upload' && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                <Film className="h-3 w-3 inline mr-0.5" />Custom
                              </span>
                            )}
                            {!move.youtube_url && move.video_type !== 'upload' && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">No video</span>
                            )}
                          </div>
                          {move.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{move.description}</p>}
                          {move.clip_start != null && move.clip_end != null && (
                            <span className="text-xs text-muted-foreground">
                              Clip: {formatTime(move.clip_start)} – {formatTime(move.clip_end)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {userRole === 'trainer' && (
                            <button onClick={(e) => { e.stopPropagation(); deleteMove(move.id) }} className="text-destructive p-1 hover:opacity-70">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <PlayCircle className="h-5 w-5 text-red-600" />
                        </div>
                      </div>

                      {/* Expanded move content */}
                      {expandedId === move.id && (
                        <div className="px-4 pb-4">
                          {move.video_type === 'upload' && move.video_path ? (
                            <UploadedVideoPlayer src={move.video_path} defaultRate={move.default_playback_rate || 1} />
                          ) : editingClipId === move.id ? (
                            <div className="space-y-3">
                              <YouTubeClipper
                                url={move.youtube_url}
                                initialStart={move.clip_start || 0}
                                initialEnd={move.clip_end || 0}
                                onClipChange={(start, end) => setPendingClip({ start, end })}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => saveClip(move.id, pendingClip.start, pendingClip.end)}>
                                  Save Clip
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingClipId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : move.youtube_url ? (
                            <div className="space-y-2">
                              <div className="aspect-video rounded-lg overflow-hidden">
                                <YouTubeEmbed
                                  url={move.youtube_url}
                                  clipStart={move.clip_start}
                                  clipEnd={move.clip_end}
                                  defaultPlaybackRate={move.default_playback_rate || 1}
                                />
                              </div>
                              {userRole === 'trainer' && (
                                <button onClick={() => setEditingClipId(move.id)} className="flex items-center gap-1 text-sm text-purple-700 hover:text-purple-900 font-medium">
                                  <Scissors className="h-3.5 w-3.5" />
                                  Edit Clip
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4 text-center space-y-2">
                              <p className="text-sm text-muted-foreground">No video attached yet.</p>
                            </div>
                          )}
                        </div>
                      )}
                      {expandedId === move.id && (
                        <EntityChat contextType="move" contextId={move.id} contextTitle={move.title} compact embedded />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Empty categories */}
        {categoriesEmpty.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-medium">Empty Categories</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categoriesEmpty.map((category) => {
                const Icon = CATEGORY_ICONS[category] || Folder
                return (
                  <div key={category} className="bg-white border border-gray-200 rounded-lg p-3 text-center opacity-60">
                    <Icon className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-xs font-medium mt-1">{category}</p>
                    <p className="text-[10px] text-muted-foreground">0 moves</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {totalMoves === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No moves yet. Use AI recommendations or add your own.</p>
        </div>
      )}
    </div>
  )
}
