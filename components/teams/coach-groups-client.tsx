'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  Goal,
  Lock,
  MailPlus,
  Settings,
  TrafficCone,
  TrendingUp,
  Users,
  Volleyball,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Avatar,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  GhostButton,
  Initials,
  PageTitle,
  Pill,
  PrimaryButton,
  SectionTitle,
  Td,
  ViewAllLink,
} from '@/components/ht/primitives'
import CoachRequestResult from '@/components/teams/coach-request-result'

/* Implements design/hooptrack-raw-individual-screens/web-desktop/
 * 002-coach-teams-request-flow-raw.png, plus states/
 * 001-coach-request-sent-raw.png once a request lands and states/
 * 002-coach-roster-full-raw.png when the selected group is at its limit. */

type GroupType = 'team' | 'training_session'

type Group = {
  id: number
  name: string
  group_type: GroupType
  emblem: string | null
  player_limit: number | null
  description: string | null
  member_count: number
  pending_invite_count: number
}

type Member = {
  group_id: number
  id: number
  name: string
  email: string
  position_abbr: string | null
  avatar_path: string | null
  joined_at: string
}

type Invite = {
  group_id: number
  id: number
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  player_id: number
  name: string
  email: string
  created_at: string
  responded_at: string | null
}

const PREVIEW_ROWS = 5

/* coach_groups.emblem, seeded per group. lucide ships no basketball or hoop
 * glyph, so Volleyball is the ball and Goal stands in for the rim. */
const EMBLEMS: Record<string, LucideIcon> = {
  basketball: Volleyball,
  cone: TrafficCone,
  hoop: Goal,
}

function emblemIcon(group: Pick<Group, 'emblem' | 'group_type'>): LucideIcon {
  return (
    (group.emblem && EMBLEMS[group.emblem]) ||
    (group.group_type === 'team' ? Volleyball : TrafficCone)
  )
}

/** Only these have a drawn SVG; anything else falls back to the lucide glyph. */
const EMBLEM_FILES = new Set(['basketball', 'cone', 'hoop'])

/**
 * Dark disc + orange glyph, per 002. Prefers the drawn emblem in
 * public/emblems and falls back to the icon set if the file is missing.
 */
function GroupEmblem({
  group,
  size = 40,
}: {
  group: Pick<Group, 'emblem' | 'group_type'>
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const drawn = group.emblem && EMBLEM_FILES.has(group.emblem) ? group.emblem : null

  if (drawn && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local SVG, no optimisation needed
      <img
        src={`/emblems/${drawn}.svg`}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    )
  }

  return <EmblemGlyph icon={emblemIcon(group)} size={size} />
}

function EmblemGlyph({ icon: Icon, size }: { icon: LucideIcon; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-ht-ink"
      style={{ width: size, height: size }}
    >
      <Icon
        className="text-ht-orange"
        strokeWidth={1.8}
        style={{ width: size * 0.55, height: size * 0.55 }}
      />
    </span>
  )
}

/* DataTable renders an auto-layout table, so one long name or email widens a
 * column until the status pill spills out of the card. Fixing the layout makes
 * the header row authoritative and lets the text cells truncate instead. */
/* Percentages measured off 002-coach-teams-request-flow-raw.png rather than
 * guessed. Status is the remainder, and at its old 15%/13% the pill was cut
 * off by the card's right edge. */
const MEMBER_COLS =
  '[&_table]:table-fixed [&_th:nth-child(1)]:w-[35%] [&_th:nth-child(2)]:w-[22%] [&_th:nth-child(3)]:w-[21%]'
/* The pack prints every invite address in full (bryson.smith@email.com and
 * friends), so this table is weighted toward the address: at the old 38% even
 * the pack's own emails ellipsised, and a real 25-character address lost half
 * its domain. Group/Requested give up the width; both hold their longest
 * seeded value ("Rising Stars 15U", "Jul 24, 2026") at 13px. */
const REQUEST_COLS =
  '[&_table]:table-fixed [&_th:nth-child(1)]:w-[44%] [&_th:nth-child(2)]:w-[25%] [&_th:nth-child(3)]:w-[16%] ' +
  '[&_td]:text-[13px]'

const FIELD =
  'w-full rounded-lg border border-ht-line bg-ht-surface px-3.5 py-2.5 text-[14px] text-ht-ink ' +
  'placeholder:text-ht-muted/70 focus:border-ht-orange focus:outline-none disabled:opacity-60'

