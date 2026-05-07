'use client'

import { useState } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  placeholder?: string
  maxLength?: number
  // Visual variants
  variant?: 'inline' | 'h2' | 'h4'
  iconOnly?: boolean
  className?: string
}

export default function InlineRename({
  value,
  onSave,
  placeholder = 'Enter name',
  maxLength = 200,
  variant = 'inline',
  iconOnly = false,
  className = '',
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  function start(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setDraft(value)
    setEditing(true)
  }

  async function save() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); save() }
    if (e.key === 'Escape') { setEditing(false); setDraft(value) }
  }

  const inputBase = 'rounded-md border-2 border-input bg-white px-2 py-1 outline-none focus:border-black'
  const inputClass = variant === 'h2' ? `${inputBase} text-2xl font-[family-name:var(--font-russo)]`
    : variant === 'h4' ? `${inputBase} text-base font-semibold`
    : `${inputBase} text-sm`

  if (editing) {
    return (
      <div className={`flex items-center gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`${inputClass} flex-1 min-w-0`}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); save() }}
          disabled={saving}
          className="p-1.5 rounded-md bg-black text-white hover:opacity-90 disabled:opacity-50 shrink-0"
          title="Save"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(false); setDraft(value) }}
          className="p-1.5 rounded-md hover:bg-gray-100 shrink-0"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      {!iconOnly && <span className="min-w-0 truncate">{value}</span>}
      <button
        type="button"
        onClick={(e) => start(e)}
        className="p-1 rounded-md hover:bg-gray-100 text-blue-700 shrink-0 opacity-60 group-hover:opacity-100"
        title="Rename"
        aria-label="Rename"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
