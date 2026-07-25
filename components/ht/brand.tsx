import { cn } from '@/lib/utils'

/**
 * HOOPTRACK wordmark. "HOOP" in ink, "TRACK" in brand orange, heavy condensed
 * italic, with an optional letterspaced app label beneath (PLAYER / COACH).
 */
export function Wordmark({
  app,
  inline = false,
  className,
}: {
  app?: 'player' | 'coach'
  /** Render the app label on the same line (used by the iOS-style coach header). */
  inline?: boolean
  className?: string
}) {
  const label = app === 'coach' ? 'COACH' : app === 'player' ? 'PLAYER' : null

  return (
    <div className={cn('select-none leading-none', className)}>
      <div className="ht-display text-[44px] leading-[0.88] tracking-[-0.012em]">
        <span className="text-ht-ink">HOOP</span>
        <span className="text-ht-orange">TRACK</span>
        {inline && label ? <span className="text-ht-ink">&nbsp;{label}</span> : null}
      </div>
      {!inline && label ? (
        <div className="ht-ui mt-2 text-[13px] font-bold tracking-[0.44em] text-ht-ink">{label}</div>
      ) : null}
    </div>
  )
}

/**
 * The faint basketball line-art that sits behind every screen in the design
 * pack. Purely decorative, so it is hidden from assistive tech and never
 * intercepts pointer events.
 */
export function CourtBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <svg
        className="absolute -right-24 -top-32 h-[420px] w-[420px] text-ht-orange/[0.13]"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="100" cy="100" r="92" />
        <path d="M100 8v184M8 100h184" />
        <path d="M38 22c30 44 30 112 0 156M162 22c-30 44-30 112 0 156" />
      </svg>
      <svg
        className="absolute -bottom-40 -left-32 h-[460px] w-[460px] text-ht-orange/[0.10]"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="100" cy="100" r="92" />
        <path d="M100 8v184M8 100h184" />
        <path d="M38 22c30 44 30 112 0 156M162 22c-30 44-30 112 0 156" />
      </svg>
    </div>
  )
}
