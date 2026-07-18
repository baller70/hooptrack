'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DRILL_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import VideoSpeedControl from '@/components/video-speed-control'

interface Player {
  id: number
  name: string
}

export default function UploadMovePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')
  const [uploadedPath, setUploadedPath] = useState('')
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState(1)
  const [form, setForm] = useState<{
    title: string
    category: string
    description: string
    assigned_to_player_id: string
  }>({
    title: '',
    category: DRILL_CATEGORIES[0],
    description: '',
    assigned_to_player_id: '',
  })

  useEffect(() => {
    fetch('/api/players')
      .then((r) => r.json())
      .then((d) => setPlayers(d.players || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
    }
  }, [videoPreview])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov)$/i)) {
      toast.error('Please select a video file (MP4, WebM, or MOV)')
      return
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))

    // Auto-fill title from filename
    if (!form.title) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setForm({ ...form, title: name })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) {
      toast.error('Title is required')
      return
    }

    // Upload first if not already uploaded
    let path = uploadedPath
    if (!path) {
      if (!videoFile) {
        toast.error('Please select a video file')
        return
      }
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('video', videoFile)
        const res = await fetch('/api/moves/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        path = data.videoPath
        setUploadedPath(path)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    if (!path) {
      toast.error('Please select a video file')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          youtube_url: '',
          category: form.category,
          description: form.description,
          assigned_to_player_id: form.assigned_to_player_id ? parseInt(form.assigned_to_player_id) : undefined,
          video_type: 'upload',
          video_path: path,
          default_playback_rate: defaultPlaybackRate,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Failed to save move')
        return
      }
      toast.success('Custom move added!')
      router.push('/dashboard/moves')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link href="/dashboard/moves" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6">Upload Custom Move</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 space-y-4">
          {/* Video File Picker */}
          <div>
            <Label>Video File</Label>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!videoFile ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-hoop-orange hover:bg-orange-50 transition-colors"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Click to select a video</p>
                <p className="text-sm text-muted-foreground mt-1">MP4, WebM, or MOV</p>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="aspect-video rounded-lg overflow-hidden border bg-black">
                  <video src={videoPreview} controls playsInline className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{videoFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoPreview) URL.revokeObjectURL(videoPreview)
                      setVideoFile(null)
                      setVideoPreview('')
                      setUploadedPath('')
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                    className="text-sm text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                {uploadedPath && (
                  <p className="text-xs text-green-600 font-medium">Uploaded successfully</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. My Crossover Move" />
          </div>

          <div>
            <Label>Category</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              {DRILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes about this move..." />
          </div>

          <div>
            <Label>Assign to Player (optional)</Label>
            <select
              value={form.assigned_to_player_id}
              onChange={(e) => setForm({ ...form, assigned_to_player_id: e.target.value })}
              className="w-full h-10 rounded-md border-2 border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All players</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Default playback speed for player</Label>
            <div className="mt-1">
              <VideoSpeedControl rate={defaultPlaybackRate} onChange={setDefaultPlaybackRate} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Player can override on their end. Pick slower for moves that need careful study.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={loading || uploading || !videoFile}>
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
          ) : loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Upload className="h-4 w-4" /> Upload & Save Move</>
          )}
        </Button>
      </form>
    </div>
  )
}
