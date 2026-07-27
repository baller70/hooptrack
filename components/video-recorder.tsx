'use client'
/* eslint-disable react-hooks/purity -- Date.now() and Math.random() are used inside requestAnimationFrame
 * callbacks and event handlers, never in the React render path. They are intentionally impure to
 * generate time-varying visuals (countdown, flashes, voice cue selection). */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Bookmark,
  Camera,
  CameraOff,
  Check,
  Circle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Trophy,
  Video,
  Volleyball,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import EntityChat from '@/components/entity-chat'
import RecordingsList from '@/components/recordings-list'
import { Card, GhostButton, PrimaryButton, SectionTitle } from '@/components/ht/primitives'

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
  /** Name of whoever built the workout this drill belongs to. */
  coach_name?: string | null
}

interface PRData {
  previous_seconds: number | null
  best_seconds: number | null
  previous_reps: number | null
  best_reps: number | null
}

/** Why the camera can't be opened, when it can't. */
type CameraBlock = { kind: 'denied' | 'missing' | 'insecure'; message: string }

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

/** Frame rate handed to canvas.captureStream(); also what the HUD reports. */
const CAPTURE_FPS = 30

/** Longest recorded edge. 1920 keeps a 1080p phone camera at its own size. */
const MAX_CAPTURE_EDGE = 1920

