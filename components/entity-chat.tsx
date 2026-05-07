'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  MessageSquare, Send, Loader2, ChevronDown, ChevronUp,
  Mic, Image as ImageIcon, Film, Paperclip, X, Pause, Play, Trash2, Download, FileIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type ContextType = 'workout' | 'drill' | 'move' | 'quiz' | 'recording' | 'general'
type AttachmentType = 'voice' | 'image' | 'video' | 'file'

interface Message {
  id: number
  sender_id: number
  body: string
  created_at: string
  read_at: string | null
  sender_name: string
  attachment_type: AttachmentType | null
  attachment_path: string | null
  attachment_mime: string | null
  attachment_size_bytes: number | null
  attachment_duration_seconds: number | null
  attachment_filename: string | null
}

interface Props {
  contextType: ContextType
  contextId: number
  contextTitle?: string
  defaultOpen?: boolean
  compact?: boolean
  embedded?: boolean
}

interface PendingAttachment {
  type: AttachmentType
  blob: Blob
  filename: string
  durationSeconds?: number
  previewUrl: string
}

function timeShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function EntityChat({ contextType, contextId, contextTitle, defaultOpen = false, compact = false, embedded = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [meId, setMeId] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [unread, setUnread] = useState(0)
  const [pending, setPending] = useState<PendingAttachment | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileImageRef = useRef<HTMLInputElement>(null)
  const fileVideoRef = useRef<HTMLInputElement>(null)
  const fileAnyRef = useRef<HTMLInputElement>(null)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const recStartRef = useRef<number>(0)
  const recTimerRef = useRef<number | null>(null)
  const recChunksRef = useRef<Blob[]>([])
  const recStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).then(d => { if (d?.user) setMeId(d.user.id) })
  }, [])

  const load = useCallback(async () => {
    const r = await fetch(`/api/messages/thread?context_type=${contextType}&context_id=${contextId}`, { cache: 'no-store' })
    if (!r.ok) return
    const d = await r.json()
    const msgs: Message[] = d.messages || []
    setMessages(msgs)
    setCount(msgs.length)
    if (meId != null) {
      setUnread(msgs.filter((m) => m.sender_id !== meId && !m.read_at).length)
    }
  }, [contextType, contextId, meId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!open) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [open, load])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function send() {
    if ((!input.trim() && !pending) || sending) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('context_type', contextType)
      fd.append('context_id', String(contextId))
      if (contextTitle) fd.append('context_title', contextTitle)
      fd.append('body', input.trim())
      if (pending) {
        fd.append('attachment_type', pending.type)
        fd.append('attachment', pending.blob, pending.filename)
        if (pending.durationSeconds != null) fd.append('attachment_duration_seconds', String(pending.durationSeconds))
      }
      const res = await fetch('/api/messages/thread', { method: 'POST', body: fd })
      if (res.ok) {
        setInput('')
        if (pending) {
          URL.revokeObjectURL(pending.previewUrl)
          setPending(null)
        }
        load()
      }
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function attachFile(f: File, type: AttachmentType) {
    const url = URL.createObjectURL(f)
    if (pending) URL.revokeObjectURL(pending.previewUrl)
    setPending({
      type,
      blob: f,
      filename: f.name || `${type}-${Date.now()}`,
      previewUrl: url,
    })
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recStreamRef.current = stream
      const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg']
      const mime = mimeOptions.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      recChunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: mime || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const dur = Math.round((Date.now() - recStartRef.current) / 1000)
        if (pending) URL.revokeObjectURL(pending.previewUrl)
        setPending({
          type: 'voice',
          blob,
          filename: `voice-${Date.now()}.webm`,
          durationSeconds: dur,
          previewUrl: url,
        })
        recStreamRef.current?.getTracks().forEach((t) => t.stop())
        recStreamRef.current = null
      }
      mediaRecRef.current = rec
      recStartRef.current = Date.now()
      rec.start()
      setRecording(true)
      setRecordSeconds(0)
      if (recTimerRef.current) window.clearInterval(recTimerRef.current)
      recTimerRef.current = window.setInterval(() => {
        setRecordSeconds(Math.floor((Date.now() - recStartRef.current) / 1000))
      }, 250)
    } catch (e) {
      console.error('Mic access failed:', e)
      alert('Microphone permission required to record voice messages.')
    }
  }

  function stopVoiceRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop()
    }
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current)
      recTimerRef.current = null
    }
    setRecording(false)
  }

  function cancelVoiceRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.onstop = null
      mediaRecRef.current.stop()
    }
    recStreamRef.current?.getTracks().forEach((t) => t.stop())
    recStreamRef.current = null
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current)
      recTimerRef.current = null
    }
    setRecording(false)
    setRecordSeconds(0)
  }

  function clearPending() {
    if (pending) URL.revokeObjectURL(pending.previewUrl)
    setPending(null)
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
          <MessageSquare className="h-4 w-4" />
          <span className="font-semibold text-sm">
            Chat
            {count > 0 && <span className="text-muted-foreground ml-1">({count})</span>}
          </span>
          {unread > 0 && (
            <span className="bg-hoop-orange text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          <div
            ref={scrollRef}
            className={`overflow-y-auto bg-gray-50 px-3 py-2 space-y-2 border-t-2 border-gray-100 ${compact ? 'max-h-72' : 'max-h-96'}`}
          >
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Start the conversation.</p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === meId
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? 'bg-black text-white' : 'bg-white border border-gray-200'}`}>
                      {!mine && <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground">{m.sender_name}</p>}
                      {m.attachment_type && m.attachment_path && (
                        <AttachmentRenderer message={m} mine={mine} />
                      )}
                      {m.body && <p className="text-sm whitespace-pre-wrap break-words mt-1 first:mt-0">{m.body}</p>}
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>{timeShort(m.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pending attachment preview */}
          {pending && (
            <div className="border-t-2 border-gray-100 bg-orange-50 px-3 py-2 flex items-center gap-2">
              <PendingPreview pending={pending} />
              <button onClick={clearPending} className="ml-auto p-1 hover:bg-white rounded shrink-0" aria-label="Cancel attachment">
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
          )}

          {/* Recording in progress */}
          {recording && (
            <div className="border-t-2 border-gray-100 bg-red-50 px-3 py-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-sm font-semibold text-red-700">Recording... {formatDuration(recordSeconds)}</span>
              <Button size="sm" variant="outline" onClick={cancelVoiceRecording} className="ml-auto gap-1 h-7 px-2 text-xs">
                <Trash2 className="h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={stopVoiceRecording} className="gap-1 h-7 px-2 text-xs">
                <Pause className="h-3 w-3" /> Stop
              </Button>
            </div>
          )}

          {/* Composer */}
          <div className="border-t-2 border-gray-100 p-2 space-y-2">
            <div className="flex gap-1 items-center">
              <button
                onClick={() => recording ? stopVoiceRecording() : startVoiceRecording()}
                className={`p-2 rounded hover:bg-gray-100 ${recording ? 'bg-red-100 text-red-600' : ''}`}
                title="Record voice message"
                aria-label="Record voice message"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileImageRef.current?.click()}
                className="p-2 rounded hover:bg-gray-100"
                title="Send image"
                aria-label="Send image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileVideoRef.current?.click()}
                className="p-2 rounded hover:bg-gray-100"
                title="Send video"
                aria-label="Send video"
              >
                <Film className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileAnyRef.current?.click()}
                className="p-2 rounded hover:bg-gray-100"
                title="Send file"
                aria-label="Send file"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f, 'image'); e.target.value = '' }}
              />
              <input
                ref={fileVideoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f, 'video'); e.target.value = '' }}
              />
              <input
                ref={fileAnyRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f, 'file'); e.target.value = '' }}
              />
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={pending ? 'Add a caption (optional)...' : 'Type a message...'}
                rows={1}
                className="flex-1 rounded-md border-2 border-input bg-background px-2 py-1.5 text-sm resize-none min-h-[36px] max-h-32"
              />
              <Button size="sm" onClick={send} disabled={(!input.trim() && !pending) || sending} className="gap-1 shrink-0">
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PendingPreview({ pending }: { pending: PendingAttachment }) {
  if (pending.type === 'image') {
    return (
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pending.previewUrl} alt="" className="h-12 w-12 object-cover rounded border-2 border-black" />
        <span className="text-xs text-muted-foreground truncate">{pending.filename}</span>
      </div>
    )
  }
  if (pending.type === 'video') {
    return (
      <div className="flex items-center gap-2">
        <Film className="h-5 w-5" />
        <span className="text-xs">{pending.filename}</span>
        <span className="text-[10px] text-muted-foreground">{formatBytes(pending.blob.size)}</span>
      </div>
    )
  }
  if (pending.type === 'voice') {
    return (
      <div className="flex items-center gap-2 flex-1">
        <Mic className="h-4 w-4" />
        <audio src={pending.previewUrl} controls className="h-8 max-w-[260px] flex-1" />
        {pending.durationSeconds != null && (
          <span className="text-[10px] text-muted-foreground">{formatDuration(pending.durationSeconds)}</span>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <FileIcon className="h-4 w-4" />
      <span className="text-xs truncate">{pending.filename}</span>
      <span className="text-[10px] text-muted-foreground">{formatBytes(pending.blob.size)}</span>
    </div>
  )
}

function AttachmentRenderer({ message, mine }: { message: Message; mine: boolean }) {
  const url = `/api/messages/${message.id}/attachment`
  if (message.attachment_type === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="Attached image" className="rounded max-w-full max-h-72 mt-1 cursor-zoom-in" />
      </a>
    )
  }
  if (message.attachment_type === 'video') {
    return (
      <video src={url} controls playsInline className="rounded max-w-full max-h-72 mt-1" />
    )
  }
  if (message.attachment_type === 'voice') {
    return (
      <div className={`flex items-center gap-2 mt-1`}>
        <Mic className={`h-3.5 w-3.5 ${mine ? 'text-white/80' : 'text-muted-foreground'}`} />
        <audio src={url} controls className="h-8 max-w-[260px]" />
        {message.attachment_duration_seconds != null && (
          <span className={`text-[10px] ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>
            {formatDuration(message.attachment_duration_seconds)}
          </span>
        )}
      </div>
    )
  }
  // file
  return (
    <a
      href={url}
      download={message.attachment_filename || undefined}
      className={`flex items-center gap-2 mt-1 px-2 py-1.5 rounded border ${mine ? 'border-white/20 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-50'}`}
    >
      <FileIcon className="h-4 w-4 shrink-0" />
      <span className="text-sm truncate flex-1">{message.attachment_filename || 'Download'}</span>
      {message.attachment_size_bytes != null && (
        <span className={`text-[10px] ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>
          {formatBytes(message.attachment_size_bytes)}
        </span>
      )}
      <Download className="h-3.5 w-3.5 shrink-0" />
    </a>
  )
}
