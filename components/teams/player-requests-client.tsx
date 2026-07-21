'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, LogOut, Loader2, RefreshCw, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Invite = {
  id: number
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  message: string | null
  created_at: string
  group_id: number
  group_name: string
  group_type: 'team' | 'training_session'
  player_limit: number | null
  coach_name: string
  coach_email: string
  member_count: number
}

type Membership = {
  id: number
  name: string
  group_type: 'team' | 'training_session'
  player_limit: number | null
  description: string | null
  joined_at: string
  coach_name: string
  member_count: number
}

export default function PlayerRequestsClient() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [answeringId, setAnsweringId] = useState<number | null>(null)
  const [leavingId, setLeavingId] = useState<number | null>(null)

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
      if (!r.ok) throw new Error(d.error || 'Could not answer request')
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not answer request')
    } finally {
      setAnsweringId(null)
    }
  }

  async function leaveMembership(membership: Membership) {
    if (!window.confirm(`Leave ${membership.name}? Your Coach will immediately lose access through this group.`)) return
    setLeavingId(membership.id)
    try {
      const response = await fetch(`/api/player/memberships/${membership.id}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not leave group')
      toast.success(`You left ${membership.name}`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not leave group')
    } finally {
      setLeavingId(null)
    }
  }

  const pending = invites.filter((invite) => invite.status === 'pending')
  const answered = invites.filter((invite) => invite.status !== 'pending')

  return (
    <div className="space-y-5">
      <section className="rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A]">
        <div className="border-b-2 border-black bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#ecfeff_100%)] p-5">
          <h1 className="font-[family-name:var(--font-russo)] text-3xl leading-none">Team Requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Accept a coach request to join a team or a training session. Decline anything that does not belong.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 p-4">
          <Badge variant="outline">{pending.length} pending</Badge>
          <Badge variant="outline">{memberships.length} active groups</Badge>
          <Button variant="outline" onClick={load} disabled={loading} className="ml-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      {loading && (
        <div className="rounded-lg border-2 border-black bg-white p-6 text-center text-sm text-muted-foreground shadow-[3px_3px_0px_0px_#0A0A0A]">
          Loading requests...
        </div>
      )}

      {!loading && pending.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-hoop-orange" />
          <h2 className="mt-3 font-semibold">No pending requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">Coach requests will show up here when they are sent.</p>
        </div>
      )}

      <div className="grid gap-4">
        {pending.map((invite) => (
          <section key={invite.id} className="rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#0A0A0A]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-[family-name:var(--font-russo)] text-2xl leading-none">{invite.group_name}</h2>
                  <Badge>{invite.group_type === 'team' ? 'Team' : 'Training session'}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  From {invite.coach_name} · {invite.member_count}{invite.player_limit ? `/${invite.player_limit}` : ''} players
                </p>
                {invite.message && <p className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">{invite.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => answer(invite.id, 'decline')} disabled={answeringId === invite.id}>
                  {answeringId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Decline
                </Button>
                <Button onClick={() => answer(invite.id, 'accept')} disabled={answeringId === invite.id}>
                  {answeringId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Accept
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {!loading && memberships.length > 0 && (
        <section className="rounded-lg border-2 border-black bg-white shadow-[3px_3px_0px_0px_#0A0A0A]">
          <div className="border-b-2 border-black p-4">
            <h2 className="font-[family-name:var(--font-russo)] text-2xl leading-none">My Teams And Sessions</h2>
          </div>
          <div className="divide-y">
            {memberships.map((membership) => (
              <div key={membership.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{membership.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {membership.group_type === 'team' ? 'Team' : 'Training session'} with {membership.coach_name}
                  </p>
                  {membership.description && <p className="mt-1 text-sm text-muted-foreground">{membership.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {membership.member_count}{membership.player_limit ? `/${membership.player_limit}` : ''} players
                  </Badge>
                  <Button variant="outline" onClick={() => leaveMembership(membership)} disabled={leavingId === membership.id}>
                    {leavingId === membership.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Leave
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && answered.length > 0 && (
        <section className="rounded-lg border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#0A0A0A]">
          <h2 className="font-[family-name:var(--font-russo)] text-xl leading-none">Answered Requests</h2>
          <div className="mt-3 grid gap-2">
            {answered.slice(0, 10).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 p-3 text-sm">
                <span>{invite.group_name}</span>
                <Badge variant="outline">{invite.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
