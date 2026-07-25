'use client'

import Link from 'next/link'
import { CalendarDays, ChevronRight, Clock, Tag } from 'lucide-react'
import { ClipPoster, Pill } from '@/components/ht/primitives'

/**
 * A RECENT RECORDINGS / CLIPS row from 013-coach-player-profile-review-raw.png.
 *
 * Client-side because ClipPoster falls back to a generic poster via an onError
 * handler, which a server component cannot carry across the RSC boundary.
 */
export type ClipRowData = {
  id: number
  title: string | null
  recorded_at: string
  duration_seconds: number
  video_path: string | null
  category: string | null
  drill_name: string | null
}

function fmtDate(iso: string) {
  return new Date(iso.replace(' ', 'T')).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso.replace(' ', 'T')).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ClipRow({
  clip,
  href,
  last,
  reviewed,
}: {
  clip: ClipRowData
  href: string | null
  last: boolean
  reviewed: boolean
}) {
  const body = (
    <>
      <span className="size-[56px] shrink-0 overflow-hidden rounded-lg bg-ht-orange-tint">
        <ClipPoster title={clip.title || clip.drill_name} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-ht-ink">
          {clip.title || clip.drill_name || 'Recording'}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[13px] whitespace-nowrap text-ht-muted">
          <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.8} />
          {fmtDate(clip.recorded_at)}
          <Clock className="ml-1.5 size-3.5 shrink-0" strokeWidth={1.8} />
          {fmtTime(clip.recorded_at)}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[13px] text-ht-muted">
          <Tag className="size-3.5 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{clip.category || clip.drill_name || '—'}</span>
        </span>
      </span>

      {reviewed ? <Pill tone="green">Reviewed</Pill> : <Pill tone="blue">New</Pill>}
      {href ? <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} /> : null}
    </>
  )

  const className = `flex items-center gap-3 px-3.5 py-3.5${last ? '' : ' border-b border-ht-line-soft'}`

  if (!href) return <div className={className}>{body}</div>
  return (
    <Link href={href} className={`${className} transition-colors hover:bg-ht-orange-tint/60`}>
      {body}
    </Link>
  )
}
