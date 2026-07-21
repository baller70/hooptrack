'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AccountDeletion({ role }: { role: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
    return (
      <Button variant="outline" className="w-full gap-2 border-red-300 text-red-700 hover:bg-red-50" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete Account
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border-2 border-red-600 bg-red-50 p-4">
      <div>
        <h4 className="font-semibold text-red-900">Permanently delete this account</h4>
        <p className="mt-1 text-sm leading-6 text-red-800">
          {role === 'trainer'
            ? 'This removes your Coach profile, teams, invitations, messages, Coach-created training content, and recordings attached to that content. Connected Players keep their own accounts. This cannot be undone.'
            : 'This removes your profile, training history, videos, messages, team memberships, and stored files. This cannot be undone.'}
        </p>
      </div>
      <div>
        <Label htmlFor="delete-password">Current password</Label>
        <Input id="delete-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="delete-confirmation">Type DELETE to confirm</Label>
        <Input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Cancel</Button>
        <Button variant="destructive" onClick={deleteAccount} disabled={confirmation !== 'DELETE' || !password || deleting}>
          {deleting ? 'Deleting...' : 'Delete Permanently'}
        </Button>
      </div>
    </div>
  )
}
