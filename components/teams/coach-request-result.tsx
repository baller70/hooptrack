'use client'

import { Check, ChevronRight, MailPlus, TrafficCone, Users, Volleyball } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  EmptyState,
  GhostButton,
  Initials,
  Pill,
  PrimaryButton,
  SectionTitle,
} from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/states/
 * 001-coach-request-sent-raw.png (CoachRequestResult) and the MEMBERS /
 * REQUESTS summary rows at the foot of ios/004-coach-teams-send-request-raw.png
 * (CoachSummaryRows).
 *
 * CoachRequestResult is mounted by components/teams/coach-groups-client.tsx.
 * CoachSummaryRows is not mounted yet — see its own note. */

type GroupType = 'team' | 'training_session'

export type ResultGroup = {
  id: number
  name: string
  group_type: GroupType
  player_limit: number | null
  description: string | null
  member_count: number
}

export type ResultInvite = {
  id: number
  group_id: number
  name: string
  email: string
}

function typeLabel(type: GroupType) {
  return type === 'team' ? 'Team' : 'Training session'
}

/** "12/15" when the group is capped, otherwise the raw roster count. */
function rosterLabel(group: Pick<ResultGroup, 'member_count' | 'player_limit'>) {
  return group.player_limit == null
    ? String(group.member_count)
    : `${group.member_count}/${group.player_limit}`
}

/** Black disc + orange glyph — the roster emblem shared across the teams screens. */
function Emblem({ type, className, glyphClassName }: {
  type: GroupType
  className?: string
  glyphClassName?: string
}) {
  // lucide ships no basketball glyph; Volleyball is the ball emblem.
  const Glyph = type === 'team' ? Volleyball : TrafficCone
  return (
    <span
      className={cn(
        'flex size-14 shrink-0 items-center justify-center rounded-full bg-ht-ink',
        className,
      )}
    >
      <Glyph className={cn('size-7 text-ht-orange', glyphClassName)} strokeWidth={1.8} />
    </span>
  )
}

/**
 * The green confirmation banner, pending-requests recap, group summary and
 * actions shown after a coach sends a player request.
 *
 * Mounted by components/teams/coach-groups-client.tsx, which holds the
 * successful `POST /api/coach/groups/[id]/invites` response in `sent` and
 * renders this in place of the forms while that state is set.
 */
export default function CoachRequestResult({
  sentTo,
  group,
  pendingInvites,
  groups,
  onSendAnother,
  onViewPending,
}: {
  sentTo: { name: string; email: string }
  /** The group the request was sent to. */
  group: ResultGroup
  /** Every still-pending invite for this coach, newest first. */
  pendingInvites: ResultInvite[]
  /** Used to resolve each pending invite's group name and emblem. */
  groups: ResultGroup[]
  onSendAnother?: () => void
  onViewPending?: () => void
}) {
  const groupsById = new Map(groups.map((row) => [row.id, row]))

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 rounded-xl border border-ht-green/30 bg-ht-green-tint p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ht-green">
          <Check className="size-5 text-white" strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold text-ht-green">Request sent to {sentTo.name}.</p>
          <p className="mt-1 text-[15px] text-ht-ink">We&rsquo;ll notify you when they respond.</p>
        </div>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader
            title={`Pending Requests (${pendingInvites.length})`}
            action={
              onViewPending ? (
                <button
                  type="button"
                  onClick={onViewPending}
                  aria-label="View all pending requests"
                  className="text-ht-ink transition-colors hover:text-ht-orange"
                >
                  <ChevronRight className="size-5" strokeWidth={2} />
                </button>
              ) : null
            }
          />
        </div>

        {pendingInvites.length === 0 ? (
          <EmptyState
            icon={MailPlus}
            title="No pending requests"
            body="Requests wait here until the player accepts or declines."
          />
        ) : (
          <div className="mt-4">
            {pendingInvites.map((invite, index) => {
              const inviteGroup = groupsById.get(invite.group_id)
              return (
                <div key={invite.id}>
                  {index > 0 ? <div className="mx-5 border-t border-ht-line-soft" /> : null}
                  <div className="flex items-start gap-3.5 px-5 py-4">
                    <Initials
                      name={invite.name}
                      className="size-11 bg-ht-chip text-[15px] text-ht-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold text-ht-ink">
                        {invite.name}
                      </p>
                      <p className="mt-0.5 truncate text-[14px] text-ht-muted">{invite.email}</p>
                      {inviteGroup ? (
                        <p className="mt-2 flex items-center gap-2 text-[14px] text-ht-ink">
                          <Emblem
                            type={inviteGroup.group_type}
                            className="size-6"
                            glyphClassName="size-3.5"
                          />
                          <span className="truncate">{inviteGroup.name}</span>
                        </p>
                      ) : null}
                    </div>
                    <Pill tone="orange" className="shrink-0">
                      Pending
                    </Pill>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Group Summary</SectionTitle>
        <div className="mt-4 flex items-center gap-4">
          <Emblem type={group.group_type} />
          {/* Phones give the name its own line — sharing one with the pill and
              the roster count truncated it to a couple of characters. */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="w-full max-w-full truncate text-[19px] font-bold text-ht-ink sm:w-auto">
              {group.name}
            </h3>
            <Pill tone="orange">{typeLabel(group.group_type)}</Pill>
            <span className="ml-auto shrink-0 text-[15px] text-ht-ink">
              {rosterLabel(group)} players
            </span>
          </div>
        </div>
        {group.description ? (
          <p className="mt-4 border-t border-ht-line-soft pt-4 text-[15px] leading-6 text-ht-ink">
            {group.description}
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Actions</SectionTitle>
        <div className="mt-4 space-y-2.5">
          <PrimaryButton onClick={onSendAnother}>Send Another Request</PrimaryButton>
          <GhostButton onClick={onViewPending}>View Pending Requests</GhostButton>
        </div>
      </Card>
    </div>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  description,
  onClick,
  first,
}: {
  icon: LucideIcon
  label: string
  description: string
  onClick?: () => void
  first?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-ht-orange-tint/60',
        !first && 'border-t border-ht-line-soft',
      )}
    >
      <Icon className="size-6 shrink-0 text-ht-orange" strokeWidth={2} />
      <span className="ht-heading shrink-0 text-[16px] text-ht-ink">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-ht-muted">{description}</span>
      <ChevronRight className="size-5 shrink-0 text-ht-ink" strokeWidth={2} />
    </button>
  )
}

/**
 * The condensed MEMBERS / REQUESTS rows that close the phone layout of
 * ios/004-coach-teams-send-request-raw.png, where the desktop screen's two
 * full data tables collapse into a pair of tappable rows.
 *
 * MOUNT: components/teams/coach-groups-client.tsx — render this inside a
 * `lg:hidden` wrapper in place of the Members and Pending Requests table cards
 * (those cards get `hidden lg:flex`), wiring `onViewMembers` /
 * `onViewRequests` to setShowAllMembers / setShowAllRequests.
 */
export function CoachSummaryRows({
  memberCount,
  requestCount,
  onViewMembers,
  onViewRequests,
}: {
  memberCount: number
  requestCount: number
  onViewMembers?: () => void
  onViewRequests?: () => void
}) {
  return (
    <Card padded={false}>
      <SummaryRow
        first
        icon={Users}
        label={`Members (${memberCount})`}
        description="Accepted members in your groups"
        onClick={onViewMembers}
      />
      <SummaryRow
        icon={MailPlus}
        label={`Requests (${requestCount})`}
        description="Pending player invites"
        onClick={onViewRequests}
      />
    </Card>
  )
}
