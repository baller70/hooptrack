'use client'

import { useState } from 'react'
import InlineRename from '@/components/inline-rename'
import { toast } from 'sonner'

export default function EditableWorkoutTitle({ workoutId, initialTitle }: { workoutId: number; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle)

  async function save(next: string) {
    const res = await fetch(`/api/workouts/${workoutId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: next }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || 'Rename failed')
      return
    }
    setTitle(next)
    toast.success('Workout renamed')
  }

  return (
    <div className="flex items-center gap-2">
      <h2 className="font-[family-name:var(--font-russo)] text-2xl">{title}</h2>
      <InlineRename value={title} onSave={save} variant="h2" iconOnly />
    </div>
  )
}
