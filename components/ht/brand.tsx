import { cn } from '@/lib/utils'

/**
 * HOOPSTRACK wordmark. "HOOPS" follows the surface color, "TRACK" stays brand
 * orange, with an optional letterspaced app label beneath (PLAYER / COACH).
 */
export function Wordmark({
  app,
  inline = false,
  tone = 'light',
  className,
  markClassName,
  labelClassName,
}: {
  app?: 'player' | 'coach'
  /** Render the app label on the same line (used by the iOS-style coach header). */
  inline?: boolean
  /** Light surfaces use ink text. Dark surfaces use white text. */
  tone?: 'light' | 'dark'
  className?: string
  /** Overrides the HOOPSTRACK size. The inner div carries it, so `className` —
   *  which lands on the wrapper — cannot reach it. */
  markClassName?: string
  /** Overrides the PLAYER / COACH label size in the stacked form. */
  labelClassName?: string
}) {
  const label = app === 'coach' ? 'COACH' : app === 'player' ? 'PLAYER' : null

  return (
    <div className={cn('select-none leading-none', className)}>
      <div
        className={cn(
          'ht-display leading-[0.88] tracking-[-0.012em]',
          markClassName ?? 'text-[44px]',
        )}
      >
        <span className={tone === 'dark' ? 'text-white' : 'text-ht-ink'}>HOOPS</span>
        <span className="text-ht-orange">TRACK</span>
        {inline && label ? (
          <span className={tone === 'dark' ? 'text-white' : 'text-ht-ink'}>&nbsp;{label}</span>
        ) : null}
      </div>
      {!inline && label ? (
        <div
          className={cn(
            'ht-ui mt-2 font-bold tracking-[0.44em]',
            tone === 'dark' ? 'text-white' : 'text-ht-ink',
            labelClassName ?? 'text-[13px]',
          )}
        >
          {label}
        </div>
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
