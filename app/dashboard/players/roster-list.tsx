'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronRight, Search, UserRound, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Avatar, Card, EmptyState, GhostButton, Pill } from '@/components/ht/primitives'

export type RosterPlayer = {
  id: number
  name: string
  email: string
  jerseyNumber: number | null
  position: string | null
  gradeLevel: string | null
  rosterStatus: string | null
  avatarPath: string | null
  groupNames: string
}

/** "Guard" -> "G", matching the "11th Grade • G" line in the design. */
function positionAbbrev(position: string | null) {
  return position ? position.charAt(0).toUpperCase() : null
}

/**
 * The design's amber "Limited" chip has no ht-* token, so it borrows Tailwind's
 * amber ramp. Every other status stays on the palette.
 */
const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'border-ht-green/30 bg-ht-green-tint text-ht-green' },
  limited: { label: 'Limited', className: 'border-amber-300 bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactive', className: 'border-ht-line bg-ht-chip text-ht-muted' },
}

export default function RosterList({ players }: { players: RosterPlayer[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [pickingViewAs, setPickingViewAs] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return players.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false
      if (filter === 'active') return p.rosterStatus === 'active'
      if (filter === 'guards') return p.position === 'Guard'
      if (filter === 'forwards') return p.position === 'Forward'
      if (filter === 'centers') return p.position === 'Center'
      return true
    })
  }, [players, query, filter])

  const chips = [
    { key: 'all', label: 'All' },
    { key: 'guards', label: 'Guards' },
    { key: 'forwards', label: 'Forwards' },
    { key: 'centers', label: 'Centers' },
    { key: 'active', label: 'Active' },
  ]

  async function viewAs(player: RosterPlayer) {
    setSwitching(player.id)
    try {
      const res = await fetch('/api/auth/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: player.id }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error || `Failed (HTTP ${res.status})`)
        setSwitching(null)
        return
      }
      window.sessionStorage.setItem('hooptrack_trainer_return_path', '/dashboard/players')
      window.location.assign('/player')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not switch')
      setSwitching(null)
    }
  }

  return (
    <div className="lg:max-w-3xl">
      <label className="relative mt-4 block">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ht-muted" strokeWidth={2} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players"
          aria-label="Search players"
          className="h-12 w-full rounded-xl border border-ht-line bg-ht-surface pl-12 pr-4 text-[15px] text-ht-ink outline-none placeholder:text-ht-muted focus:border-ht-orange"
        />
      </label>

      {/* Five equal columns on phones so every filter is on one row and none is
          clipped; content-sized chips once there is room for them. */}
      <div className="mt-3.5 grid grid-cols-5 gap-1.5 lg:flex lg:flex-wrap lg:gap-2.5">
        {chips.map((chip) => {
          const active = filter === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-1 py-2 text-[12px] whitespace-nowrap transition-colors lg:shrink-0 lg:px-4 lg:text-[14px]',
                active
                  ? 'border-ht-orange bg-ht-orange font-semibold text-white'
                  : 'border-ht-line bg-ht-surface text-ht-ink hover:bg-ht-chip',
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3.5 space-y-3">
        {visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={UsersRound}
              title={players.length === 0 ? 'No players yet' : 'No players match'}
              body={
                players.length === 0
                  ? 'Players appear here once they join one of your groups.'
                  : 'Try a different search or clear the filter.'
              }
            />
          </Card>
        ) : (
          visible.map((player) => {
            const status = STATUS_STYLE[player.rosterStatus ?? ''] ?? STATUS_STYLE.inactive
            const abbrev = positionAbbrev(player.position)
            return (
              <Card key={player.id} padded={false} className="px-3 py-3">
                <div className="flex items-center gap-3">
                  {/* The placeholder avatar carries the jersey number the design shows. */}
                  <Avatar name={player.name} src={player.avatarPath} size={48} />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/coach/players/${player.id}`}
                      className="ht-heading block truncate text-[18px] leading-tight text-ht-ink transition-colors hover:text-ht-orange"
                    >
                      {player.name}
                    </Link>
                    <p className="truncate text-[13px] text-ht-muted">
                      {[player.gradeLevel, abbrev].filter(Boolean).join(' • ') || '—'}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] font-medium text-ht-ink">
                      {player.groupNames || '—'}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Pill className={status.className}>{status.label}</Pill>
                    {pickingViewAs ? (
                      <GhostButton
                        onClick={() => viewAs(player)}
                        disabled={switching != null}
                        className="w-auto px-3.5 py-2 text-[13px]"
                      >
                        {switching === player.id ? 'Opening' : 'View As'}
                      </GhostButton>
                    ) : (
                      <GhostButton
                        href={`/coach/players/${player.id}`}
                        className="w-auto px-3.5 py-2 text-[13px]"
                      >
                        Open Player
                        <ChevronRight className="size-4" strokeWidth={2.5} />
                      </GhostButton>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <GhostButton
        onClick={() => setPickingViewAs((on) => !on)}
        className="mt-3.5 justify-between px-5 py-4 text-[16px]"
      >
        <UserRound className="size-6" strokeWidth={1.7} />
        {pickingViewAs ? 'Cancel Player Preview' : 'View As Player'}
        <ChevronRight className="size-6" strokeWidth={2} />
      </GhostButton>
      {pickingViewAs ? (
        <p className="mt-2 text-center text-[13px] text-ht-muted">
          Pick a player above to open the app exactly as they see it.
        </p>
      ) : null}
    </div>
  )
}
