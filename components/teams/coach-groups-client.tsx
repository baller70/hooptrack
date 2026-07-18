'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, MailPlus, Plus, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

type GroupType = 'team' | 'training_session'

type Group = {
  id: number
  name: string
  group_type: GroupType
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

export default function CoachGroupsClient() {
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [inviteEmailByGroup, setInviteEmailByGroup] = useState<Record<number, string>>({})
  const [inviteMessageByGroup, setInviteMessageByGroup] = useState<Record<number, string>>({})
  const [sendingGroupId, setSendingGroupId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    group_type: 'team' as GroupType,
    player_limit: '',
    description: '',
  })

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

  const groupedMembers = useMemo(() => groupBy(members, (member) => member.group_id), [members])
  const groupedInvites = useMemo(() => groupBy(invites, (invite) => invite.group_id), [invites])

  async function createGroup() {
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

  async function sendInvite(groupId: number) {
    const email = inviteEmailByGroup[groupId]?.trim()
    if (!email) {
      toast.error('Enter the player email first')
      return
    }
    setSendingGroupId(groupId)
    try {
      const r = await fetch(`/api/coach/groups/${groupId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          message: inviteMessageByGroup[groupId] || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not send request')
      toast.success(`Request sent to ${d.player.name}`)
      setInviteEmailByGroup((current) => ({ ...current, [groupId]: '' }))
      setInviteMessageByGroup((current) => ({ ...current, [groupId]: '' }))
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send request')
    } finally {
      setSendingGroupId(null)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A]">
        <div className="border-b-2 border-black bg-[linear-gradient(135deg,#0A0A0A_0%,#1f2937_58%,#f97316_145%)] p-5 text-white">
          <h1 className="font-[family-name:var(--font-russo)] text-3xl leading-none">Teams And Training Sessions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            Create a team roster or a limited training group, then send player requests by email.
          </p>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="17U Rise Guards"
              />
            </div>
            <div>
              <Label htmlFor="group-type">Type</Label>
              <select
                id="group-type"
                value={form.group_type}
                onChange={(e) => setForm({ ...form, group_type: e.target.value as GroupType })}
                className="flex h-10 w-full rounded-md border-2 border-input bg-white px-3 py-2 text-sm"
              >
                <option value="team">Team</option>
                <option value="training_session">Training session</option>
              </select>
            </div>
            <div>
              <Label htmlFor="player-limit">Player limit</Label>
              <Input
                id="player-limit"
                inputMode="numeric"
                value={form.player_limit}
                onChange={(e) => setForm({ ...form, player_limit: e.target.value })}
                placeholder="1 for one-on-one, 12 for team"
              />
            </div>
            <div>
              <Label htmlFor="group-description">Description</Label>
              <Input
                id="group-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Saturday skill group"
              />
            </div>
          </div>
          <Button onClick={createGroup} disabled={creating || !form.name.trim()} className="min-h-11 self-end">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create group
          </Button>
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="rounded-lg border-2 border-black bg-white p-6 text-center text-sm text-muted-foreground shadow-[3px_3px_0px_0px_#0A0A0A]">
          Loading groups...
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-hoop-orange" />
          <h2 className="mt-3 font-semibold">No groups yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a team or training session to start sending player requests.</p>
        </div>
      )}

      <div className="grid gap-4">
        {groups.map((group) => {
          const groupMembers = groupedMembers.get(group.id) || []
          const groupInvites = groupedInvites.get(group.id) || []
          const pendingInvites = groupInvites.filter((invite) => invite.status === 'pending')
          const limitLabel = group.player_limit == null ? 'Open roster' : `${group.member_count}/${group.player_limit}`
          return (
            <section key={group.id} className="rounded-lg border-2 border-black bg-white shadow-[3px_3px_0px_0px_#0A0A0A]">
              <div className="flex flex-col gap-3 border-b-2 border-black p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[family-name:var(--font-russo)] text-2xl leading-none">{group.name}</h2>
                    <Badge>{group.group_type === 'team' ? 'Team' : 'Training session'}</Badge>
                  </div>
                  {group.description && <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>}
                </div>
                <div className="flex gap-2 text-sm">
                  <Badge variant="outline">{limitLabel}</Badge>
                  {pendingInvites.length > 0 && <Badge variant="outline">{pendingInvites.length} pending</Badge>}
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                  <RosterList title="Members" empty="No players have accepted yet." rows={groupMembers} />
                  <RosterList title="Requests" empty="No requests sent yet." rows={groupInvites} includeStatus />
                </div>

                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
                  <h3 className="font-semibold">Send request</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Enter an existing player account email. The player will see the request in their player app.
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor={`invite-email-${group.id}`}>Player email</Label>
                      <Input
                        id={`invite-email-${group.id}`}
                        type="email"
                        value={inviteEmailByGroup[group.id] || ''}
                        onChange={(e) => setInviteEmailByGroup((current) => ({ ...current, [group.id]: e.target.value }))}
                        placeholder="player@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`invite-message-${group.id}`}>Message</Label>
                      <Textarea
                        id={`invite-message-${group.id}`}
                        value={inviteMessageByGroup[group.id] || ''}
                        onChange={(e) => setInviteMessageByGroup((current) => ({ ...current, [group.id]: e.target.value }))}
                        placeholder="Join this group for weekly guard skill work."
                        rows={3}
                      />
                    </div>
                    <Button onClick={() => sendInvite(group.id)} disabled={sendingGroupId === group.id} className="w-full">
                      {sendingGroupId === group.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                      Send request
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function RosterList({
  title,
  empty,
  rows,
  includeStatus = false,
}: {
  title: string
  empty: string
  rows: Array<Member | Invite>
  includeStatus?: boolean
}) {
  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-gray-300 p-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-2 divide-y rounded-md border border-gray-200 bg-white">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.email}</p>
              </div>
              {includeStatus && 'status' in row && (
                <Badge variant={row.status === 'pending' ? 'default' : 'outline'}>{row.status}</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function groupBy<T>(items: T[], getKey: (item: T) => number) {
  const map = new Map<number, T[]>()
  for (const item of items) {
    const key = getKey(item)
    map.set(key, [...(map.get(key) || []), item])
  }
  return map
}
