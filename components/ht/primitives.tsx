import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
 * Screen-pack primitives.
 *
 * Every value here is sampled from design/hooptrack-raw-individual-screens.
 * The older neobrutalist components (border-2 border-black + hard shadow) are
 * a separate, still-live design language — do not mix the two on one screen.
 * ------------------------------------------------------------------------ */

/**
 * Heavy condensed italic page title, e.g. "TEAMS AND TRAINING SESSIONS".
 *
 * Sized from the pack rather than by eye: the desktop titles measure a ~54px
 * cap height, which for this condensed face means a ~76px font. The phone
 * designs work out to roughly 40px.
 */
export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h1
      className={cn(
        'ht-display text-[40px] leading-[0.98] text-ht-ink lg:text-[76px] lg:leading-[0.95]',
        className,
      )}
    >
      {children}
    </h1>
  )
}

/**
 * Bold condensed uppercase panel heading, e.g. "QUICK ACCESS".
 *
 * The desktop size is measured, not chosen: every panel heading in the pack —
 * QUICK ACCESS, TRAINING PLAN, MEMBERS, TOP WEAK AREAS — has a 20px cap height,
 * which for this face (cap ≈ 0.72em) is a 28px font.
 */
export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={cn(
        'ht-heading text-[22px] tracking-[0.01em] text-ht-ink lg:text-[28px]',
        className,
      )}
    >
      {children}
    </h2>
  )
}

/** The orange bar + uppercase heading used on the iOS-style screens. */
export function RuleTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="block h-[22px] w-[5px] rounded-sm bg-ht-orange" />
      <h2 className="ht-heading text-[20px] text-ht-ink">{children}</h2>
    </div>
  )
}

/**
 * The one card shell. Every panel on every screen is this component, so radius,
 * hairline and padding cannot drift between screens: 14px radius, 1px #E0E1E4
 * hairline, 28px of padding on desktop (measured off the pack — the panel
 * headings sit 28-30px in from the card edge on 001, 002, 004 and 005 alike).
 */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-ht-line bg-ht-surface',
        padded && 'p-5 lg:p-7',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  hint,
  action,
  className,
}: {
  title: React.ReactNode
  hint?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <div className="flex items-baseline gap-3">
        <SectionTitle>{title}</SectionTitle>
        {hint ? <span className="text-[13px] text-ht-muted">{hint}</span> : null}
      </div>
      {action}
    </div>
  )
}

export type Stat = {
  label: string
  value: React.ReactNode
  caption: string
  /** Renders the number in brand orange — used for "overdue"-style alerts. */
  alert?: boolean
}

function StatCell({
  stat,
  divided,
  dense = false,
}: {
  stat: Stat
  divided: boolean
  /** Five-across on a phone needs tighter type to avoid wrapping every label. */
  dense?: boolean
}) {
  return (
    <div
      className={cn(
        'py-4 text-center lg:px-5',
        dense ? 'px-1.5' : 'px-3',
        divided && 'border-l border-ht-line-soft',
      )}
    >
      <div
        className={cn(
          'ht-heading text-ht-ink lg:text-[13px] lg:tracking-[0.06em]',
          dense ? 'text-[10px] tracking-[0.02em]' : 'text-[12px] tracking-[0.05em]',
        )}
      >
        {stat.label}
      </div>
      {/* Upright, not oblique: the pack slants only the wordmark, the page
          titles and the Start Capture hero — every counter is set bolt
          upright, so these use .ht-num rather than .ht-display. */}
      <div
        className={cn(
          'ht-num mt-1.5 text-[34px] leading-none lg:text-[40px]',
          stat.alert ? 'text-ht-orange' : 'text-ht-ink',
        )}
      >
        {stat.value}
      </div>
      <div className="mt-1.5 text-[12px] text-ht-muted lg:text-[13px]">{stat.caption}</div>
    </div>
  )
}

/**
 * The hairline-divided row of big numbers at the top of most screens.
 * One row on desktop. On phones the pack is not consistent: 001-player-home
 * stacks five counters as 3+2, while 003-coach-home draws all five across — so
 * the phone grouping is per-screen rather than a fixed rule.
 *
 * @param phoneColumns how many counters per row on phones; pass
 *   `stats.length` for a single row (003-coach-home). Defaults to 3.
 */
export function StatStrip({
  stats,
  className,
  phoneColumns = 3,
}: {
  stats: Stat[]
  className?: string
  phoneColumns?: number
}) {
  const perRow = Math.max(1, phoneColumns)
  const rows: Stat[][] = []
  for (let i = 0; i < stats.length; i += perRow) rows.push(stats.slice(i, i + perRow))

  return (
    <Card padded={false} className={cn('overflow-hidden', className)}>
      {/* Phones: rows of three, each row stretching to full width. */}
      <div className="lg:hidden">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn('grid', rowIndex > 0 && 'border-t border-ht-line-soft')}
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0,1fr))` }}
          >
            {row.map((stat, i) => (
              <StatCell key={stat.label} stat={stat} divided={i > 0} dense={perRow >= 4} />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: a single row, as in the web-desktop designs. */}
      <div
        className="hidden lg:grid"
        style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))` }}
      >
        {stats.map((stat, i) => (
          <StatCell key={stat.label} stat={stat} divided={i > 0} />
        ))}
      </div>
    </Card>
  )
}

