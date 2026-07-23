'use client'
/* eslint-disable react-hooks/purity -- Date.now() and Math.random() are used inside requestAnimationFrame
 * callbacks and event handlers, never in the React render path. They are intentionally impure to
 * generate time-varying visuals (countdown, flashes, voice cue selection). */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Video, Square, RotateCcw, Check, Circle, Sparkles, Loader2, Trophy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import EntityChat from '@/components/entity-chat'
import RecordingsList from '@/components/recordings-list'

export type RecorderTimerMode = 'timed' | 'stopwatch' | 'reps' | 'interval'

export interface RecorderOptions {
  timerMode?: RecorderTimerMode
  durationSeconds?: number
  targetReps?: number
  // Interval mode
  intervalWorkSeconds?: number
  intervalRestSeconds?: number
  intervalRounds?: number

  // Visual cues drawn into the canvas while recording
  numberFlash?: { intervalSeconds: number }
  reactionPrompts?: { words: string[]; intervalSeconds: number }
  colorFlash?: { intervalSeconds: number }
  eyeLevelGuide?: boolean

  // Audio cues
  metronomeBpm?: number
  voiceCues?: { words: string[]; intervalSeconds: number }
}

interface Drill {
  id: number
  name: string
  duration_seconds: number
  timer_mode: 'timed' | 'stopwatch' | 'reps'
  target_reps: number | null
}

interface PRData {
  previous_seconds: number | null
  best_seconds: number | null
  previous_reps: number | null
  best_reps: number | null
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

function formatTime(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60)
  const secs = Math.abs(seconds) % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function makeBeeper() {
  let ctx: AudioContext | null = null
  function getCtx() {
    if (!ctx) {
      const W = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
      const Ctor = W.AudioContext || W.webkitAudioContext
      if (Ctor) ctx = new Ctor()
    }
    return ctx
  }
  function beep(freq: number, durationMs: number, gainValue = 0.2) {
    const c = getCtx()
    if (!c) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.value = gainValue
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + durationMs / 1000)
  }
  return { beep }
}

const FLASH_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#A855F7']
const CORNERS = ['nw', 'ne', 'sw', 'se'] as const
type Corner = typeof CORNERS[number]

function corner(canvasW: number, canvasH: number, c: Corner): { x: number; y: number } {
  const m = 80
  if (c === 'nw') return { x: m, y: m + 80 }
  if (c === 'ne') return { x: canvasW - m, y: m + 80 }
  if (c === 'sw') return { x: m, y: canvasH - m }
  return { x: canvasW - m, y: canvasH - m }
}

interface ActiveFlash {
  kind: 'number' | 'word' | 'color'
  text?: string
  color?: string
  cornerKey: Corner
  expiresAt: number
}

