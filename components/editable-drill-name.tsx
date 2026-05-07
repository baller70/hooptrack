'use client'

import { useState } from 'react'
import InlineRename from '@/components/inline-rename'
import { toast } from 'sonner'

export default function EditableDrillName({ drillId, initialName }: { drillId: number; initialName: string }) {
  const [name, setName] = useState(initialName)

  async function save(next: string) {
    const res = await fetch(`/api/drills`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drillId, name: next }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || 'Rename failed')
      return
    }
    setName(next)
    toast.success('Drill renamed')
  }

  return (
    <div className="flex items-center gap-2">
      <h4 className="font-semibold">{name}</h4>
      <InlineRename value={name} onSave={save} variant="h4" iconOnly />
    </div>
  )
}