type Tone = 'orange' | 'green' | 'blue' | 'purple' | 'neutral' | 'red'

const TONE: Record<Tone, string> = {
  orange: 'border-ht-orange/40 bg-ht-orange-soft text-ht-orange',
  green: 'border-ht-green/30 bg-ht-green-tint text-ht-green',
  blue: 'border-ht-blue/30 bg-ht-blue-tint text-ht-blue',
  purple: 'border-ht-purple/30 bg-ht-purple-tint text-ht-purple',
  red: 'border-ht-red/30 bg-ht-red-tint text-ht-red',
  neutral: 'border-ht-line bg-ht-chip text-ht-muted',
}

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Solid orange call-to-action. */
export function PrimaryButton({
  children,
  className,
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }) {
  const classes = cn(
    'ht-heading inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ht-orange px-5 py-3',
    'text-[15px] tracking-[0.02em] text-white transition-colors hover:bg-ht-orange-hover',
    'disabled:cursor-not-allowed disabled:opacity-60',
    className,
  )
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

/** Orange outline / ghost counterpart to PrimaryButton. */
export function GhostButton({
  children,
  className,
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }) {
  const classes = cn(
    'ht-heading inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ht-orange bg-white px-5 py-3',
    'text-[15px] tracking-[0.02em] text-ht-orange transition-colors hover:bg-ht-orange-soft',
    'disabled:cursor-not-allowed disabled:opacity-60',
    className,
  )
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

/** A tappable row with a leading icon and a trailing chevron / count badge. */
export function NavRow({
  icon: Icon,
  label,
  href,
  count,
  description,
  last = false,
}: {
  icon: LucideIcon
  label: string
  href: string
  count?: number
  description?: string
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ht-orange-tint/60',
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
      {count ? (
        <span className="ht-heading rounded-md bg-ht-orange px-2 py-0.5 text-[13px] text-white">
          {count}
        </span>
      ) : null}
      <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
    </Link>
  )
}

/** "VIEW ALL X >" footer link that closes most panels in the pack. */
export function ViewAllLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="ht-heading flex items-center justify-center gap-1.5 py-3 text-[14px] tracking-[0.04em] text-ht-orange hover:underline"
    >
      {children}
      <ChevronRight className="size-4" strokeWidth={2.5} />
    </Link>
  )
}

/** Circular initials avatar used wherever a real photo is unavailable. */
export function Initials({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: React.CSSProperties
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span
      className={cn(
        'ht-heading inline-flex size-9 shrink-0 items-center justify-center rounded-full',
        'bg-ht-orange-soft text-[13px] text-ht-orange',
        className,
      )}
      style={style}
    >
      {initials}
    </span>
  )
}

/**
 * Player/coach avatar. Renders `users.avatar_path` when set and falls back to
 * initials when it is null, so a roster stays readable before any image exists.
 * Seeded avatars are stylised placeholders under /public/avatars — generated by
 * scripts/gen-placeholder-imagery.mjs, not photographs.
 */
export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  if (!src) {
    return (
      <Initials
        name={name}
        className={cn(className)}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder, no optimisation needed
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  )
}

/** Poster for a clip with no video file on disk. */
export function ClipPoster({
  title,
  className,
}: {
  title?: string | null
  className?: string
}) {
  const slug =
    (title || 'clip').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clip'
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder
    <img
      src={`/posters/${slug}.svg`}
      alt=""
      className={cn('h-full w-full rounded-lg object-cover', className)}
      onError={(event) => {
        const img = event.currentTarget
        if (!img.src.endsWith('/posters/clip.svg')) img.src = '/posters/clip.svg'
      }}
    />
  )
}

/** Consistent empty state so no panel ever renders as a blank box. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {Icon ? <Icon className="size-8 text-ht-line" strokeWidth={1.5} /> : null}
      <p className="ht-heading mt-3 text-[15px] text-ht-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[13px] text-ht-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/** Table shell matching the MEMBERS / RECENT CLIPS tables in the pack. */
export function DataTable({
  columns,
  children,
}: {
  columns: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-ht-line">
            {columns.map((col) => (
              <th
                key={col}
                className="ht-heading px-3 py-2.5 text-[12px] tracking-[0.06em] text-ht-muted first:pl-0 last:pr-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn('px-3 py-3 text-[14px] text-ht-ink first:pl-0 last:pr-0', className)}>
      {children}
    </td>
  )
}
