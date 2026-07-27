'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquareText,
  RefreshCw,
  TrafficCone,
  UserRoundPlus,
  Users,
  Volleyball,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  EmptyState,
  GhostButton,
  PageTitle,
  Pill,
  PrimaryButton,
  RuleTitle,
} from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 002-player-requests-raw.png. The iOS app is a WKWebView over this route, so
 * the phone width is the design and desktop is the same stack, centred. */

type GroupType = 'team' | 'training_session'

type Invite = {
  id: number
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  message: string | null
  created_at: string
  responded_at: string | null
  group_id: number
  group_name: string
  group_type: GroupType
  player_limit: number | null
  coach_id: number
  coach_name: string
  coach_email: string
  member_count: number
}

type Membership = {
  id: number
  name: string
  group_type: GroupType
  player_limit: number | null
  description: string | null
  joined_at: string
  coach_id: number
  coach_name: string
  member_count: number
}

function typeLabel(type: GroupType) {
  return type === 'team' ? 'Team' : 'Training session'
}

/** "12/15" when the group is capped, otherwise the raw roster count. */
function rosterLabel(group: Pick<Membership, 'member_count' | 'player_limit'>) {
  return group.player_limit == null
    ? String(group.member_count)
    : `${group.member_count}/${group.player_limit}`
}

/** SQLite writes "YYYY-MM-DD HH:MM:SS" in UTC; normalise before parsing. */
function formatDate(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Black disc + orange glyph, matching the emblem on the coach teams screen. */
function Emblem({ type, className }: { type: GroupType; className?: string }) {
  // lucide ships no basketball glyph; Volleyball is the ball emblem.
  const Glyph = type === 'team' ? Volleyball : TrafficCone
  return (
    <span
      className={cn(
        'flex size-14 shrink-0 items-center justify-center rounded-full bg-ht-ink',
        className,
      )}
    >
      <Glyph className="size-7 text-ht-orange" strokeWidth={1.8} />
    </span>
  )
}

/**
 * A group is either a team or a training session, so one chip renders per
 * invite — filled black for a team, orange outline for a training session.
 */
function TypePill({ type }: { type: GroupType }) {
  return (
    <Pill
      className={cn(
        'ht-heading px-3 text-[12.5px]',
        type === 'team'
          ? 'border-ht-ink bg-ht-ink text-white'
          : 'border-ht-orange bg-ht-surface text-ht-orange',
      )}
    >
      {typeLabel(type)}
    </Pill>
  )
}

/** Third button in the accept/decline stack — PrimaryButton's shape, chip fill. */
function QuietButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'ht-heading inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ht-chip px-5 py-3',
        'text-[15px] tracking-[0.02em] text-ht-ink transition-colors hover:bg-ht-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Circled icon + label + body, used for the message and requested-on blocks. */
function DetailBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ht-chip">
        <Icon className="size-5 text-ht-ink" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="ht-heading text-[14px] text-ht-ink">{label}</p>
        <div className="mt-1 text-[15px] leading-[1.45] text-ht-ink">{children}</div>
      </div>
    </div>
  )
}

function MembershipDetail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ht-muted">{term}</dt>
      <dd className="min-w-0 flex-1 truncate text-ht-ink">{value}</dd>
    </div>
  )
}

