'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CloudAlert,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { appPath, type HoopApp } from '@/lib/app-routes'
import {
  Card,
  EmptyState,
  GhostButton,
  NavRow,
  PageTitle,
  Pill,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/ios/005-player-capture-setup-raw.png
 * and, when an upload genuinely fails,
 * design/hooptrack-raw-individual-screens/states/003-player-upload-failed-raw.png */

type CameraState = 'checking' | 'granted' | 'prompt' | 'denied' | 'unavailable'

/** Mirrors ALLOWED_MIME in app/api/recordings/upload/route.ts. */
const ACCEPTED_UPLOAD_TYPES = ['video/webm', 'video/mp4']

interface DrillOption {
  id: number
  name: string
  workout_title: string | null
  category: string
}

interface RecentUpload {
  id: number
  label: string
  uploadedAt: string
}

/** Everything needed to retry the exact same upload against the same row. */
interface FailedUpload {
  file: File
  recordingId: number | null
  blobKey: string
  message: string
}

export default function CaptureSetup({ app }: { app: HoopApp }) {
  const [drills, setDrills] = useState<DrillOption[]>([])
  const [drillsLoaded, setDrillsLoaded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedDrill, setSelectedDrill] = useState<DrillOption | null>(null)

  const [camera, setCamera] = useState<CameraState>('checking')
  const [enabling, setEnabling] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [failed, setFailed] = useState<FailedUpload | null>(null)
  const [recent, setRecent] = useState<RecentUpload[]>([])
  const [recentLoaded, setRecentLoaded] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ---------------------------------------------------------------- drills */
  useEffect(() => {
    let cancelled = false
    fetch('/api/drills/options', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { drills: [] }))
      .then((d: { drills?: DrillOption[] }) => {
        if (cancelled) return
        // The lazily-created personal "Free Play" drill is an implementation
        // detail — it is what an unattached recording falls back to.
        setDrills(
          (d.drills ?? []).filter(
            (drill) => !(drill.name === 'Free Play Session' && drill.workout_title === 'Free Play'),
          ),
        )
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDrillsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* ------------------------------------------------------- recent uploads */
  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        recordings?: Array<{
          id: number
          notes: string | null
          drill_name: string
          video_path: string | null
          recorded_at: string
        }>
      }
      // Only rows whose bytes actually landed on the server count as uploaded.
      setRecent(
        (data.recordings ?? [])
          .filter((row) => !!row.video_path)
          .slice(0, 3)
          .map((row) => ({
            id: row.id,
            label: row.notes?.trim() || row.drill_name,
            uploadedAt: row.recorded_at,
          })),
      )
    } catch {
      // The panel degrades to its empty state; nothing here is load-bearing.
    } finally {
      setRecentLoaded(true)
    }
  }, [])

  /* ---------------------------------------------------------------- camera */
  useEffect(() => {
    let cancelled = false

    async function probe() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        if (!cancelled) setCamera('unavailable')
        return
      }
      let permission: PermissionState | null = null
      try {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
        permission = status.state
      } catch {
        // Safari/WKWebView don't expose the camera permission descriptor.
      }
      let hasCamera = false
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        hasCamera = devices.some((device) => device.kind === 'videoinput')
      } catch {
        hasCamera = false
      }
      if (cancelled) return
      if (!hasCamera) setCamera('unavailable')
      else if (permission === 'granted') setCamera('granted')
      else if (permission === 'denied') setCamera('denied')
      else setCamera('prompt')
    }

    probe()
    return () => {
      cancelled = true
    }
  }, [])

  async function enableCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unavailable')
      toast.error('This browser cannot access a camera.')
      return
    }
    setEnabling(true)
    try {
      // Ask for the permission, then release the device immediately — the
      // recorder opens its own stream when the player actually starts.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setCamera('granted')
      toast.success('Camera enabled')
    } catch (error) {
      const name = (error as DOMException)?.name
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
        setCamera('unavailable')
        toast.error('No camera was found on this device.')
      } else {
        setCamera('denied')
        toast.error('Camera access was blocked. Allow it in your browser or iOS settings.')
      }
    } finally {
      setEnabling(false)
    }
  }

  /* ---------------------------------------------------------------- upload */

  /** Reads the real duration out of the picked file; 0 when unreadable. */
  function readDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const probe = document.createElement('video')
      const done = (seconds: number) => {
        URL.revokeObjectURL(url)
        resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0)
      }
      probe.preload = 'metadata'
      probe.onloadedmetadata = () => done(probe.duration)
      probe.onerror = () => done(0)
      probe.src = url
    })
  }

  function putFile(file: File, recordingId: number, blobKey: string) {
    return new Promise<void>((resolve, reject) => {
      const form = new FormData()
      form.append('video', file, file.name)
      form.append('recording_id', String(recordingId))
      form.append('blob_key', blobKey)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/recordings/upload', true)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
          return
        }
        let detail = ''
        try {
          detail = (JSON.parse(xhr.responseText) as { error?: string }).error ?? ''
        } catch {
          // Non-JSON error body — fall back to the status line.
        }
        reject(new Error(detail || `Upload returned ${xhr.status}.`))
      }
      xhr.onerror = () => reject(new Error('Network connection lost. Please check your connection and try again.'))
      xhr.ontimeout = () => reject(new Error('The upload timed out. Please try again.'))
      xhr.onabort = () => reject(new Error('The upload was cancelled.'))
      xhr.send(form)
    })
  }

  async function runUpload(file: File, existing?: { recordingId: number | null; blobKey: string }) {
    setUploading(true)
    setUploadProgress(0)

    const blobKey = existing?.blobKey ?? `gal_${Date.now()}_${Math.random().toString(36).slice(2)}`
    let recordingId = existing?.recordingId ?? null

    try {
      if (!recordingId) {
        let drillId = selectedDrill?.id
        if (!drillId) {
          const freeRes = await fetch('/api/drills/free-play', { cache: 'no-store' })
          const freeData = (await freeRes.json()) as { drill?: { id: number }; error?: string }
          if (!freeRes.ok || !freeData.drill) throw new Error(freeData.error || 'Could not prepare a drill for this clip.')
          drillId = freeData.drill.id
        }

        const duration = await readDuration(file)
        const createRes = await fetch('/api/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drillId, blobKey, duration, notes: file.name }),
        })
        const createData = (await createRes.json().catch(() => ({}))) as { id?: number; error?: string }
        if (!createRes.ok || !createData.id) {
          throw new Error(createData.error || `Could not create the recording (${createRes.status}).`)
        }
        recordingId = createData.id
      }

      await putFile(file, recordingId, blobKey)
      setFailed(null)
      toast.success('Video uploaded')
      await loadRecent()
    } catch (error) {
      // The row exists but the bytes did not land — hold on to everything the
      // retry needs so RETRY UPLOAD hits the same recording, not a new one.
      setFailed({
        file,
        recordingId,
        blobKey,
        message: error instanceof Error ? error.message : 'Upload failed.',
      })
      loadRecent()
    } finally {
      setUploading(false)
    }
  }

  async function onFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    // /api/recordings/upload only stores WebM and MP4. Catching it here keeps a
    // rejected file from leaving an empty recording row behind, and says why.
    if (!ACCEPTED_UPLOAD_TYPES.some((type) => file.type.toLowerCase().startsWith(type))) {
      toast.error(
        file.type
          ? `${file.type} isn't supported yet — upload an MP4 or WebM.`
          : 'That file type is not supported — upload an MP4 or WebM.',
      )
      return
    }
    // Abandoning a failed upload leaves a recording row with no video behind —
    // drop it rather than let it show up in the library as an empty clip.
    if (failed?.recordingId) {
      const abandoned = failed.recordingId
      setFailed(null)
      await fetch(`/api/recordings/${abandoned}`, { method: 'DELETE' }).catch(() => undefined)
    }
    runUpload(file)
  }

  const recordHref = appPath(app, selectedDrill ? `/record?drillId=${selectedDrill.id}` : '/record')

  /* -------------------------------------------------------- failed screen */
  if (failed) {
    return (
      <div className="mx-auto w-full max-w-[560px] pb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={onFilePicked}
        />

        <PageTitle className="mt-3 text-[50px] lg:text-[38px]">Upload Failed</PageTitle>

        <Card className="mt-6 border-ht-red bg-ht-red-tint">
          <div className="flex items-start gap-4">
            <CloudAlert className="size-12 shrink-0 text-ht-red" strokeWidth={1.6} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold text-ht-ink">Upload failed.</p>
              <p className="mt-1.5 text-[14px] leading-6 text-ht-ink/80">{failed.message}</p>
              <p className="mt-1.5 truncate text-[13px] text-ht-muted">{failed.file.name}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <PrimaryButton
              onClick={() => runUpload(failed.file, { recordingId: failed.recordingId, blobKey: failed.blobKey })}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading {uploadProgress}%
                </>
              ) : (
                'Retry Upload'
              )}
            </PrimaryButton>
            <GhostButton onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              Choose Another Video
            </GhostButton>
          </div>
        </Card>

        <RecentUploads recent={recent} loaded={recentLoaded} className="mt-5" />

        <Card padded={false} className="mt-5">
          <NavRow
            icon={Video}
            label="Record New instead"
            description="Capture a new rep with your camera."
            href={recordHref}
            last
          />
        </Card>
      </div>
    )
  }

  /* --------------------------------------------------------- setup screen */
  return (
    <div className="mx-auto w-full max-w-[560px] pb-4 lg:max-w-none">
      <input ref={fileInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={onFilePicked} />

      <PageTitle className="mt-3 text-[50px] lg:text-[38px]">Capture Setup</PageTitle>

      {/* The iOS cards run tighter than the browser default, so the leading is
       * set once here and inherited by the rows, including NavRow. */}
      <div className="mt-6 space-y-4 leading-[1.3] lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
        {/* CHOOSE DRILL */}
        <Card padded={false}>
          <CardTitleRow title="Choose Drill" />
          <ActionRow
            icon={ClipboardList}
            label="Select a Drill"
            description={selectedDrill ? selectedDrill.name : 'Pick from your plan or library.'}
            onClick={() => setPickerOpen((open) => !open)}
            expanded={pickerOpen}
            last={!pickerOpen}
          />
          {pickerOpen ? (
            <div className="max-h-[280px] overflow-y-auto border-t border-ht-line-soft">
              {!drillsLoaded ? (
                <p className="flex items-center gap-2 px-5 py-4 text-[14px] text-ht-muted">
                  <Loader2 className="size-4 animate-spin" /> Loading drills…
                </p>
              ) : drills.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No drills yet"
                  body="Recordings without a drill are filed under Free Play."
                />
              ) : (
                <>
                  <DrillChoice
                    label="Free Play"
                    hint="No drill — file it under Free Play."
                    selected={selectedDrill === null}
                    onClick={() => {
                      setSelectedDrill(null)
                      setPickerOpen(false)
                    }}
                  />
                  {drills.map((drill) => (
                    <DrillChoice
                      key={drill.id}
                      label={drill.name}
                      hint={drill.workout_title ?? drill.category}
                      selected={selectedDrill?.id === drill.id}
                      onClick={() => {
                        setSelectedDrill(drill)
                        setPickerOpen(false)
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          ) : null}
        </Card>

        {/* RECORD NEW */}
        <Card padded={false}>
          <CardTitleRow title="Record New" />
          <NavRow
            icon={Video}
            label="Start Recording"
            description="Record a new rep."
            href={recordHref}
            last
          />
        </Card>

        {/* UPLOAD FROM GALLERY */}
        <Card padded={false}>
          <CardTitleRow title="Upload From Gallery" />
          <ActionRow
            icon={ImageIcon}
            label="Choose Video"
            description={
              uploading ? `Uploading ${clampProgress(uploadProgress)}%…` : 'Upload an existing video.'
            }
            onClick={() => fileInputRef.current?.click()}
            busy={uploading}
            last
          />
          {uploading ? (
            <div className="h-1 w-full overflow-hidden rounded-b-xl bg-ht-chip">
              <div
                className="h-full bg-ht-orange transition-[width]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          ) : null}
        </Card>

        {/* ENABLE CAMERA */}
        <Card padded={false}>
          <CardTitleRow title={camera === 'granted' ? 'Camera Ready' : 'Enable Camera'} />
          <div className="flex items-center gap-3 px-4 py-4">
            <Camera className="size-6 shrink-0 text-ht-ink" strokeWidth={1.6} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ht-ink">Camera Access</p>
              <p className="mt-0.5 text-[12.5px] leading-[1.35] text-ht-muted">
                {camera === 'granted'
                  ? 'This device can record video.'
                  : 'Allow camera access to record and capture video.'}
              </p>
            </div>
            {camera === 'granted' ? (
              <Pill tone="green">Ready</Pill>
            ) : (
              <PrimaryButton
                className="w-auto shrink-0 px-3.5 py-2.5 text-[13px]"
                onClick={enableCamera}
                disabled={enabling || camera === 'checking'}
              >
                {enabling ? <Loader2 className="size-4 animate-spin" /> : 'Enable'}
              </PrimaryButton>
            )}
          </div>
        </Card>

        {/* Permission warning — only when the device really can't record. */}
        {camera === 'denied' || camera === 'unavailable' ? (
          <div className="rounded-xl border border-ht-orange/40 bg-ht-orange-soft px-4 py-4 lg:col-span-2">
            <div className="flex items-center gap-4">
              <ShieldAlert className="size-11 shrink-0 text-ht-orange" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-ht-ink">
                  {camera === 'denied' ? 'Camera Access Needed' : 'No Camera Detected'}
                </p>
                <p className="mt-1 text-[13px] leading-5 text-ht-muted">
                  {camera === 'denied'
                    ? 'Camera access is required to record videos. You can enable it in Settings.'
                    : 'This device has no camera available, so recording is off. You can still upload an existing video.'}
                </p>
              </div>
              {camera === 'denied' ? (
                <GhostButton className="w-auto shrink-0 px-4 py-2.5 text-[13px]" onClick={enableCamera}>
                  Open Settings
                </GhostButton>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value))
}

/** Card header + hairline, matching the iOS cards in the pack. */
function CardTitleRow({ title }: { title: string }) {
  return (
    <div className="border-b border-ht-line-soft px-5 py-3">
      <SectionTitle className="leading-[1.15]">{title}</SectionTitle>
    </div>
  )
}

/**
 * NavRow's twin for rows that run an action instead of navigating. Kept
 * class-for-class identical so the two never drift visually.
 */
function ActionRow({
  icon: Icon,
  label,
  description,
  onClick,
  busy = false,
  expanded,
  last = false,
}: {
  icon: LucideIcon
  label: string
  description?: string
  onClick: () => void
  busy?: boolean
  expanded?: boolean
  last?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-expanded={expanded}
      className={cn(
        'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ht-orange-tint/60',
        'disabled:cursor-not-allowed disabled:opacity-70',
        !last && 'border-b border-ht-line-soft',
      )}
    >
      <Icon className="size-6 shrink-0 text-ht-ink" strokeWidth={1.6} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ht-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-[13px] text-ht-muted">{description}</span>
        ) : null}
      </span>
      {busy ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-ht-orange" />
      ) : (
        <ChevronRight
          className={cn('size-5 shrink-0 text-ht-muted transition-transform', expanded && 'rotate-90')}
          strokeWidth={2}
        />
      )}
    </button>
  )
}

function DrillChoice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string
  hint: string | null
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 border-b border-ht-line-soft px-5 py-3 text-left last:border-b-0',
        selected ? 'bg-ht-orange-tint' : 'hover:bg-ht-chip/60',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ht-ink">{label}</span>
        {hint ? <span className="block truncate text-[12.5px] text-ht-muted">{hint}</span> : null}
      </span>
      {selected ? <CheckCircle2 className="size-5 shrink-0 text-ht-orange" strokeWidth={2} /> : null}
    </button>
  )
}

function relativeTime(iso: string) {
  // recorded_at is stored as a UTC "YYYY-MM-DD HH:MM:SS" string by SQLite.
  const parsed = Date.parse(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`)
  if (Number.isNaN(parsed)) return 'Uploaded'
  const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60000))
  if (minutes < 1) return 'Uploaded just now'
  if (minutes < 60) return `Uploaded ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Uploaded ${hours}h ago`
  return `Uploaded ${Math.round(hours / 24)}d ago`
}

function RecentUploads({
  recent,
  loaded,
  className,
}: {
  recent: RecentUpload[]
  loaded: boolean
  className?: string
}) {
  return (
    <Card padded={false} className={className}>
      <CardTitleRow title="Recent Uploads" />
      {!loaded ? (
        <p className="flex items-center gap-2 px-5 py-4 text-[14px] text-ht-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : recent.length === 0 ? (
        <EmptyState
          icon={FileVideo}
          title="No uploads yet"
          body="Clips appear here once their video finishes uploading."
        />
      ) : (
        recent.map((row, index) => (
          <div
            key={row.id}
            className={cn(
              'flex items-center gap-4 px-5 py-4',
              index < recent.length - 1 && 'border-b border-ht-line-soft',
            )}
          >
            <FileVideo className="size-6 shrink-0 text-ht-ink" strokeWidth={1.6} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-ht-ink">{row.label}</span>
              <span className="mt-0.5 block text-[13px] text-ht-muted">{relativeTime(row.uploadedAt)}</span>
            </span>
            <CheckCircle2 className="size-6 shrink-0 text-ht-green" strokeWidth={1.8} />
          </div>
        ))
      )}
    </Card>
  )
}
