'use client'

import { useEffect, useState } from 'react'
import { Video, Trophy, ChevronDown, ChevronUp, Loader2, Trash2, Scissors, Pencil, Check, X } from 'lucide-react'
import RecordingClipper from '@/components/recording-clipper'
import AdaptiveVideo from '@/components/adaptive-video'
import { toast } from 'sonner'

interface Recording {
  id: number
  drill_id: number
  player_id?: number
  player_name?: string | null
  duration_seconds: number
  rep_count: number | null
  recorded_at: string
  video_path: string | null
  blob_key: string
  clip_start: number | null
  clip_end: number | null
  title: string | null
  parent_recording_id: number | null
}

interface Props {
  drillId: number
  drillName: string
  defaultOpen?: boolean
  embedded?: boolean
  highlightId?: number | null
  viewerRole?: 'trainer' | 'player'
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function RecordingsList({ drillId, drillName: _drillName, defaultOpen = false, embedded = false, highlightId = null, viewerRole = 'player' }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState<number | null>(highlightId)
  const [editingClipId, setEditingClipId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [bestSeconds, setBestSeconds] = useState<number | null>(null)
  const [bestReps, setBestReps] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [savingRename, setSavingRename] = useState(false)

  function recompute(rows: Recording[]) {
    // Best metrics computed from full-length original recordings only — clips are derived
    const fullRows = rows.filter((r) => r.parent_recording_id == null)
    if (fullRows.length) {
      setBestSeconds(Math.min(...fullRows.map((r) => r.duration_seconds)))
      const repsRows = fullRows.filter((r) => r.rep_count != null)
      setBestReps(repsRows.length ? Math.max(...repsRows.map((r) => r.rep_count as number)) : null)
    } else {
      setBestSeconds(null)
      setBestReps(null)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/recordings?drillId=${drillId}`, { cache: 'no-store' })
      const d = await r.json()
      const rows: Recording[] = d.recordings || []
      setRecordings(rows)
      recompute(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillId])

  async function deleteRecording(id: number) {
    if (!confirm('Delete this recording? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const r = await fetch(`/api/recordings/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Delete failed')
      toast.success('Recording deleted')
      const next = recordings.filter((x) => x.id !== id)
      setRecordings(next)
      recompute(next)
      if (playingId === id) setPlayingId(null)
      if (editingClipId === id) setEditingClipId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  function onClipSaved(id: number, start: number, end: number) {
    const isFull = start === 0
    setRecordings(recordings.map((r) =>
      r.id === id
        ? { ...r, clip_start: isFull ? null : start, clip_end: isFull ? null : end }
        : r
    ))
    setEditingClipId(null)
  }

  async function onNewClipCreated(_newId: number) {
    setEditingClipId(null)
    await load()
  }

  function startRename(r: Recording) {
    setRenamingId(r.id)
    setRenameValue(r.title || '')
    setEditingClipId(null)
    setPlayingId(null)
  }

  async function saveRename(id: number) {
    const title = renameValue.trim()
    setSavingRename(true)
    try {
      const res = await fetch(`/api/recordings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null }),
      })
      if (!res.ok) throw new Error('Rename failed')
      setRecordings(recordings.map((r) => r.id === id ? { ...r, title: title || null } : r))
      setRenamingId(null)
      setRenameValue('')
      toast.success(title ? `Renamed to "${title}"` : 'Title cleared')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rename failed')
    } finally {
      setSavingRename(false)
    }
  }

  const wrapperClass = embedded
    ? 'border-t-2 border-gray-100'
    : 'bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] overflow-hidden'

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          <span className="font-semibold text-sm">
            {viewerRole === 'trainer' ? 'Recordings' : 'My Recordings'}
            {recordings.length > 0 && <span className="text-muted-foreground ml-1">({recordings.length})</span>}
          </span>
          {bestSeconds != null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" /> Best: {formatDuration(bestSeconds)}
              {bestReps != null && <> · {bestReps} reps</>}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t-2 border-gray-100 p-3 space-y-2">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading recordings...
            </p>
          )}
          {!loading && recordings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No recordings yet. Tap <strong>Record</strong> to make your first one.
            </p>
          )}
          {!loading && recordings.map((r) => {
            const isBest = r.parent_recording_id == null && r.duration_seconds === bestSeconds
            const isPlaying = playingId === r.id
            const isEditing = editingClipId === r.id
            const hasClip = r.clip_start != null && r.clip_end != null
            const isDerivedClip = r.parent_recording_id != null
            return (
              <div key={r.id} className={`border-2 rounded-lg overflow-hidden ${highlightId === r.id ? 'border-hoop-orange' : isDerivedClip ? 'border-purple-300' : 'border-gray-200'}`}>
                {renamingId === r.id ? (
                  <div className="flex items-center gap-2 p-2 bg-orange-50">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(r.id)
                        if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                      }}
                      placeholder="Recording title"
                      maxLength={200}
                      className="flex-1 rounded-md border-2 border-input bg-white px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveRename(r.id)}
                      disabled={savingRename}
                      className="p-1.5 rounded-md bg-black text-white hover:opacity-90 disabled:opacity-50"
                      title="Save"
                    >
                      {savingRename ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRenamingId(null); setRenameValue('') }}
                      className="p-1.5 rounded-md hover:bg-gray-100"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => { setEditingClipId(null); setPlayingId(isPlaying ? null : r.id) }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium truncate">
                        {viewerRole === 'trainer' && r.player_name && (
                          <span className="text-hoop-orange mr-1">{r.player_name}:</span>
                        )}
                        {r.title || formatDate(r.recorded_at)}
                        {isDerivedClip && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold"><Scissors className="inline h-3 w-3 mr-0.5" />CLIP</span>}
                        {isBest && bestSeconds != null && <span className="ml-2 text-[10px] text-yellow-700"><Trophy className="inline h-3 w-3" /> PR</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(r.duration_seconds)}
                        {r.rep_count != null && ` · ${r.rep_count} reps`}
                        {r.title && ` · ${formatDate(r.recorded_at)}`}
                        {hasClip && !isDerivedClip && ` · trimmed ${formatDuration(r.clip_start!)}–${formatDuration(r.clip_end!)}`}
                        {!r.video_path && ' · device-only'}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startRename(r) }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-blue-700"
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {r.video_path && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPlayingId(null); setEditingClipId(isEditing ? null : r.id) }}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-purple-700"
                          title="Edit clip"
                        >
                          <Scissors className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteRecording(r.id) }}
                        disabled={deletingId === r.id}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-red-600 disabled:opacity-50"
                        title="Delete recording"
                      >
                        {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingClipId(null); setPlayingId(isPlaying ? null : r.id) }}
                        className="p-1.5 rounded-md hover:bg-gray-100"
                        title={isPlaying ? 'Collapse' : 'Play'}
                      >
                        {isPlaying ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {isPlaying && !isEditing && (
                  r.video_path ? (
                    <AdaptiveVideo
                      key={r.id}
                      src={`/api/recordings/${r.id}/video${hasClip ? `#t=${r.clip_start},${r.clip_end}` : ''}`}
                      controls
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <div className="aspect-video bg-black w-full flex flex-col items-center justify-center text-white text-sm gap-2 p-4 text-center">
                      <p>This recording was made before video upload was enabled.</p>
                      <p className="text-xs text-gray-400">It only exists on the device that recorded it.</p>
                    </div>
                  )
                )}

                {isEditing && r.video_path && (
                  <div className="p-3 border-t-2 border-gray-100 bg-gray-50">
                    <RecordingClipper
                      recordingId={r.id}
                      videoSrc={`/api/recordings/${r.id}/video`}
                      durationSeconds={r.duration_seconds}
                      initialStart={r.clip_start ?? 0}
                      initialEnd={r.clip_end}
                      onSaved={(start, end) => onClipSaved(r.id, start, end)}
                      onClipCreated={onNewClipCreated}
                      onCancel={() => setEditingClipId(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
