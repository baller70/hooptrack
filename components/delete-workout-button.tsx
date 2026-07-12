'use client'

import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export default function DeleteWorkoutButton({
  workoutId,
  workoutTitle = 'this workout',
  afterDelete = 'redirect',
  className = '',
}: {
  workoutId: number
  workoutTitle?: string
  afterDelete?: 'redirect' | 'refresh'
  className?: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${workoutTitle}" and everything attached to it? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/workouts/${workoutId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete')
      }
      toast.success('Workout deleted')
      if (afterDelete === 'refresh') {
        router.refresh()
      } else {
        router.push('/dashboard/workouts')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-red-600 bg-red-600 text-white shadow-[2px_2px_0px_0px_#0A0A0A] hover:bg-red-700 disabled:opacity-60 ${className}`}
      aria-label={`Delete ${workoutTitle}`}
      title={`Delete ${workoutTitle}`}
    >
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
