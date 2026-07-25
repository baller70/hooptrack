'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FIELD =
  'mt-2 w-full rounded-lg border border-ht-line bg-ht-surface px-3.5 py-2.5 text-[14px] text-ht-ink ' +
  'focus:border-ht-red focus:outline-none'

const LABEL = 'text-[14px] font-semibold text-ht-ink'

export default function AccountDeletion({
  open: openProp,
  onOpenChange,
}: {
  /** Omit to let the component render its own trigger button. Pass it to drive
   *  the panel from an outside control, e.g. the Me screen's Delete Account row. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const router = useRouter()
  const [openState, setOpenState] = useState(false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : openState
  const setOpen = (next: boolean) => {
    if (!controlled) setOpenState(next)
    onOpenChange?.(next)
  }
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function deleteAccount() {
    if (confirmation !== 'DELETE' || !password || deleting) return
    setDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Account deletion failed')
      toast.success('Your HoopTrack account and data were deleted')
      router.replace('/')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Account deletion failed')
    } finally {
      setDeleting(false)
    }
  }

  if (!open) {
    if (controlled) return null
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ht-heading flex w-full items-center justify-center gap-2 rounded-lg border border-ht-red/40 bg-ht-surface px-5 py-3 text-[15px] tracking-[0.02em] text-ht-red transition-colors hover:bg-ht-red-tint"
      >
        <Trash2 className="size-4" strokeWidth={2.2} />
        Delete Account
      </button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-ht-red/40 bg-ht-red-tint p-4">
      <div>
        <h4 className="ht-heading text-[15px] tracking-[0.01em] text-ht-red">
          Permanently delete this account
        </h4>
        <p className="mt-1.5 text-[14px] leading-6 text-ht-ink">
          This removes your profile, training history, videos, messages, team memberships, and stored files. This cannot be undone.
        </p>
      </div>
      <div>
        <label htmlFor="delete-password" className={LABEL}>Current password</label>
        <input id="delete-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={FIELD} />
      </div>
      <div>
        <label htmlFor="delete-confirmation" className={LABEL}>Type DELETE to confirm</label>
        <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className={FIELD} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={deleting}
          className="ht-heading flex-1 rounded-lg border border-ht-line bg-ht-surface px-4 py-2.5 text-[14px] tracking-[0.02em] text-ht-ink transition-colors hover:bg-ht-chip disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={confirmation !== 'DELETE' || !password || deleting}
          className={cn(
            'ht-heading flex-1 rounded-lg bg-ht-red px-4 py-2.5 text-[14px] tracking-[0.02em] text-white transition-opacity',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {deleting ? 'Deleting…' : 'Delete Permanently'}
        </button>
      </div>
    </div>
  )
}
