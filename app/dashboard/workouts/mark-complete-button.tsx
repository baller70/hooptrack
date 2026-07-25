'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GhostButton } from '@/components/ht/primitives'

/**
 * Height/type of the two actions closing the workout detail card. Kept in
 * sync with WORKOUT_ACTION in page.tsx, which cannot import it: a server
 * component importing a value from a 'use client' module receives a client
 * reference rather than the string.
 */
const WORKOUT_ACTION = 'py-4 text-[21px]'

/** MARK COMPLETE on the workout detail card — PUTs the schedule assignment. */
export default function MarkCompleteButton({
  scheduleId,
  className = WORKOUT_ACTION,
}: {
  scheduleId: number
  className?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [pending, startTransition] = useTransition()

  const markComplete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not mark this workout complete')
      }
      toast.success('Workout marked complete')
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not mark this workout complete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GhostButton
      onClick={markComplete}
      disabled={saving || pending}
      className={className}
    >
      {/* Preflight's `button { font: inherit }` outranks .ht-heading on the
          <button> itself, so the label carries the condensed face instead. */}
      <span className="ht-heading">{saving ? 'Saving…' : 'Mark Complete'}</span>
    </GhostButton>
  )
}