export default function VideoRecorder({
  drill,
  pr,
  options,
  onBack,
}: {
  drill: Drill
  pr?: PRData
  options?: RecorderOptions
  onBack?: () => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workoutIdParam = searchParams.get('workoutId')

  // Resolve effective config (options override drill)
  const effective = {
    timerMode: (options?.timerMode || drill.timer_mode || 'timed') as RecorderTimerMode,
    durationSeconds: options?.durationSeconds ?? drill.duration_seconds,
    targetReps: options?.targetReps ?? drill.target_reps,
    intervalWorkSeconds: options?.intervalWorkSeconds ?? 30,
    intervalRestSeconds: options?.intervalRestSeconds ?? 15,
    intervalRounds: options?.intervalRounds ?? 8,
    numberFlash: options?.numberFlash,
    reactionPrompts: options?.reactionPrompts,
    colorFlash: options?.colorFlash,
    eyeLevelGuide: options?.eyeLevelGuide ?? false,
    metronomeBpm: options?.metronomeBpm,
    voiceCues: options?.voiceCues,
  }
  const mode = effective.timerMode

  const [phase, setPhase] = useState<'idle' | 'previewing' | 'recording' | 'reviewing' | 'saved'>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const reviewUrl = useMemo(() => recordedBlob ? URL.createObjectURL(recordedBlob) : '', [recordedBlob])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [reps, setReps] = useState(0)
  const [saving, setSaving] = useState(false)
  const [aiFeedback, setAiFeedback] = useState('')
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [savedRecordingId, setSavedRecordingId] = useState<number | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'failed'>('idle')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [blobKey, setBlobKey] = useState<string | null>(null)
  const [cameraAspect, setCameraAspect] = useState<number>(16 / 9)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [nativeSettingsAvailable] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean((window as Window & {
      webkit?: { messageHandlers?: { openSettings?: { postMessage: (value: string) => void } } }
    }).webkit?.messageHandlers?.openSettings)
  })
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const onStopFiredRef = useRef<boolean>(false)

  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reviewVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const animFrameRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const repsRef = useRef(0)
  const beeperRef = useRef<ReturnType<typeof makeBeeper> | null>(null)
  const audioCuesFiredRef = useRef<{ halfway: boolean; tenSec: boolean; end: boolean }>({ halfway: false, tenSec: false, end: false })

  const flashesRef = useRef<ActiveFlash[]>([])
  const lastFlashTimes = useRef<{ number: number; word: number; color: number }>({ number: 0, word: 0, color: 0 })
  const intervalTimersRef = useRef<number[]>([])

  useEffect(() => {
    if (!reviewUrl) return
    return () => URL.revokeObjectURL(reviewUrl)
  }, [reviewUrl])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
    cameraStreamRef.current = null
    intervalTimersRef.current.forEach((id) => window.clearInterval(id))
    intervalTimersRef.current = []
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  async function startPreview() {
    setPermissionError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      cameraStreamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.play()
        videoPreviewRef.current.onloadedmetadata = () => {
          const vw = videoPreviewRef.current?.videoWidth || 0
          const vh = videoPreviewRef.current?.videoHeight || 0
          if (vw > 0 && vh > 0) setCameraAspect(vw / vh)
        }
      }
      setPhase('previewing')
    } catch (error) {
      const denied = error instanceof DOMException && error.name === 'NotAllowedError'
      const message = denied
        ? 'Camera or microphone access is turned off. Allow both permissions, then return here and tap Try Again.'
        : 'The camera could not start. Check that no other app is using it, then try again.'
      setPermissionError(message)
      toast.error(denied ? 'Camera permission is off.' : 'Camera could not start.')
    }
  }

  function openAppSettings() {
    const nativeBridge = (window as Window & {
      webkit?: { messageHandlers?: { openSettings?: { postMessage: (value: string) => void } } }
    }).webkit?.messageHandlers?.openSettings
    if (nativeBridge) {
      nativeBridge.postMessage('camera')
      return
    }
    toast.info('Open this site’s browser permissions and allow Camera and Microphone.')
  }

  // Get current interval-mode phase based on elapsed seconds
  function intervalPhase(elapsed: number): { phase: 'work' | 'rest' | 'done'; round: number; remaining: number } {
    const cycleLen = effective.intervalWorkSeconds + effective.intervalRestSeconds
    const totalLen = cycleLen * effective.intervalRounds
    if (elapsed >= totalLen) return { phase: 'done', round: effective.intervalRounds, remaining: 0 }
    const intoCycle = elapsed % cycleLen
    const round = Math.floor(elapsed / cycleLen) + 1
    if (intoCycle < effective.intervalWorkSeconds) {
      return { phase: 'work', round, remaining: effective.intervalWorkSeconds - intoCycle }
    }
    return { phase: 'rest', round, remaining: cycleLen - intoCycle }
  }

  function fireAudioCue(elapsed: number) {
    const beeper = beeperRef.current
    if (!beeper) return
    if (mode === 'timed') {
      const total = effective.durationSeconds
      const halfway = Math.floor(total / 2)
      const cues = audioCuesFiredRef.current
      if (!cues.halfway && elapsed === halfway && halfway > 0) { beeper.beep(660, 150); cues.halfway = true }
      if (!cues.tenSec && elapsed === total - 10 && total > 15) {
        beeper.beep(880, 120)
        setTimeout(() => beeper.beep(880, 120), 250)
        setTimeout(() => beeper.beep(880, 120), 500)
        cues.tenSec = true
      }
      if (!cues.end && elapsed >= total) { beeper.beep(440, 600); cues.end = true }
    }
  }

  function maybeAddFlash(now: number) {
    const elapsed = (now - startTimeRef.current) / 1000
    if (elapsed < 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    const cornerOf = () => CORNERS[Math.floor(Math.random() * CORNERS.length)] as Corner

    if (effective.numberFlash) {
      if (now - lastFlashTimes.current.number >= effective.numberFlash.intervalSeconds * 1000) {
        const num = String(1 + Math.floor(Math.random() * 9))
        flashesRef.current.push({ kind: 'number', text: num, cornerKey: cornerOf(), expiresAt: now + 1200 })
        lastFlashTimes.current.number = now
      }
    }
    if (effective.reactionPrompts && effective.reactionPrompts.words.length > 0) {
      if (now - lastFlashTimes.current.word >= effective.reactionPrompts.intervalSeconds * 1000) {
        const w = effective.reactionPrompts.words[Math.floor(Math.random() * effective.reactionPrompts.words.length)]
        flashesRef.current.push({ kind: 'word', text: w, cornerKey: cornerOf(), expiresAt: now + 1500 })
        lastFlashTimes.current.word = now
      }
    }
    if (effective.colorFlash) {
      if (now - lastFlashTimes.current.color >= effective.colorFlash.intervalSeconds * 1000) {
        const c = FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)]
        flashesRef.current.push({ kind: 'color', color: c, cornerKey: cornerOf(), expiresAt: now + 900 })
        lastFlashTimes.current.color = now
      }
    }

    // Drop expired
    flashesRef.current = flashesRef.current.filter((f) => f.expiresAt > now)
  }

  async function startRecording() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const video = videoPreviewRef.current!

    // Match the canvas (and therefore the recorded video) to the camera's
    // actual orientation. Portrait stream → portrait canvas. Cap the longer
    // edge at 1280px to keep file sizes reasonable. H.264/VP9 encoders
    // require even dimensions — round to multiples of 2 or MediaRecorder
    // can fail silently and never fire onstop.
    const srcW = video.videoWidth || 1280
    const srcH = video.videoHeight || 720
    const longest = Math.max(srcW, srcH)
    const scale = longest > 1280 ? 1280 / longest : 1
    const evenize = (n: number) => Math.max(2, Math.round(n / 2) * 2)
    canvas.width = evenize(srcW * scale)
    canvas.height = evenize(srcH * scale)
    setCameraAspect(canvas.width / canvas.height)

    try { await document.fonts.load('bold 36px "Russo One"') } catch {}
    try { await document.fonts.load('bold 120px "Russo One"') } catch {}

    beeperRef.current = makeBeeper()
    audioCuesFiredRef.current = { halfway: false, tenSec: false, end: false }
    flashesRef.current = []
    lastFlashTimes.current = { number: 0, word: 0, color: 0 }

    // Make canvas visible BEFORE rAF starts — Safari pauses rAF on hidden canvases.
    setPhase('recording')
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    // Sentinel: 0 = pre-countdown phase (video draws but no timer/cues yet)
    startTimeRef.current = 0
    repsRef.current = 0
    setReps(0)
    const countdownActive = (mode === 'timed' || mode === 'interval')
    const countdownEndsAt = countdownActive ? Date.now() + 3000 : Date.now()

    // Set lastFlashTimes to now so first flash isn't immediate
    lastFlashTimes.current.number = Date.now()
    lastFlashTimes.current.word = Date.now()
    lastFlashTimes.current.color = Date.now()

    function drawFrame() {
      const now = Date.now()
      const started = startTimeRef.current !== 0
      const elapsed = started ? Math.floor((now - startTimeRef.current) / 1000) : 0
      if (started) setElapsedSeconds(elapsed)

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Pre-recording countdown overlay
      if (!started) {
        const remaining = Math.max(0, Math.ceil((countdownEndsAt - now) / 1000))
        const display = countdownActive
          ? (remaining > 0 ? String(remaining) : 'GO!')
          : 'READY'
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.beginPath()
        ctx.arc(canvas.width / 2, canvas.height / 2, 130, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 200px "Russo One", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(display, canvas.width / 2, canvas.height / 2)
        ctx.textBaseline = 'alphabetic'
        animFrameRef.current = requestAnimationFrame(drawFrame)
        return
      }

      // Eye-level guide (fixed near top center)
      if (effective.eyeLevelGuide) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(canvas.width / 2 - 30, 110)
        ctx.lineTo(canvas.width / 2 + 30, 110)
        ctx.moveTo(canvas.width / 2, 80)
        ctx.lineTo(canvas.width / 2, 140)
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = '14px "Russo One", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('EYES UP', canvas.width / 2, 165)
      }

      // Mode-specific timer overlay
      let timeStr = ''
      let timeColor = '#FFFFFF'
      let phaseLabel = ''
      let phaseColor = '#FFFFFF'

      if (mode === 'timed') {
        const remaining = effective.durationSeconds - elapsed
        timeStr = remaining >= 0 ? formatTime(remaining) : '+' + formatTime(elapsed - effective.durationSeconds)
        timeColor = remaining >= 0 ? '#FFFFFF' : '#F97316'
        fireAudioCue(elapsed)
      } else if (mode === 'stopwatch') {
        timeStr = formatTime(elapsed)
      } else if (mode === 'reps') {
        const target = effective.targetReps ?? 0
        timeStr = target > 0 ? `${repsRef.current}/${target}` : `${repsRef.current}`
      } else if (mode === 'interval') {
        const ip = intervalPhase(elapsed)
        if (ip.phase === 'done') {
          timeStr = '0:00'
          phaseLabel = 'DONE'
          phaseColor = '#10B981'
          // Auto-stop
          cancelAnimationFrame(animFrameRef.current)
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
          return
        } else {
          timeStr = formatTime(ip.remaining)
          phaseLabel = `${ip.phase.toUpperCase()} · R${ip.round}/${effective.intervalRounds}`
          phaseColor = ip.phase === 'work' ? '#10B981' : '#F59E0B'
          // Beep on phase change (entering work or rest)
          if (elapsed > 0 && ip.remaining === effective.intervalWorkSeconds && ip.phase === 'work') {
            beeperRef.current?.beep(880, 200)
          }
          if (elapsed > 0 && ip.phase === 'rest' && ip.remaining === effective.intervalRestSeconds) {
            beeperRef.current?.beep(440, 200)
          }
        }
      }

      // Phase label (for interval) above timer
      if (phaseLabel) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.beginPath()
        ctx.roundRect(canvas.width - 290, 80, 270, 36, 8)
        ctx.fill()
        ctx.fillStyle = phaseColor
        ctx.font = 'bold 18px "Russo One", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(phaseLabel, canvas.width - 155, 105)
      }

      // Timer pill
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.beginPath()
      ctx.roundRect(canvas.width - 230, 16, 210, 56, 12)
      ctx.fill()
      ctx.fillStyle = timeColor
      ctx.font = 'bold 36px "Russo One", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(timeStr, canvas.width - 125, 54)

      // Drill name (top left)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(12, 16, Math.min(ctx.measureText(drill.name).width + 24, 320), 40, 8)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '18px "Russo One", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(drill.name, 24, 42)

      // REC indicator
      ctx.fillStyle = '#EF4444'
      ctx.beginPath()
      ctx.arc(30, 690, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('REC', 44, 695)

      // Visual cues
      maybeAddFlash(now)
      for (const f of flashesRef.current) {
        const pos = corner(canvas.width, canvas.height, f.cornerKey)
        if (f.kind === 'number' && f.text) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)'
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 70, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 90px "Russo One", monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(f.text, pos.x, pos.y)
          ctx.textBaseline = 'alphabetic'
        } else if (f.kind === 'word' && f.text) {
          ctx.fillStyle = 'rgba(249,115,22,0.95)'
          const w = ctx.measureText(f.text).width
          ctx.fillRect(pos.x - 16 - w / 2, pos.y - 32, w + 32, 56)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 36px "Russo One", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(f.text, pos.x, pos.y)
          ctx.textBaseline = 'alphabetic'
        } else if (f.kind === 'color' && f.color) {
          ctx.fillStyle = f.color
          ctx.fillRect(pos.x - 50, pos.y - 50, 100, 100)
        }
      }

      animFrameRef.current = requestAnimationFrame(drawFrame)

      // Auto-stop for reps
      if (mode === 'reps' && effective.targetReps && repsRef.current >= effective.targetReps) {
        cancelAnimationFrame(animFrameRef.current)
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
      }
    }

    drawFrame()

    const canvasStream = canvas.captureStream(30)
    const audioTracks = cameraStreamRef.current!.getAudioTracks()
    audioTracks.forEach((track) => canvasStream.addTrack(track))

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 2_500_000,
    })

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      onStopFiredRef.current = true
      intervalTimersRef.current.forEach((id) => window.clearInterval(id))
      intervalTimersRef.current = []
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
      setRecordedBlob(blob)
      setPhase('reviewing')
    }
    recorder.onerror = (e) => {
      console.error('MediaRecorder error:', e)
    }

    chunksRef.current = []
    recorder.start(1000)
    mediaRecorderRef.current = recorder

    // Audio beeps during countdown (recorder is now capturing them too)
    if (countdownActive) {
      beeperRef.current!.beep(880, 120)
      setTimeout(() => beeperRef.current?.beep(880, 120), 1000)
      setTimeout(() => beeperRef.current?.beep(880, 120), 2000)
      setTimeout(() => beeperRef.current?.beep(1320, 200), 3000)
      await new Promise<void>((r) => setTimeout(r, 3000))
    }

    // Officially start the drill — drawFrame switches from countdown to live timer
    const startedAt = Date.now()
    startTimeRef.current = startedAt
    lastFlashTimes.current.number = startedAt
    lastFlashTimes.current.word = startedAt
    lastFlashTimes.current.color = startedAt

    // Start metronome interval
    if (effective.metronomeBpm && effective.metronomeBpm > 0) {
      const periodMs = Math.round(60000 / effective.metronomeBpm)
      const t = window.setInterval(() => beeperRef.current?.beep(2000, 40, 0.08), periodMs)
      intervalTimersRef.current.push(t)
    }

    // Voice cues
    if (effective.voiceCues && effective.voiceCues.words.length > 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const t = window.setInterval(() => {
        const w = effective.voiceCues!.words[Math.floor(Math.random() * effective.voiceCues!.words.length)]
        const u = new SpeechSynthesisUtterance(w)
        u.rate = 1.1
        u.volume = 1
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
      }, effective.voiceCues.intervalSeconds * 1000)
      intervalTimersRef.current.push(t)
    }
  }

  function stopRecording() {
    cancelAnimationFrame(animFrameRef.current)
    const recorder = mediaRecorderRef.current
    if (!recorder) {
      setPhase('reviewing')
      return
    }
    onStopFiredRef.current = false
    try {
      recorder.stop()
    } catch (e) {
      console.error('recorder.stop failed:', e)
    }

    // Watchdog: if recorder.onstop doesn't fire within 5s, salvage whatever
    // chunks we already have so the user isn't stuck on the recording screen.
    setTimeout(() => {
      if (onStopFiredRef.current) return
      if (chunksRef.current.length === 0) return
      const mime = recorder.mimeType || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: mime })
      setRecordedBlob(blob)
      setPhase('reviewing')
      intervalTimersRef.current.forEach((id) => window.clearInterval(id))
      intervalTimersRef.current = []
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }, 5000)
  }

  function tapRep() {
    repsRef.current = repsRef.current + 1
    setReps(repsRef.current)
    beeperRef.current?.beep(1200, 60, 0.1)
  }

  async function saveRecording() {
    if (!recordedBlob) return
    setSaving(true)
    setSaveError(null)
    const finalReps = mode === 'reps' ? repsRef.current : null

    // Use an idempotent blob_key so retries don't create duplicate rows.
    let key = blobKey
    if (!key) {
      key = `srv_${Date.now()}_${Math.random().toString(36).slice(2)}`
      setBlobKey(key)
    }

    // Step 1: create the recording row on the server (if we don't have one yet).
    let recordingId = savedRecordingId
    if (!recordingId) {
      try {
        const res = await fetch('/api/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drillId: drill.id,
            blobKey: key,
            duration: elapsedSeconds,
            rep_count: finalReps,
          }),
        })
        if (!res.ok) {
          const errText = res.status === 401
            ? 'You were signed out. Sign back in, then tap Retry. Keep this page open!'
            : `Server returned ${res.status}. Tap Retry — keep this page open.`
          setSaveError(errText)
          setSaving(false)
          return
        }
        const saveData = await res.json().catch(() => ({}))
        if (!saveData?.id) {
          setSaveError('Server response was empty. Tap Retry — keep this page open.')
          setSaving(false)
          return
        }
        recordingId = saveData.id
        setSavedRecordingId(recordingId)
      } catch (e) {
        console.error('Recording POST failed:', e)
        const msg = (e as Error)?.message || 'Network error'
        setSaveError(`Couldn't reach the server (${msg}). Tap Retry — keep this page open!`)
        setSaving(false)
        return
      }
    }

    // Step 2: upload the actual video bytes to the storage box. Use XHR so
    // we can show real upload progress instead of a frozen "Saving..." button.
    setUploadStatus('uploading')
    setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('video', recordedBlob, `recording-${recordingId}.webm`)
      fd.append('recording_id', String(recordingId))
      fd.append('blob_key', key)

      const uploadResult = await new Promise<{ ok: boolean; status: number; statusText: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr
        xhr.open('POST', '/api/recordings/upload', true)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          xhrRef.current = null
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, statusText: xhr.statusText })
        }
        xhr.onerror = () => {
          xhrRef.current = null
          reject(new Error('Network error during upload'))
        }
        xhr.onabort = () => {
          xhrRef.current = null
          reject(new Error('Upload cancelled'))
        }
        xhr.ontimeout = () => {
          xhrRef.current = null
          reject(new Error('Upload timed out'))
        }
        xhr.send(fd)
      })

      if (!uploadResult.ok) {
        const errText = `Upload returned ${uploadResult.status}. Tap Retry — keep this page open!`
        setUploadStatus('failed')
        setSaveError(errText)
        setSaving(false)
        return
      }
      setUploadStatus('uploaded')
      setUploadProgress(100)
    } catch (e) {
      console.error('Upload failed:', e)
      const msg = (e as Error)?.message || 'Network error'
      setUploadStatus('failed')
      setSaveError(`Upload failed (${msg}). Tap Retry — keep this page open!`)
      setSaving(false)
      return
    }

    // Step 3: success path.
    if (mode === 'stopwatch' && pr?.best_seconds != null && elapsedSeconds < pr.best_seconds) {
      toast.success(`New PR! Beat ${formatTime(pr.best_seconds)} by ${formatTime(pr.best_seconds - elapsedSeconds)}`)
    } else if (mode === 'reps' && pr?.best_reps != null && finalReps != null && finalReps > pr.best_reps) {
      toast.success(`New PR! ${finalReps} reps (was ${pr.best_reps})`)
    } else {
      toast.success('Recording saved!')
    }

    setPhase('saved')
    setLoadingFeedback(true)
    try {
      const fbRes = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId: drill.id, duration: elapsedSeconds }),
      })
      const fbData = await fbRes.json()
      if (fbRes.ok) setAiFeedback(fbData.feedback)
    } catch {} finally {
      setLoadingFeedback(false)
    }
    setSaving(false)
  }

  async function retrySave() {
    if (!recordedBlob) {
      setSaveError('The recording is gone (the page was reloaded). Please re-record.')
      return
    }
    setSaveError(null)
    await saveRecording()
  }

  function redo() {
    setRecordedBlob(null)
    setElapsedSeconds(0)
    setReps(0)
    repsRef.current = 0
    chunksRef.current = []
    setPhase('previewing')
  }

  const idleSummary =
    mode === 'timed' ? formatTime(effective.durationSeconds)
    : mode === 'stopwatch' ? 'Stopwatch'
    : mode === 'interval' ? `${effective.intervalRounds} × (${effective.intervalWorkSeconds}s on / ${effective.intervalRestSeconds}s off)`
    : effective.targetReps ? `${effective.targetReps} reps target` : 'Reps'

  const showPR = (mode === 'stopwatch' && (pr?.previous_seconds != null || pr?.best_seconds != null))
    || (mode === 'reps' && (pr?.previous_reps != null || pr?.best_reps != null))

  return (
    <div className="flex flex-col items-center gap-4">
      {showPR && (phase === 'idle' || phase === 'previewing') && (
        <div className="w-full max-w-3xl bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_#0A0A0A] flex items-center justify-around">
          {mode === 'stopwatch' && (
            <>
              {pr?.previous_seconds != null && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Previous</p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{formatTime(pr.previous_seconds)}</p>
                </div>
              )}
              {pr?.best_seconds != null && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                    <Trophy className="h-3 w-3 text-yellow-500" /> Best
                  </p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{formatTime(pr.best_seconds)}</p>
                </div>
              )}
            </>
          )}
          {mode === 'reps' && (
            <>
              {pr?.previous_reps != null && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Previous</p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{pr.previous_reps}</p>
                </div>
              )}
              {pr?.best_reps != null && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                    <Trophy className="h-3 w-3 text-yellow-500" /> Best
                  </p>
                  <p className="font-[family-name:var(--font-russo)] text-xl">{pr.best_reps}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div
        className="relative w-full max-w-3xl bg-black rounded-xl overflow-hidden border-2 border-black mx-auto"
        style={{ aspectRatio: cameraAspect, maxHeight: '70vh' }}
      >
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Video className="h-16 w-16 mb-4 opacity-60" />
            <p className="text-lg font-medium">Ready to record</p>
            <p className="text-sm text-gray-400">{drill.name} — {idleSummary}</p>
          </div>
        )}

        <video
          ref={videoPreviewRef}
          muted
          playsInline
          className={phase === 'previewing' || phase === 'recording' ? 'w-full h-full object-contain' : 'hidden'}
        />

        <canvas
          ref={canvasRef}
          className={
            phase === 'previewing' || phase === 'recording'
              ? 'absolute inset-0 w-full h-full object-contain'
              : 'hidden'
          }
        />

        {phase === 'reviewing' && reviewUrl && (
          <video
            ref={reviewVideoRef}
            src={reviewUrl}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        )}

        {phase === 'recording' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-mono">
            {mode === 'reps'
              ? `${reps}${effective.targetReps ? ' / ' + effective.targetReps : ''} reps`
              : formatTime(elapsedSeconds)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 w-full max-w-3xl flex-wrap justify-center">
        {phase === 'idle' && (
          <>
            <Button onClick={startPreview} size="lg" className="gap-2">
              <Video className="h-5 w-5" />
              Start Camera
            </Button>
            {onBack && (
              <Button onClick={onBack} variant="outline" size="lg">
                Change settings
              </Button>
            )}
          </>
        )}

        {phase === 'previewing' && (
          <Button onClick={startRecording} size="lg" className="gap-2 bg-red-600 hover:bg-red-700">
            <Circle className="h-5 w-5 fill-current" />
            {(mode === 'timed' || mode === 'interval') ? 'Start (3-2-1)' : 'Start Recording'}
          </Button>
        )}

        {phase === 'recording' && mode === 'reps' && (
          <Button
            onClick={tapRep}
            size="lg"
            className="gap-2 h-16 px-8 text-xl bg-hoop-orange hover:opacity-90 border-2 border-black shadow-[3px_3px_0px_0px_#0A0A0A]"
          >
            <Plus className="h-6 w-6" />
            +1 Rep ({reps})
          </Button>
        )}

        {phase === 'recording' && (
          <Button onClick={stopRecording} size="lg" variant="destructive" className="gap-2">
            <Square className="h-5 w-5 fill-current" />
            Stop
          </Button>
        )}

        {phase === 'reviewing' && (
          <>
            {saving && (
              <div className="w-full max-w-3xl bg-blue-50 border-2 border-blue-700 rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                  <p className="text-sm font-bold text-blue-700">
                    {uploadStatus === 'uploading'
                      ? `Uploading to library... ${uploadProgress}%`
                      : uploadStatus === 'uploaded'
                      ? 'Finalizing...'
                      : 'Creating recording...'}
                  </p>
                </div>
                {uploadStatus === 'uploading' && (
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                <p className="text-[11px] text-blue-700 mt-2">
                  Keep this page open until upload finishes. Larger recordings can take a minute.
                </p>
              </div>
            )}
            {saveError && (
              <div className="w-full max-w-3xl bg-red-50 border-2 border-red-700 rounded-xl p-3 mb-2">
                <p className="text-sm font-bold text-red-700">Save didn&apos;t finish</p>
                <p className="text-xs text-red-700 mt-1">{saveError}</p>
                <p className="text-xs text-red-700 mt-1 font-bold">
                  ⚠️ Don&apos;t close this page or hit Redo — your recording isn&apos;t saved yet.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button onClick={retrySave} size="sm" variant="default" disabled={saving}>
                    {saving ? 'Retrying...' : 'Retry save'}
                  </Button>
                </div>
              </div>
            )}
            <Button onClick={redo} variant="outline" size="lg" className="gap-2" disabled={saving}>
              <RotateCcw className="h-5 w-5" />
              Redo
            </Button>
            <Button onClick={saveRecording} size="lg" className="gap-2 bg-green-600 hover:bg-green-700" disabled={saving}>
              <Check className="h-5 w-5" />
              {saving
                ? uploadStatus === 'uploading'
                  ? `Uploading ${uploadProgress}%`
                  : 'Saving...'
                : 'Save'}
            </Button>
          </>
        )}

        {phase === 'saved' && (
          <div className="w-full max-w-3xl">
            <div className="bg-white border-2 border-black rounded-xl mb-4 shadow-[3px_3px_0px_0px_#0A0A0A] overflow-hidden">
              <div className="p-4 text-center">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-[family-name:var(--font-russo)] text-lg">Recording Saved!</p>
                <p className="text-sm text-muted-foreground">
                  {mode === 'reps' ? `${reps} reps` : formatTime(elapsedSeconds)}
                </p>
                {uploadStatus === 'uploading' && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading to library...
                  </p>
                )}
                {uploadStatus === 'uploaded' && (
                  <p className="text-xs text-green-700 mt-2">Saved to your library</p>
                )}
                {uploadStatus === 'failed' && (
                  <p className="text-xs text-red-700 mt-2">Upload failed — kept locally only</p>
                )}
              </div>

              {loadingFeedback && (
                <div className="flex items-center justify-center gap-2 text-purple-600 py-4 border-t-2 border-gray-100">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">AI Coach is analyzing your session...</span>
                </div>
              )}

              {aiFeedback && (
                <div className="p-4 border-t-2 border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-sm">AI Coach Feedback</span>
                  </div>
                  <p className="text-sm">{aiFeedback}</p>
                </div>
              )}

              <RecordingsList
                drillId={drill.id}
                drillName={drill.name}
                defaultOpen
                embedded
                highlightId={savedRecordingId}
              />

              {savedRecordingId && (
                <EntityChat
                  contextType="recording"
                  contextId={savedRecordingId}
                  contextTitle={drill.name}
                  defaultOpen
                  embedded
                />
              )}
            </div>

            <Button
              onClick={() => router.push(workoutIdParam ? `/dashboard/workouts/${workoutIdParam}` : '/dashboard/workouts')}
              className="w-full"
            >
              {workoutIdParam ? 'Back to Workout' : 'Back to Workouts'}
            </Button>
          </div>
        )}
      </div>

      {permissionError && (
        <div role="alert" className="w-full max-w-3xl rounded-lg border-2 border-amber-500 bg-amber-50 p-4 text-amber-950">
          <p className="font-semibold">Camera permission needed</p>
          <p className="mt-1 text-sm">{permissionError}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nativeSettingsAvailable && (
              <Button type="button" onClick={openAppSettings}>Open App Settings</Button>
            )}
            <Button type="button" variant="outline" onClick={startPreview}>Try Again</Button>
          </div>
          {!nativeSettingsAvailable && (
            <p className="mt-2 text-xs">In your browser, open this site&apos;s permissions and allow Camera and Microphone.</p>
          )}
        </div>
      )}
    </div>
  )
}
