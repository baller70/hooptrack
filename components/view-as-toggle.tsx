'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, Eye, Loader2, Search, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: number
  name: string
  email?: string
  role: string
}

export default function ViewAsToggle({
  actualRole,
  isImpersonating,
}: {
  actualRole: string
  isImpersonating: boolean
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const navigationCountRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const email = u.email?.toLowerCase() || ''
      return u.name.toLowerCase().includes(q) || email.includes(q)
    })
  }, [query, users])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (actualRole !== 'trainer') return null

  async function loadUsers() {
    setLoading(true)
    try {
      const r = await fetch('/api/users/all-players', { cache: 'no-store' })
      if (!r.ok) throw new Error('Could not load players')
      const d = await r.json()
      setUsers(d.players || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load players')
    } finally {
      setLoading(false)
    }
  }

  function openPlayerPicker() {
    setOpen(true)
    setQuery('')
    void loadUsers()
  }

  function previewLandingPath() {
    const current = `${window.location.pathname}${window.location.search || ''}`
    window.sessionStorage.setItem('hooptrack_trainer_return_path', current)

    if (window.location.pathname.startsWith('/dashboard/activity')) return '/dashboard/progress'
    if (window.location.pathname.startsWith('/dashboard/players')) return '/dashboard/progress'
    if (window.location.pathname === '/dashboard/me') return '/dashboard/progress'

    return current || '/dashboard/progress'
  }

  function withFreshRequest(path: string) {
    navigationCountRef.current += 1
    return `${path}${path.includes('?') ? '&' : '?'}_t=${navigationCountRef.current}`
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
      toast.success(`Opening ${playerName}'s player app preview...`)
      const nextPath = previewLandingPath()
      window.location.assign(withFreshRequest(nextPath))
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
      const storedPath = window.sessionStorage.getItem('hooptrack_trainer_return_path')
      const fallback = '/dashboard/players'
      const nextPath = storedPath && storedPath.startsWith('/') ? storedPath : fallback
      window.location.assign(withFreshRequest(nextPath))
    } catch {
      setSwitching(null)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <div
        className="flex items-center rounded-lg border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_0px_#0A0A0A]"
        role="group"
        aria-label="Switch between trainer app and player app preview"
      >
        <button
          type="button"
          onClick={isImpersonating ? exitViewAs : undefined}
          disabled={!isImpersonating || switching === -1}
          className={`flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-all ${
            !isImpersonating
              ? 'bg-black text-white'
              : 'text-muted-foreground hover:bg-gray-100 disabled:opacity-60'
          }`}
          title={isImpersonating ? 'Return to trainer app' : 'You are already in the trainer app'}
        >
          {switching === -1 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRound className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">Trainer app</span>
          <span className="md:hidden">Trainer</span>
        </button>
        <button
          type="button"
          onClick={openPlayerPicker}
          className={`flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-all ${
            isImpersonating
              ? 'bg-orange-500 text-white'
              : 'text-muted-foreground hover:bg-orange-50'
          }`}
          title="Preview the app exactly as a player sees it"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Player app preview</span>
          <span className="md:hidden">Player</span>
        </button>
      </div>

      {open && (
        <div className="fixed left-3 right-3 top-24 z-50 max-h-[calc(100vh-7rem)] overflow-hidden rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#0A0A0A] md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-[min(92vw,360px)]">
          <div className="border-b-2 border-black bg-gray-50 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">Player app preview</p>
                <p className="text-xs text-muted-foreground">
                  Pick a player and the app will reload exactly as that player sees it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-white hover:text-black"
                aria-label="Close player preview menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isImpersonating && (
              <button
                type="button"
                onClick={exitViewAs}
                disabled={switching === -1}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 border-black bg-black px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {switching === -1 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
                Back to trainer app
              </button>
            )}
          </div>

          <div className="border-b border-gray-200 p-3">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search players"
                className="h-10 w-full rounded-md border-2 border-input bg-white pl-9 pr-3 text-sm outline-none focus:border-black"
              />
            </label>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <p className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading players...
              </p>
            )}
            {!loading && users.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No players found.</p>
            )}
            {!loading && users.length > 0 && filteredUsers.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No player matches that search.</p>
            )}
            {!loading && filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => viewAs(u.id, u.name)}
                disabled={switching === u.id}
                className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm hover:bg-orange-50 disabled:opacity-60 last:border-b-0"
              >
                {switching === u.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-600" />
                ) : (
                  <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.name}</span>
                  {u.email && <span className="block truncate text-xs text-muted-foreground">{u.email}</span>}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold capitalize text-muted-foreground">
                  {u.role}
                </span>
                {isImpersonating && switching !== u.id && <Check className="h-3.5 w-3.5 text-transparent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