/** ~0.11 bits per pixel per frame — roughly 6 Mbps at 1080p60, 2 at 720p30. */
function bitrateFor(width: number, height: number, fps: number) {
  return Math.round(Math.min(8_000_000, Math.max(1_500_000, width * height * fps * 0.11)))
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
  onOpenOptions,
}: {
  drill: Drill
  pr?: PRData
  options?: RecorderOptions
  onBack?: () => void
  /** Opens the session-options sheet from the drill card while idle. */
  onOpenOptions?: () => void
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
  const [nativeSettingsAvailable] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean((window as Window & {
      webkit?: { messageHandlers?: { openSettings?: { postMessage: (value: string) => void } } }
    }).webkit?.messageHandlers?.openSettings)
  })
  // Square until a stream reports its real shape — matches the design's
  // viewfinder and avoids a letterboxed strip before the camera opens.
  const [cameraAspect, setCameraAspect] = useState<number>(1)
  const [paused, setPaused] = useState(false)
  const [cameraBlock, setCameraBlock] = useState<CameraBlock | null>(null)
  const [captureSpec, setCaptureSpec] = useState<string | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const onStopFiredRef = useRef<boolean>(false)
  const pausedRef = useRef(false)
  const pauseStartedAtRef = useRef(0)
  const captureFpsRef = useRef(CAPTURE_FPS)

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

  // Detect an unusable camera up front so the screen can say so instead of
  // offering a Start button that can only fail (headless browsers, desktops
  // without a webcam, pages served over plain http).
  useEffect(() => {
    let cancelled = false
    async function probe() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (cancelled) return
        const insecure = typeof window !== 'undefined' && !window.isSecureContext
        setCameraBlock({
          kind: insecure ? 'insecure' : 'missing',
          message: insecure
            ? 'Recording needs a secure (https) connection.'
            : 'This browser cannot open a camera.',
        })
        return
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        if (!devices.some((device) => device.kind === 'videoinput')) {
          setCameraBlock({ kind: 'missing', message: 'No camera was found on this device.' })
        }
      } catch {
        // enumerateDevices can throw in locked-down webviews; Start will
        // surface the real reason when it is tapped.
      }
    }
    probe()
    return () => {
      cancelled = true
    }
  }, [])

  async function startPreview() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraBlock({ kind: 'missing', message: 'This browser cannot open a camera.' })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 1080p60 is what the design's badge advertises, so ask for it. These
        // are ideals, not demands — a 720p webcam still opens, it just reports
        // itself honestly in the badge.
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        },
        audio: true,
      })
      cameraStreamRef.current = stream
      setCameraBlock(null)
      const settings = stream.getVideoTracks()[0]?.getSettings()
      if (settings?.height) {
        setCaptureSpec(`${settings.height}p ${Math.round(settings.frameRate ?? CAPTURE_FPS)} FPS`)
      }
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
      const name = (error as DOMException)?.name
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
        setCameraBlock({ kind: 'missing', message: 'No camera was found on this device.' })
        toast.error('No camera was found on this device.')
      } else {
        setCameraBlock({
          kind: 'denied',
          message: 'Camera access is required to record videos. You can enable it in Settings.',
        })
        toast.error('Camera access denied. Please allow camera permissions.')
      }
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
    // edge at 1920px so a 1080p phone camera records at its own resolution
    // rather than being thrown away. H.264/VP9 encoders require even
    // dimensions — round to multiples of 2 or MediaRecorder can fail silently
    // and never fire onstop.
    const srcW = video.videoWidth || 1280
    const srcH = video.videoHeight || 720
    const longest = Math.max(srcW, srcH)
    const scale = longest > MAX_CAPTURE_EDGE ? MAX_CAPTURE_EDGE / longest : 1
    const evenize = (n: number) => Math.max(2, Math.round(n / 2) * 2)
    canvas.width = evenize(srcW * scale)
    canvas.height = evenize(srcH * scale)
    setCameraAspect(canvas.width / canvas.height)

    // Draw and encode at the rate the camera is actually delivering, so the
    // badge states a measured fact rather than an aspiration.
    const trackFps = cameraStreamRef.current?.getVideoTracks()[0]?.getSettings()?.frameRate
    captureFpsRef.current = Math.min(60, Math.max(24, Math.round(trackFps ?? CAPTURE_FPS)))
    // What actually gets encoded: the canvas, captured at that rate below.
    setCaptureSpec(`${canvas.height}p ${captureFpsRef.current} FPS`)

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
      // While paused the clock freezes at the moment Pause was tapped, so the
      // timer, cue schedule and interval round all resume where they stopped.
      const now = pausedRef.current ? pauseStartedAtRef.current : Date.now()
      const started = startTimeRef.current !== 0
      const elapsed = started ? Math.floor((now - startTimeRef.current) / 1000) : 0
      if (started) setElapsedSeconds(elapsed)

      // Leave the last drawn frame up so the preview holds still, matching the
      // recorder, which is capturing nothing right now.
      if (pausedRef.current) {
        animFrameRef.current = requestAnimationFrame(drawFrame)
        return
      }

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

      // Timer, drill name and REC state are drawn by the screen HUD, not burned
      // into the frame — see the viewfinder overlay in the render below. Only
      // the eye-training cues below stay in the canvas, because those have to
      // survive into the saved video for the coach to review.
      if (mode === 'timed') {
        fireAudioCue(elapsed)
      } else if (mode === 'interval') {
        const ip = intervalPhase(elapsed)
        if (ip.phase === 'done') {
          cancelAnimationFrame(animFrameRef.current)
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
          return
        }
        // Beep on phase change (entering work or rest)
        if (elapsed > 0 && ip.remaining === effective.intervalWorkSeconds && ip.phase === 'work') {
          beeperRef.current?.beep(880, 200)
        }
        if (elapsed > 0 && ip.phase === 'rest' && ip.remaining === effective.intervalRestSeconds) {
          beeperRef.current?.beep(440, 200)
        }
      }

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

    const canvasStream = canvas.captureStream(captureFpsRef.current)
    const audioTracks = cameraStreamRef.current!.getAudioTracks()
    audioTracks.forEach((track) => canvasStream.addTrack(track))

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: bitrateFor(canvas.width, canvas.height, captureFpsRef.current),
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
      const t = window.setInterval(() => {
        if (pausedRef.current) return
        beeperRef.current?.beep(2000, 40, 0.08)
      }, periodMs)
      intervalTimersRef.current.push(t)
    }

    // Voice cues
    if (effective.voiceCues && effective.voiceCues.words.length > 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const t = window.setInterval(() => {
        if (pausedRef.current) return
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

  /** Real MediaRecorder pause/resume — no frames are captured while paused. */
  function togglePause() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (!pausedRef.current) {
      if (recorder.state !== 'recording') return
      pauseStartedAtRef.current = Date.now()
      pausedRef.current = true
      setPaused(true)
      try {
        recorder.pause()
      } catch (e) {
        console.error('recorder.pause failed:', e)
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
      return
    }
    if (recorder.state !== 'paused') return
    // Shift the start marker forward by the paused span so elapsed time, cue
    // timers and interval rounds continue rather than jumping.
    const pausedFor = Date.now() - pauseStartedAtRef.current
    startTimeRef.current += pausedFor
    lastFlashTimes.current.number += pausedFor
    lastFlashTimes.current.word += pausedFor
    lastFlashTimes.current.color += pausedFor
    pausedRef.current = false
    setPaused(false)
    try {
      recorder.resume()
    } catch (e) {
      console.error('recorder.resume failed:', e)
    }
  }

  function stopRecording() {
    cancelAnimationFrame(animFrameRef.current)
    pausedRef.current = false
    setPaused(false)
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
    const finalReps = mode === 'reps' || repsRef.current > 0 ? repsRef.current : null

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
    pausedRef.current = false
    setPaused(false)
    setPhase('previewing')
  }

  const idleSummary =
    mode === 'timed' ? formatTime(effective.durationSeconds)
    : mode === 'stopwatch' ? 'Stopwatch'
    : mode === 'interval' ? `${effective.intervalRounds} × (${effective.intervalWorkSeconds}s on / ${effective.intervalRestSeconds}s off)`
    : effective.targetReps ? `${effective.targetReps} reps target` : 'Reps'

  const showPR = (mode === 'stopwatch' && (pr?.previous_seconds != null || pr?.best_seconds != null))
    || (mode === 'reps' && (pr?.previous_reps != null || pr?.best_reps != null))

  const live = phase === 'recording'
  const showRig = phase === 'idle' || phase === 'previewing' || phase === 'recording'
  const round = mode === 'interval' ? intervalPhase(elapsedSeconds) : null

  // The pill under the viewfinder counts down in the modes that have an end and
  // counts up in the ones that don't.
  const clockSeconds =
    mode === 'timed' ? Math.max(0, effective.durationSeconds - elapsedSeconds)
    : mode === 'interval' ? (round?.remaining ?? 0)
    : elapsedSeconds

  // Right-hand counter: whatever "how far through this session am I" means for
  // the mode that is actually running.
  const goal: { label: string; value: string; suffix?: string } =
    mode === 'interval'
      ? { label: 'Set', value: String(round?.round ?? 1), suffix: `of ${effective.intervalRounds}` }
      : mode === 'reps' && effective.targetReps
        ? { label: 'Target', value: String(effective.targetReps), suffix: 'reps' }
        : mode === 'timed' && effective.durationSeconds > 0
          ? { label: 'Length', value: formatTime(effective.durationSeconds) }
          : { label: 'Length', value: 'Open' }

  const targetCell =
    effective.targetReps != null
      ? { value: String(effective.targetReps), unit: 'Reps' }
      : effective.durationSeconds > 0
        ? { value: formatTime(effective.durationSeconds), unit: 'Min' }
        : null

  return (
    <div className="mx-auto w-full max-w-[560px] pb-4 lg:max-w-3xl">
      {showPR && (phase === 'idle' || phase === 'previewing') ? (
        <Card className="mb-4 flex items-center justify-around py-4">
          {mode === 'stopwatch' ? (
            <>
              {pr?.previous_seconds != null ? (
                <PrCell label="Previous" value={formatTime(pr.previous_seconds)} />
              ) : null}
              {pr?.best_seconds != null ? (
                <PrCell label="Best" value={formatTime(pr.best_seconds)} best />
              ) : null}
            </>
          ) : (
            <>
              {pr?.previous_reps != null ? <PrCell label="Previous" value={String(pr.previous_reps)} /> : null}
              {pr?.best_reps != null ? <PrCell label="Best" value={String(pr.best_reps)} best /> : null}
            </>
          )}
        </Card>
      ) : null}

      {/* Viewfinder */}
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-ht-ink"
        style={{ aspectRatio: cameraAspect, maxHeight: '56vh' }}
      >
        <video
          ref={videoPreviewRef}
          muted
          playsInline
          className={phase === 'previewing' || phase === 'recording' ? 'size-full object-contain' : 'hidden'}
        />

        <canvas
          ref={canvasRef}
          className={
            phase === 'previewing' || phase === 'recording'
              ? 'absolute inset-0 size-full object-contain'
              : 'hidden'
          }
        />

        {phase === 'reviewing' && reviewUrl ? (
          <video ref={reviewVideoRef} src={reviewUrl} controls playsInline className="size-full object-contain" />
        ) : null}

        {phase === 'idle' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
            {cameraBlock ? (
              <>
                <CameraOff className="size-12 text-white/70" strokeWidth={1.4} />
                <p className="ht-heading mt-1 text-[16px] text-white">
                  {cameraBlock.kind === 'denied' ? 'Camera access needed' : 'Camera unavailable'}
                </p>
                <p className="max-w-[280px] text-[13px] leading-5 text-white/70">{cameraBlock.message}</p>
              </>
            ) : (
              <>
                <Video className="size-12 text-white/70" strokeWidth={1.4} />
                <p className="ht-heading mt-1 text-[16px] text-white">Ready to record</p>
                <p className="text-[13px] text-white/70">
                  {drill.name} — {idleSummary}
                </p>
              </>
            )}
          </div>
        ) : null}

        {phase === 'saved' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Check className="size-12 text-white/80" strokeWidth={1.6} />
            <p className="ht-heading text-[16px] text-white">Clip saved</p>
          </div>
        ) : null}

        {live ? (
          <>
            <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-black/75 px-3 py-1.5">
              {paused ? (
                <Pause className="size-3.5 fill-white text-white" strokeWidth={0} />
              ) : (
                <span className="size-2.5 rounded-full bg-ht-red" />
              )}
              <span className="ht-heading text-[13px] text-white">
                {paused ? 'Paused' : round ? `Rec · ${round.phase}` : 'Rec'}
              </span>
            </span>

            {captureSpec ? (
              <span className="absolute right-3 top-3 rounded-lg bg-black/75 px-3 py-1.5 text-[13px] font-medium text-white">
                {captureSpec}
              </span>
            ) : null}

            <span className="ht-heading absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-black/75 px-6 py-2 text-[26px] tabular-nums text-white">
              {formatClock(clockSeconds)}
            </span>
          </>
        ) : null}
      </div>

      {showRig ? (
        <>
          {/* REPS / SET counters */}
          <div className="mt-6 grid grid-cols-2">
            <div className="px-3 text-center">
              <div className="ht-heading text-[13px] tracking-[0.06em] text-ht-ink">Reps</div>
              <div className="ht-num mt-2 text-[44px] leading-none text-ht-orange">{reps}</div>
            </div>
            <div className="border-l border-ht-line-soft px-3 text-center">
              <div className="ht-heading text-[13px] tracking-[0.06em] text-ht-ink">{goal.label}</div>
              <div className="ht-num mt-2 text-[44px] leading-none text-ht-ink">
                {goal.value}
                {goal.suffix ? (
                  <span className="ml-2 font-sans text-[20px] font-normal not-italic text-ht-muted">
                    {goal.suffix}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <ControlButton
              icon={paused ? Play : Pause}
              solidIcon
              label={paused ? 'Resume' : 'Pause'}
              onClick={togglePause}
              disabled={!live}
            />
            {phase === 'recording' ? (
              <ControlButton primary solidIcon icon={Square} label="Stop" onClick={stopRecording} />
            ) : phase === 'previewing' ? (
              <ControlButton
                primary
                solidIcon
                icon={Circle}
                label={mode === 'timed' || mode === 'interval' ? 'Start 3-2-1' : 'Record'}
                onClick={startRecording}
              />
            ) : (
              <ControlButton
                primary
                icon={Camera}
                label={cameraBlock ? 'Try Again' : 'Start'}
                onClick={startPreview}
              />
            )}
            <ControlButton
              icon={Bookmark}
              label="Save Rep"
              onClick={tapRep}
              disabled={!live || paused}
            />
          </div>

          {/* What is being recorded */}
          <Card padded={false} className="mt-5">
            <DrillSummary
              name={drill.name}
              coach={drill.coach_name ?? null}
              target={targetCell}
              onOpenOptions={phase === 'idle' ? onOpenOptions : undefined}
            />
          </Card>

          {phase === 'idle' && onBack ? (
            <div className="mt-4">
              <GhostButton onClick={onBack}>Change settings</GhostButton>
            </div>
          ) : null}
        </>
      ) : null}

      {phase === 'reviewing' ? (
        <div className="mt-5 space-y-4">
          {saving ? (
            <Card className="border-ht-orange/40 bg-ht-orange-soft">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-ht-orange" />
                <p className="ht-heading text-[14px] text-ht-ink">
                  {uploadStatus === 'uploading'
                    ? `Uploading ${uploadProgress}%`
                    : uploadStatus === 'uploaded'
                      ? 'Finalizing'
                      : 'Creating recording'}
                </p>
              </div>
              {uploadStatus === 'uploading' ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full bg-ht-orange transition-[width]" style={{ width: `${uploadProgress}%` }} />
                </div>
              ) : null}
              <p className="mt-2 text-[12.5px] text-ht-muted">
                Keep this page open until the upload finishes. Larger clips can take a minute.
              </p>
            </Card>
          ) : null}

          {saveError ? (
            <Card className="border-ht-red bg-ht-red-tint">
              <p className="text-[17px] font-semibold text-ht-ink">Upload failed.</p>
              <p className="mt-1.5 text-[14px] leading-6 text-ht-ink/80">{saveError}</p>
              <p className="mt-1.5 text-[13px] text-ht-muted">
                Don&apos;t close this page or hit Redo — this clip isn&apos;t saved yet.
              </p>
              <div className="mt-4">
                <PrimaryButton onClick={retrySave} disabled={saving}>
                  {saving ? 'Retrying…' : 'Retry Upload'}
                </PrimaryButton>
              </div>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <GhostButton onClick={redo} disabled={saving}>
              <RotateCcw className="size-4" strokeWidth={2.2} />
              Redo
            </GhostButton>
            <PrimaryButton onClick={saveRecording} disabled={saving}>
              {saving ? (
                uploadStatus === 'uploading' ? `Uploading ${uploadProgress}%` : 'Saving…'
              ) : (
                <>
                  <Check className="size-4" strokeWidth={2.4} />
                  Save
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {phase === 'saved' ? (
        <div className="mt-5 space-y-4">
          <Card padded={false}>
            <div className="px-5 py-6 text-center">
              <Check className="mx-auto size-8 text-ht-green" strokeWidth={2.4} />
              <p className="ht-heading mt-2 text-[24px] leading-none text-ht-ink">Recording Saved</p>
              <p className="mt-1.5 text-[14px] text-ht-muted">
                {mode === 'reps' ? `${reps} reps` : formatTime(elapsedSeconds)}
              </p>
              {uploadStatus === 'uploading' ? (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-ht-muted">
                  <Loader2 className="size-3.5 animate-spin" /> Uploading to your library…
                </p>
              ) : uploadStatus === 'uploaded' ? (
                <p className="mt-2 text-[13px] text-ht-green">Saved to your library</p>
              ) : uploadStatus === 'failed' ? (
                <p className="mt-2 text-[13px] text-ht-red">Upload failed — kept on this device only</p>
              ) : null}
            </div>

            {loadingFeedback ? (
              <div className="flex items-center justify-center gap-2 border-t border-ht-line-soft py-4 text-ht-muted">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-[14px]">AI Coach is reviewing your session…</span>
              </div>
            ) : null}

            {aiFeedback ? (
              <div className="border-t border-ht-line-soft px-5 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="size-4 text-ht-orange" strokeWidth={2} />
                  <SectionTitle>AI Coach Feedback</SectionTitle>
                </div>
                <p className="text-[14px] leading-6 text-ht-ink">{aiFeedback}</p>
              </div>
            ) : null}

            <RecordingsList
              drillId={drill.id}
              drillName={drill.name}
              defaultOpen
              embedded
              highlightId={savedRecordingId}
            />

            {savedRecordingId ? (
              <EntityChat
                contextType="recording"
                contextId={savedRecordingId}
                contextTitle={drill.name}
                defaultOpen
                embedded
              />
            ) : null}
          </Card>

          <PrimaryButton
            onClick={() => router.push(workoutIdParam ? `/dashboard/workouts/${workoutIdParam}` : '/dashboard/workouts')}
          >
            {workoutIdParam ? 'Back to Workout' : 'Back to Workouts'}
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  )
}

/** HH:MM:SS, as the live-recording design shows it. */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return [hours, mins, secs].map((part) => String(part).padStart(2, '0')).join(':')
}

function PrCell({ label, value, best = false }: { label: string; value: string; best?: boolean }) {
  return (
    <div className="text-center">
      <p className="flex items-center justify-center gap-1 text-[12.5px] text-ht-muted">
        {best ? <Trophy className="size-3.5 text-ht-orange" strokeWidth={2} /> : null}
        {label}
      </p>
      <p className="ht-num mt-1 text-[24px] leading-none text-ht-ink">{value}</p>
    </div>
  )
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  primary = false,
  solidIcon = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  solidIcon?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-2.5 rounded-xl py-4 transition-colors',
        primary
          ? 'bg-ht-orange text-white hover:bg-ht-orange-hover'
          : 'border border-ht-line bg-ht-surface text-ht-ink hover:bg-ht-chip/60',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      <Icon className={cn('size-7', solidIcon && 'fill-current')} strokeWidth={solidIcon ? 0 : 1.8} />
      <span className="ht-heading text-[14px] tracking-[0.04em]">{label}</span>
    </button>
  )
}

function DrillSummary({
  name,
  coach,
  target,
  onOpenOptions,
}: {
  name: string
  coach: string | null
  target: { value: string; unit: string } | null
  onOpenOptions?: () => void
}) {
  const body = (
    <>
      <span className="grid size-[52px] shrink-0 place-items-center rounded-full border-2 border-ht-orange">
        <Volleyball className="size-7 text-ht-orange" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ht-heading block truncate text-[22px] leading-none text-ht-ink">{name}</span>
        {coach ? <span className="mt-1.5 block truncate text-[15px] text-ht-muted">{coach}</span> : null}
        {onOpenOptions ? (
          <span className="mt-1.5 block text-[13px] text-ht-orange">Tap to change session options</span>
        ) : null}
      </span>
      {target ? (
        <span className="shrink-0 border-l border-ht-line-soft pl-4 text-center">
          <span className="ht-heading block text-[12px] tracking-[0.06em] text-ht-muted">Target</span>
          <span className="ht-num mt-1 block text-[30px] leading-none text-ht-ink">{target.value}</span>
          <span className="ht-heading block text-[11px] tracking-[0.06em] text-ht-muted">{target.unit}</span>
        </span>
      ) : null}
    </>
  )

  if (onOpenOptions) {
    return (
      <button
        type="button"
        onClick={onOpenOptions}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ht-orange-tint/60"
      >
        {body}
      </button>
    )
  }
  return <div className="flex items-center gap-4 px-4 py-4">{body}</div>
}