export default function PlayerRequestsClient() {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [answeringId, setAnsweringId] = useState<number | null>(null)
  const [openGroupId, setOpenGroupId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/player/invites', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load requests')
      setInvites(d.invites || [])
      setMemberships(d.memberships || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state updates happen after the async fetch returns
    load()
  }, [load])

  async function answer(inviteId: number, action: 'accept' | 'decline') {
    setAnsweringId(inviteId)
    try {
      const r = await fetch(`/api/player/invites/${inviteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const d = await r.json()
      // A 409 here is the roster filling up between the invite and the tap —
      // the server's wording is the only thing that explains that, so it goes
      // straight to the player rather than a generic failure message.
      if (!r.ok) throw new Error(d.error || 'Could not answer request')
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not answer request')
    } finally {
      setAnsweringId(null)
    }
  }

  const pending = invites.filter((invite) => invite.status === 'pending')

  return (
    <div className="mx-auto w-full max-w-3xl pt-2">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ht-ink transition-colors hover:bg-ht-chip"
        >
          <ChevronLeft className="size-7" strokeWidth={2.5} />
        </button>
        <PageTitle className="flex-1 text-center text-[30px] lg:text-left lg:text-[38px]">
          Team Requests
        </PageTitle>
        {/* Balances the chevron so the title sits dead centre on phones. */}
        <span className="size-9 shrink-0 lg:hidden" />
      </header>

      <section className="mt-6">
        <RuleTitle>Pending Invites</RuleTitle>

        <div className="mt-3.5 space-y-3">
          {loading ? (
            <Card>
              <p className="text-[14px] text-ht-muted">Loading requests…</p>
            </Card>
          ) : pending.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={UserRoundPlus}
                title="No pending invites"
                body="Requests from a coach land here as soon as they are sent."
              />
            </Card>
          ) : (
            pending.map((invite) => {
              const busy = answeringId === invite.id
              return (
                <div key={invite.id} className="space-y-3">
                  <Card>
                    <div className="flex items-start gap-4">
                      <Emblem type={invite.group_type} />
                      <div className="min-w-0 flex-1">
                        <h3 className="ht-heading text-[20px] leading-tight text-ht-ink">
                          {invite.group_name}
                        </h3>
                        <p className="mt-1 text-[15px] text-ht-muted">Coach {invite.coach_name}</p>
                        <div className="mt-2.5">
                          <TypePill type={invite.group_type} />
                        </div>
                      </div>
                    </div>

                    {invite.message ? (
                      <div className="mt-4 border-t border-ht-line-soft pt-4">
                        <DetailBlock icon={MessageSquareText} label="Message from coach">
                          {invite.message}
                        </DetailBlock>
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-ht-line-soft pt-4">
                      <DetailBlock icon={CalendarDays} label="Requested on">
                        {formatDate(invite.created_at)}
                      </DetailBlock>
                    </div>
                  </Card>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <PrimaryButton
                      onClick={() => answer(invite.id, 'accept')}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="size-[18px] animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-[18px]" strokeWidth={2} />
                      )}
                      Accept
                    </PrimaryButton>
                    <GhostButton onClick={() => answer(invite.id, 'decline')} disabled={busy}>
                      <XCircle className="size-[18px]" strokeWidth={2} />
                      Decline
                    </GhostButton>
                  </div>
                </div>
              )
            })
          )}

          <QuietButton onClick={load} disabled={loading} className="sm:max-w-[240px]">
            <RefreshCw className={cn('size-[18px]', loading && 'animate-spin')} strokeWidth={2} />
            Refresh
          </QuietButton>
        </div>
      </section>

      <section className="mt-7">
        <RuleTitle>My Teams and Sessions</RuleTitle>

        <div className="mt-3.5">
          {loading ? (
            <Card>
              <p className="text-[14px] text-ht-muted">Loading teams…</p>
            </Card>
          ) : memberships.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon={Users}
                title="No teams yet"
                body="Accept a request and the team or training session shows up here."
              />
            </Card>
          ) : (
            <Card padded={false}>
              {memberships.map((membership, index) => {
                const open = openGroupId === membership.id
                return (
                  <div key={membership.id}>
                    {index > 0 ? <div className="mx-5 border-t border-ht-line-soft" /> : null}
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenGroupId(open ? null : membership.id)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-ht-orange-tint/60"
                    >
                      <Emblem type={membership.group_type} />
                      <span className="min-w-0 flex-1">
                        <span className="ht-heading block truncate text-[18px] text-ht-ink">
                          {membership.name}
                        </span>
                        {/* Group descriptions are free text and run to a full
                            sentence; one clipped line showed almost none of it. */}
                        <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-ht-muted">
                          {membership.description || typeLabel(membership.group_type)}
                        </span>
                      </span>
                      <span className="shrink-0 text-center">
                        <span className="block text-[19px] leading-none font-bold text-ht-ink">
                          {membership.member_count}
                        </span>
                        <span className="mt-1 block text-[13px] text-ht-muted">Members</span>
                      </span>
                      <ChevronRight
                        className={cn(
                          'size-5 shrink-0 text-ht-muted transition-transform',
                          open && 'rotate-90',
                        )}
                        strokeWidth={2}
                      />
                    </button>

                    {open ? (
                      <dl className="grid gap-2 px-5 pb-4 text-[14px] sm:grid-cols-2">
                        <MembershipDetail term="Type" value={typeLabel(membership.group_type)} />
                        <MembershipDetail term="Coach" value={membership.coach_name} />
                        <MembershipDetail term="Joined" value={formatDate(membership.joined_at)} />
                        <MembershipDetail term="Roster" value={`${rosterLabel(membership)} players`} />
                      </dl>
                    ) : null}
                  </div>
                )
              })}
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