/** Form labels are body copy, so they stay in the normal sans like the pack. */
function FieldLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={cn('text-[14px] font-semibold text-ht-ink', className)}>
      {children}
    </label>
  )
}

/** ios/004's collapsed table row: icon, title, hint, disclosure chevron. */
function MobileSummaryRow({
  icon: Icon,
  title,
  hint,
  open,
  href,
}: {
  icon: LucideIcon
  title: string
  hint: string
  open: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-expanded={open}
      className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-ht-orange-tint/60"
    >
      <Icon className="size-5 shrink-0 text-ht-orange" strokeWidth={1.8} />
      {/* 004 sets the count and its hint on one line — "MEMBERS (12)  Accepted
          members in your groups" — rather than stacking them. Both are sized
          to fit that pairing at 390pt without either one clipping. */}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="ht-heading shrink-0 text-[15px] text-ht-ink">{title}</span>
        {/* The hint measures 12.64css tall in 004; 10.5px was compensation for
            the old body face and read far smaller than the pack. */}
        <span className="min-w-0 truncate text-[12px] leading-tight text-ht-muted">{hint}</span>
      </span>
      <ChevronRight
        className={cn('size-5 shrink-0 text-ht-ink transition-transform', open && 'rotate-90')}
        strokeWidth={2}
      />
    </Link>
  )
}

function MobilePanel({
  loading,
  empty,
  emptyLabel,
  children,
}: {
  loading: boolean
  empty: boolean
  emptyLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-ht-line-soft px-5">
      {loading ? (
        <p className="py-4 text-[14px] text-ht-muted">Loading…</p>
      ) : empty ? (
        <p className="py-4 text-[14px] text-ht-muted">{emptyLabel}</p>
      ) : (
        children
      )}
    </div>
  )
}

/** Stacked replacement for a table row — nothing here forces a min width. */
function MobileEntryRow({
  initials,
  title,
  meta,
  pill,
}: {
  initials: React.ReactNode
  title: string
  meta: string
  pill: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-ht-line-soft py-3 last:border-b-0">
      {initials}
      <span className="min-w-0 flex-1">
        {/* Group and member names carry the row; the phone column is narrow
            enough that "Skills Academy" clipped, so they wrap instead. */}
        <span className="block text-[14.5px] leading-snug font-semibold text-ht-ink">{title}</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ht-muted">{meta}</span>
      </span>
      {pill}
    </div>
  )
}

