'use client'

import { useEffect, useState } from 'react'
import { Eye, Loader2, X, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'

interface User { id: number; name: string; role: string }

export default function ViewAsToggle({ actualRole, isImpersonating }: { actualRole: string; isImpersonating: boolean }) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)

  // Only the real trainer sees this
  if (actualRole !== 'trainer') return null

  async function loadUsers() {
    setLoading(true)
    try {
      const url = isImpersonating ? '/api/users/all-players' : '/api/users/contacts'
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) throw new Error('Could not load players')
      const d = await r.json()
      setUsers(d.contacts || d.players || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load players')
    } finally {
      setLoading(false)
    }
  }

  async function viewAs(playerId: number, playerName: string) {
    setSwitching(playerId)
    try {
      const r = await fetch('/api/auth/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: playerId }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(d.error || `Failed (HTTP ${r.status})`)
        setSwitching(null)
        return
      }
      toast.success(`Switching to ${playerName}'s view...`)
      // Bust any cache + hard reload from server
      window.location.href = '/dashboard/calendar?_t=' + Date.now()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to switch')
      setSwitching(null)
    }
  }

  async function exitViewAs() {
    setSwitching(-1)
    try {
      const r = await fetch('/api/auth/view-as', { method: 'DELETE' })
      if (!r.ok) {
        toast.error('Failed to exit')
        setSwitching(null)
        return
      }
      window.location.href = '/dashboard/calendar?_t=' + Date.now()
    } catch {
      setSwitching(null)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) loadUsers() }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border-2 transition-all ${
          isImpersonating
            ? 'bg-orange-500 text-white border-black shadow-[2px_2px_0px_0px_#0A0A0A] hover:opacity-90'
            : 'bg-black text-white border-black shadow-[2px_2px_0px_0px_#0A0A0A] hover:opacity-90'
        }`}
        title={isImpersonating ? 'Exit player preview' : 'Switch to player view'}
      >
        {isImpersonating ? <ArrowLeftRight className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isImpersonating ? 'PREVIEW' : 'VIEW AS PLAYER'}</span>
        <span className="sm:hidden">{isImpersonating ? 'Preview' : 'Player'}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 min-w-[260px] bg-white border-2 border-black rounded-md shadow-[3px_3px_0px_0px_#0A0A0A] z-50 max-h-80 overflow-y-auto">
          {!isImpersonating && (
            <p className="text-[11px] text-muted-foreground px-3 py-2 border-b-2 border-gray-100 bg-gray-50">
              Pick a player to see the app the way they do.
            </p>
          )}
          {isImpersonating && (
            <button
              onClick={exitViewAs}
              disabled={switching === -1}
              className="w-full text-left px-3 py-2.5 text-sm font-bold bg-orange-50 hover:bg-orange-100 border-b-2 border-orange-200 flex items-center gap-2 disabled:opacity-50"
            >
              {switching === -1 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Exit preview (back to trainer)
            </button>
          )}
          {loading && (
            <p className="text-xs text-muted-foreground p-3 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </p>
          )}
          {!loading && users.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">No players found.</p>
          )}
          {!loading && users.map((u) => (
            <button
              key={u.id}
              onClick={() => viewAs(u.id, u.name)}
              disabled={switching === u.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 flex items-center gap-1"
            >
              {switching === u.id ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />}
              <span>{u.name}</span>
              <span className="text-xs text-muted-foreground capitalize ml-auto">{u.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