/** SQLite writes "YYYY-MM-DD HH:MM:SS" in UTC; normalise before parsing. */
function formatDate(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function typeLabel(type: GroupType) {
  return type === 'team' ? 'Team' : 'Training session'
}

/** "12/15" when the group is capped, otherwise the raw roster count. */
function rosterLabel(group: Pick<Group, 'member_count' | 'player_limit'>) {
  return group.player_limit == null
    ? String(group.member_count)
    : `${group.member_count}/${group.player_limit}`
}

export default function CoachGroupsClient() {
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [raisingLimit, setRaisingLimit] = useState(false)
  const [form, setForm] = useState({
    name: '',
    group_type: 'team' as GroupType,
    player_limit: '',
    description: '',
  })
  const [invite, setInvite] = useState({ email: '', message: '', groupId: '' })
  /* Set only by a 2xx from the invite endpoint. While it holds a player, the
   * page shows states/001-coach-request-sent instead of the forms. */
  const [sent, setSent] = useState<{ name: string; email: string; groupId: number } | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const view = useSearchParams().get('view')

  /* ?view= is the single source of truth for "which list is opened out": it
   * drives the desktop tables' expansion and the phone disclosure alike, so
   * VIEW ALL is a shareable link rather than state that dies on reload. */
  const mobilePanel = view === 'members' || view === 'requests' ? view : null
  const showAllMembers = view === 'members'
  const showAllRequests = view === 'requests'
  const panelHref = (key: 'members' | 'requests') =>
    view === key ? pathname : `${pathname}?view=${key}`

  const emailInputRef = useRef<HTMLInputElement>(null)
  const groupSelectRef = useRef<HTMLSelectElement>(null)
  const pendingHeaderRef = useRef<HTMLDivElement>(null)
  const mobilePendingRef = useRef<HTMLDivElement>(null)
  const membersHeaderRef = useRef<HTMLDivElement>(null)
  /** Where to land once the success state is dismissed. */
  const afterReturn = useRef<'form' | 'pending' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/coach/groups', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load groups')
      setGroups(d.groups || [])
      setMembers(d.members || [])
      setInvites(d.invites || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load groups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state updates happen after the async fetch returns
    load()
  }, [load])

  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  )

  // The panel is headed "Accepted members in your groups", so a player in two
  // groups is one person, not two rows. Earliest membership wins.
  const uniqueMembers = useMemo(() => {
    const byPlayer = new Map<number, Member>()
    for (const member of members) {
      const seen = byPlayer.get(member.id)
      if (!seen || member.joined_at < seen.joined_at) byPlayer.set(member.id, member)
    }
    return [...byPlayer.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [members])

  const pendingInvites = useMemo(
    () => invites.filter((row) => row.status === 'pending'),
    [invites],
  )

  const selectedGroup = groupsById.get(Number(invite.groupId))

  /* states/002: a group at its player limit locks the request form. Everything
   * keyed off this is additive — with no group at capacity the page renders
   * exactly as web-desktop/002 audits. */
  const atCapacity =
    !!selectedGroup &&
    selectedGroup.player_limit != null &&
    selectedGroup.member_count >= selectedGroup.player_limit

  // Default the request form at the first group so "Roster size" means something.
  // Guarded by a ref so clearing the select back to "Select a group" sticks.
  const seededGroup = useRef(false)
  useEffect(() => {
    if (seededGroup.current || groups.length === 0) return
    seededGroup.current = true
    setInvite((current) => (current.groupId ? current : { ...current, groupId: String(groups[0].id) }))
  }, [groups])

  // The send form and the pending list only exist once the success state is
  // gone, so both landings wait for the render after `sent` clears.
  useEffect(() => {
    if (sent || !afterReturn.current) return
    const target = afterReturn.current
    afterReturn.current = null
    if (target === 'form') {
      emailInputRef.current?.focus()
      return
    }
    // Below lg the table card is display:none, so land on the disclosure that
    // is actually on screen. offsetParent is null for a hidden element.
    const pending = mobilePendingRef.current?.offsetParent
      ? mobilePendingRef.current
      : pendingHeaderRef.current
    pending?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [sent])

  useEffect(() => {
    if (view !== 'members' && view !== 'requests') return
    const frame = requestAnimationFrame(() => {
      const anchor = mobilePendingRef.current?.offsetParent
        ? mobilePendingRef.current
        : view === 'requests'
          ? pendingHeaderRef.current
          : membersHeaderRef.current
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [view])

  /** Raises the cap by five, which is what actually unlocks the form again. */
  async function increaseLimit() {
    if (!selectedGroup || selectedGroup.player_limit == null) return
    setRaisingLimit(true)
    try {
      const next = selectedGroup.player_limit + 5
      const r = await fetch(`/api/coach/groups/${selectedGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_limit: next }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) {
        toast.error(d?.error || 'Could not raise the limit')
        return
      }
      toast.success(`${selectedGroup.name} limit raised to ${next}`)
      await load()
    } finally {
      setRaisingLimit(false)
    }
  }

  /** Sends the coach back to the group picker to choose a group with room. */
  function chooseAnotherGroup() {
    const withRoom = groups.find(
      (g) => g.id !== selectedGroup?.id && (g.player_limit == null || g.member_count < g.player_limit),
    )
    setInvite((current) => ({ ...current, groupId: withRoom ? String(withRoom.id) : '' }))
    groupSelectRef.current?.focus()
  }

  async function createGroup(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name the group first')
      return
    }
    setCreating(true)
    try {
      const r = await fetch('/api/coach/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          group_type: form.group_type,
          player_limit: form.player_limit ? Number(form.player_limit) : null,
          description: form.description || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not create group')
      toast.success('Group created')
      setForm({ name: '', group_type: 'team', player_limit: '', description: '' })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create group')
    } finally {
      setCreating(false)
    }
  }

  async function sendInvite(event: React.FormEvent) {
    event.preventDefault()
    const email = invite.email.trim()
    if (!email) {
      toast.error('Enter the player email first')
      return
    }
    if (!selectedGroup) {
      toast.error('Pick the group to add this player to')
      return
    }
    setSending(true)
    try {
      const r = await fetch(`/api/coach/groups/${selectedGroup.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          message: invite.message.trim() || undefined,
        }),
      })
      const d = await r.json()
      // 404 (no such player) and 409 (duplicate / roster full) throw here, so
      // they keep their toast and never reach the success state below.
      if (!r.ok) throw new Error(d.error || 'Could not send request')
      toast.success(`Request sent to ${d.player.name}`)
      setInvite((current) => ({ ...current, email: '', message: '' }))
      setSent({ name: d.player.name, email: d.player.email, groupId: selectedGroup.id })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send request')
    } finally {
      setSending(false)
    }
  }

  function sendAnother() {
    afterReturn.current = 'form'
    setSent(null)
  }

  function viewPending() {
    afterReturn.current = 'pending'
    router.push(`${pathname}?view=requests`)
    setSent(null)
  }

  const visibleMembers = showAllMembers ? uniqueMembers : uniqueMembers.slice(0, PREVIEW_ROWS)
  const visibleRequests = showAllRequests ? pendingInvites : pendingInvites.slice(0, PREVIEW_ROWS)

  // Resolved after the reload, so the summary reflects the new roster count.
  // If the group vanished meanwhile there is nothing to summarise — the toast
  // already fired, so fall back to the forms rather than render a broken card.
  const sentGroup = sent ? groupsById.get(sent.groupId) : undefined

  if (sent && sentGroup) {
    return (
      <div className="pt-2">
        <PageTitle>Teams and Training Sessions</PageTitle>
        <div className="mt-5">
          <CoachRequestResult
            sentTo={sent}
            group={sentGroup}
            pendingInvites={pendingInvites}
            groups={groups}
            onSendAnother={sendAnother}
            onViewPending={viewPending}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2">
      <PageTitle>Teams and Training Sessions</PageTitle>

      {/* min-w-0 on each card: a grid item defaults to min-width:auto, so the
          single mobile column could not shrink below the widest row's
          min-content and pushed the document to 404px. */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* ---------------------------------------------------- Create group */}
        <Card className="flex min-w-0 flex-col">
          <SectionTitle>Create Group</SectionTitle>
          <form onSubmit={createGroup} className="mt-4 flex flex-1 flex-col gap-3.5">
            <div className="flex items-center gap-4">
              <FieldLabel htmlFor="group-name" className="shrink-0">
                Name
              </FieldLabel>
              <input
                id="group-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter group name"
                className={cn(FIELD, 'flex-1')}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="shrink-0 text-[14px] font-semibold text-ht-ink">Type</span>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {(['team', 'training_session'] as const).map((type) => {
                  const active = form.group_type === type
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm({ ...form, group_type: type })}
                      className={cn(
                        // "Training session" wrapped to two lines at 390px; the
                        // design keeps each segment on one line. Desktop keeps
                        // the original size, so web-desktop/002 is unchanged.
                        'rounded-lg border px-2 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                        'lg:px-3 lg:text-[14px]',
                        active
                          ? 'border-ht-orange bg-ht-orange-soft text-ht-orange'
                          : 'border-ht-line bg-ht-surface text-ht-ink hover:bg-ht-chip/70',
                      )}
                    >
                      {typeLabel(type)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <FieldLabel htmlFor="player-limit" className="shrink-0">
                Player limit
              </FieldLabel>
              <input
                id="player-limit"
                inputMode="numeric"
                value={form.player_limit}
                onChange={(e) => setForm({ ...form, player_limit: e.target.value })}
                placeholder="e.g. 15"
                className={cn(FIELD, 'w-[92px] shrink-0')}
              />
              <span className="text-[14px] font-semibold text-ht-ink">players</span>
            </div>

            <div>
              <FieldLabel htmlFor="group-description">Description</FieldLabel>
              <textarea
                id="group-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your group (optional)"
                className={cn(FIELD, 'mt-2 resize-y')}
              />
            </div>

            <PrimaryButton type="submit" disabled={creating} className="mt-auto">
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              Create Group
            </PrimaryButton>
          </form>
        </Card>

        {/* ------------------------------------------------------- My groups */}
        <Card padded={false} className="flex min-w-0 flex-col">
          <div className="px-5 pt-5">
            <SectionTitle>My Groups</SectionTitle>
          </div>
          {loading ? (
            <p className="px-5 py-6 text-[14px] text-ht-muted">Loading groups…</p>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No groups yet"
              body="Create a team or training session to start sending player requests."
            />
          ) : (
            <div className="mt-3">
              {groups.map((group, index) => {
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setInvite((current) => ({ ...current, groupId: String(group.id) }))}
                    className={cn(
                      'flex w-full items-center gap-1 px-4 py-3.5 text-left transition-colors hover:bg-ht-orange-tint/60',
                      index > 0 && 'border-t border-ht-line-soft',
                    )}
                  >
                    <GroupEmblem group={group} size={34} />
                    {/* The pack shows each group's full name next to its type
                        chip; "Skills Academy" + "Training session" is the
                        tightest pair, so the chip is set smaller than a default
                        Pill to leave the name whole. */}
                    <span className="mr-0.5 min-w-0 flex-1 text-[15px] leading-snug font-semibold text-ht-ink">
                      {group.name}
                    </span>
                    <Pill
                      tone={group.group_type === 'team' ? 'orange' : 'neutral'}
                      className="px-1.5 py-0.5 text-[11px]"
                    >
                      {typeLabel(group.group_type)}
                    </Pill>
                    <span className="shrink-0 text-[12px] tabular-nums text-ht-ink">
                      {rosterLabel(group)}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ht-ink" strokeWidth={2} />
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* --------------------------------------------- Send player request */}
        <Card className="flex min-w-0 flex-col">
          <SectionTitle>Send Player Request</SectionTitle>

          {atCapacity && selectedGroup ? (
            <>
              {/* Phone gets the design's group header; desktop already shows
                  MY GROUPS beside this card, so it would be a duplicate. */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-ht-line p-3 lg:hidden">
                <GroupEmblem group={selectedGroup} size={40} />
                <span className="ht-heading min-w-0 flex-1 text-[17px] text-ht-ink">
                  {selectedGroup.name}
                </span>
                <Pill tone={selectedGroup.group_type === 'team' ? 'orange' : 'neutral'}>
                  {typeLabel(selectedGroup.group_type)}
                </Pill>
                <span className="shrink-0 text-[14px] text-ht-ink">
                  {rosterLabel(selectedGroup)} players
                </span>
              </div>

              <div className="mt-4 flex items-start gap-3.5 rounded-xl border border-ht-orange bg-ht-orange-tint p-4">
                <AlertCircle className="size-9 shrink-0 fill-ht-orange text-white" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="ht-heading text-[17px] text-ht-orange">Roster limit reached.</p>
                  <p className="mt-1 text-[14.5px] leading-6 text-ht-ink">
                    This {typeLabel(selectedGroup.group_type).toLowerCase()} has reached the maximum
                    player limit. You cannot add more players until you increase the limit.
                  </p>
                </div>
              </div>
            </>
          ) : null}

          <form onSubmit={sendInvite} className="mt-4 flex flex-1 flex-col gap-3.5">
            <div>
              <FieldLabel htmlFor="invite-email">Player email</FieldLabel>
              <div className="relative mt-2">
                <input
                  id="invite-email"
                  ref={emailInputRef}
                  type="email"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  placeholder="Enter player email address"
                  disabled={atCapacity}
                  className={cn(FIELD, atCapacity && 'bg-ht-chip pr-10 text-ht-muted')}
                />
                {atCapacity ? (
                  <Lock
                    className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-ht-muted"
                    strokeWidth={2}
                  />
                ) : null}
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="invite-message">
                Message <span className="font-normal text-ht-muted">(optional)</span>
              </FieldLabel>
              <div className="relative mt-2">
                <textarea
                  id="invite-message"
                  rows={3}
                  value={invite.message}
                  onChange={(e) => setInvite({ ...invite, message: e.target.value })}
                  placeholder="Add a message (optional)"
                  disabled={atCapacity}
                  className={cn(FIELD, 'resize-y', atCapacity && 'bg-ht-chip text-ht-muted')}
                />
                {atCapacity ? (
                  <Lock
                    className="pointer-events-none absolute right-3 bottom-3 size-[18px] text-ht-muted"
                    strokeWidth={2}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <FieldLabel htmlFor="invite-group" className="shrink-0">
                Add to Group
              </FieldLabel>
              <div className="relative flex-1">
                <select
                  id="invite-group"
                  ref={groupSelectRef}
                  value={invite.groupId}
                  onChange={(e) => setInvite({ ...invite, groupId: e.target.value })}
                  disabled={groups.length === 0}
                  className={cn(FIELD, 'appearance-none pr-9')}
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ht-ink"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            <p className="flex items-center gap-2 text-[14px] text-ht-ink">
              <Users className="size-[18px] shrink-0 text-ht-orange" strokeWidth={2} />
              {selectedGroup
                ? `Roster size: ${rosterLabel(selectedGroup)} players`
                : 'Pick a group to see its roster size'}
            </p>

            <PrimaryButton
              type="submit"
              disabled={sending || groups.length === 0 || atCapacity}
              className="mt-auto"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send Request
            </PrimaryButton>

            {atCapacity ? (
              <div className="flex flex-col gap-3">
                <GhostButton type="button" onClick={increaseLimit} disabled={raisingLimit}>
                  {raisingLimit ? (
                    <Loader2 className="size-[18px] animate-spin" />
                  ) : (
                    <TrendingUp className="size-[18px]" strokeWidth={2} />
                  )}
                  Increase Limit
                </GhostButton>
                <button
                  type="button"
                  onClick={chooseAnotherGroup}
                  className="ht-heading inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ht-ink bg-ht-surface px-5 py-3 text-[15px] tracking-[0.02em] text-ht-ink transition-colors hover:bg-ht-chip"
                >
                  <Users className="size-[18px]" strokeWidth={2} />
                  Choose Another Group
                </button>
              </div>
            ) : null}
          </form>

          {/* Phone-only: desktop already lists these tables further down. */}
          {atCapacity ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-ht-line lg:hidden">
              <Link
                href={panelHref('members')}
                className="flex items-center gap-3 border-b border-ht-line-soft px-4 py-3.5 transition-colors hover:bg-ht-chip/60"
              >
                <Settings className="size-5 shrink-0 text-ht-ink" strokeWidth={1.7} />
                <span className="ht-heading flex-1 text-[15px] text-ht-ink">Team Settings</span>
                <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
              </Link>
              <Link
                href={panelHref('members')}
                className="flex items-center gap-3 border-b border-ht-line-soft px-4 py-3.5 transition-colors hover:bg-ht-chip/60"
              >
                <Users className="size-5 shrink-0 text-ht-ink" strokeWidth={1.7} />
                <span className="ht-heading flex-1 text-[15px] text-ht-ink">Members</span>
                <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
              </Link>
              <Link
                href={panelHref('requests')}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ht-chip/60"
              >
                <ClipboardList className="size-5 shrink-0 text-ht-ink" strokeWidth={1.7} />
                <span className="ht-heading flex-1 text-[15px] text-ht-ink">Pending Requests</span>
                <ChevronRight className="size-5 shrink-0 text-ht-muted" strokeWidth={2} />
              </Link>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Phone: ios/004 collapses both tables to summary rows. Rendering the
          lg-only tables at 390px pushed the document to 583px wide, because a
          grid item will not shrink below the DataTable's min-w. */}
      <Card padded={false} className="mt-5 lg:hidden">
        <MobileSummaryRow
          icon={Users}
          title={`Members (${uniqueMembers.length})`}
          hint="Accepted members in your groups"
          open={mobilePanel === 'members'}
          href={panelHref('members')}
        />
        {mobilePanel === 'members' ? (
          <MobilePanel
            loading={loading}
            empty={uniqueMembers.length === 0}
            emptyLabel="Players show up here once they accept a request."
          >
            {visibleMembers.map((member) => (
              <MobileEntryRow
                key={member.id}
                initials={<Avatar name={member.name} src={member.avatar_path} size={36} />}
                title={member.name}
                meta={`Joined ${formatDate(member.joined_at)}`}
                pill={<Pill tone="green">Active</Pill>}
              />
            ))}
          </MobilePanel>
        ) : null}

        <div ref={mobilePendingRef} className="border-t border-ht-line-soft">
          <MobileSummaryRow
            icon={MailPlus}
            /* ios/004 labels this row "REQUESTS (n)"; the hint already says
               these are pending, and the desktop header keeps its own wording. */
            title={`Requests (${pendingInvites.length})`}
            hint="Pending player invites"
            open={mobilePanel === 'requests'}
            href={panelHref('requests')}
          />
        </div>
        {mobilePanel === 'requests' ? (
          <MobilePanel
            loading={loading}
            empty={pendingInvites.length === 0}
            emptyLabel="Send a player request and it will wait here until they respond."
          >
            {visibleRequests.map((row) => (
              <MobileEntryRow
                key={row.id}
                initials={<Initials name={row.name} className="bg-ht-chip text-ht-muted" />}
                title={row.email}
                meta={`${groupsById.get(row.group_id)?.name ?? '—'} · ${formatDate(row.created_at)}`}
                pill={<Pill tone="orange">Pending</Pill>}
              />
            ))}
          </MobilePanel>
        ) : null}
      </Card>

      <div className="mt-5 hidden gap-5 lg:grid lg:grid-cols-2">
        {/* --------------------------------------------------------- Members */}
        <Card padded={false} className="flex flex-col">
          <div ref={membersHeaderRef} className="px-5 pt-5">
            <CardHeader
              title={`Members (${uniqueMembers.length})`}
              hint="Accepted members in your groups"
            />
          </div>
          {loading ? (
            <p className="px-5 py-6 text-[14px] text-ht-muted">Loading members…</p>
          ) : uniqueMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              body="Players show up here once they accept a request."
            />
          ) : (
            <>
              <div className="mt-3 px-5">
                <div className={cn('border-t border-ht-line', MEMBER_COLS)}>
                  <DataTable columns={['Player Name', 'Position', 'Joined', 'Status']}>
                    {visibleMembers.map((member) => (
                      <tr key={member.id} className="border-b border-ht-line-soft">
                        <Td>
                          <span className="flex items-center gap-3">
                            <Avatar name={member.name} src={member.avatar_path} size={32} />
                            <span className="truncate">{member.name}</span>
                          </span>
                        </Td>
                        <Td className={member.position_abbr ? '' : 'text-ht-muted'}>
                          {member.position_abbr ?? '—'}
                        </Td>
                        <Td className="whitespace-nowrap">{formatDate(member.joined_at)}</Td>
                        <Td>
                          <Pill tone="green">Active</Pill>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              </div>
              <div className="mt-auto px-5 pb-2">
                <ViewAllLink href={showAllMembers ? pathname : `${pathname}?view=members`}>
                  {showAllMembers ? 'Show Fewer Members' : 'View All Members'}
                </ViewAllLink>
              </div>
            </>
          )}
        </Card>

        {/* ------------------------------------------------ Pending requests */}
        <Card padded={false} className="flex flex-col">
          <div ref={pendingHeaderRef} className="px-5 pt-5">
            <CardHeader
              title={`Pending Requests (${pendingInvites.length})`}
              hint="Pending player invites"
            />
          </div>
          {loading ? (
            <p className="px-5 py-6 text-[14px] text-ht-muted">Loading requests…</p>
          ) : pendingInvites.length === 0 ? (
            <EmptyState
              icon={MailPlus}
              title="No pending requests"
              body="Send a player request and it will wait here until they respond."
            />
          ) : (
            <>
              <div className="mt-3 px-5">
                <div className={cn('border-t border-ht-line', REQUEST_COLS)}>
                  <DataTable columns={['Email / Name', 'Group', 'Requested', 'Status']}>
                    {visibleRequests.map((row) => (
                      <tr key={row.id} className="border-b border-ht-line-soft">
                        <Td>
                          <span className="flex items-center gap-2.5">
                            <Initials
                              name={row.name}
                              className="size-8 bg-ht-chip text-[12px] text-ht-muted"
                            />
                            <span className="truncate">{row.email}</span>
                          </span>
                        </Td>
                        <Td className="truncate">{groupsById.get(row.group_id)?.name ?? '—'}</Td>
                        <Td className="whitespace-nowrap">{formatDate(row.created_at)}</Td>
                        <Td>
                          <Pill tone="orange">Pending</Pill>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              </div>
              <div className="mt-auto px-5 pb-2">
                <ViewAllLink href={showAllRequests ? pathname : `${pathname}?view=requests`}>
                  {showAllRequests ? 'Show Fewer Requests' : 'View All Requests'}
                </ViewAllLink>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
