'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Bell,
  Brain,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Eye,
  FileText,
  Flame,
  LoaderCircle,
  LogOut,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import AccountDeletion from '@/components/account-deletion'
import { Avatar, Card, Initials, PageTitle, Pill } from '@/components/ht/primitives'

/* Implements design/hooptrack-raw-individual-screens/ios/
 * 012-player-profile-me-raw.png and .../ios/017-coach-settings-raw.png. */

interface UserInfo {
  id: number
  name: string
  email: string
  role: string
  actual_id?: number
  actual_role?: string
  actual_name?: string
  /** Placeholder or uploaded avatar, surfaced by /api/auth/me. */
  avatar_path?: string | null
}

type PlayerOption = { id: number; name: string; email?: string; role: string }

type PlayerProfile = {
  name: string
  email: string
  jersey_number: number | null
  position: string | null
  grade_level: string | null
  height: string | null
  class_year: string | null
  school: string | null
  roster_status: string
}

type PlayerStats = { recordings: number; completed: number; streak: number }

type CredentialField = { key: string; label: string; placeholder: string; secret?: boolean }

/* The `value` of each engine is persisted in users.ai_model — display labels can
 * change, these strings cannot. */
const AI_ENGINES: { value: string; label: string; fields: CredentialField[] }[] = [
  {
    value: 'Codex CLI',
    label: 'Codex CLI (Local)',
    fields: [{ key: 'codex_cli_path', label: 'Codex CLI Path', placeholder: '/usr/bin/codex' }],
  },
  {
    value: 'OpenAI',
    label: 'OpenAI (GPT-4o)',
    fields: [{ key: 'openai_api_key', label: 'OpenAI API Key', placeholder: 'sk-...', secret: true }],
  },
  {
    value: 'Claude Code (API)',
    label: 'Anthropic (Claude 3 Haiku)',
    fields: [{ key: 'anthropic_api_key', label: 'Anthropic API Key', placeholder: 'sk-ant-...', secret: true }],
  },
  {
    value: 'MiniMax',
    label: 'MiniMax',
    fields: [{ key: 'minimax_api_key', label: 'MiniMax API Key', placeholder: 'Paste MiniMax key here', secret: true }],
  },
  {
    value: 'OpenRouter',
    label: 'OpenRouter',
    fields: [
      { key: 'openrouter_api_key', label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...', secret: true },
      { key: 'openrouter_model', label: 'Model Name', placeholder: 'anthropic/claude-3-haiku' },
    ],
  },
  {
    value: 'Local Model',
    label: 'Local Model (e.g. Ollama/Llama 3)',
    fields: [
      { key: 'local_base_url', label: 'OpenAI-Compatible Base URL', placeholder: 'http://localhost:11434/v1/chat/completions' },
      { key: 'local_model', label: 'Model Name', placeholder: 'llama3' },
    ],
  },
]

const FIELD =
  'w-full rounded-lg border border-ht-line bg-ht-surface px-3.5 py-2.5 text-[14px] text-ht-ink ' +
  'placeholder:text-ht-muted/70 focus:border-ht-orange focus:outline-none disabled:opacity-60'

const ROW = 'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors'

/** lucide has no whistle glyph; the Trainer pill in 017 needs one. */
function WhistleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8.5" cy="13.5" r="5.5" />
      <circle cx="8.5" cy="13.5" r="1.4" />
      <path d="M14 11h6a1.5 1.5 0 0 1 0 3h-6" />
      <path d="M6.5 8.4V7a1.5 1.5 0 0 1 1.5-1.5h3.5" />
    </svg>
  )
}

/** Row of the settings lists: icon, label, trailing affordance. */
function SettingsRow({
  icon: Icon,
  label,
  description,
  condensed = false,
  trailing,
  href,
  onClick,
  first = false,
  ...props
}: {
  icon: LucideIcon
  label: string
  description?: string
  /** 017 sets its nav labels in the condensed heading face; 012 uses body sans. */
  condensed?: boolean
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
  first?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const body = (
    <>
      <Icon className="size-7 shrink-0 text-ht-ink" strokeWidth={1.6} />
      <span className="min-w-0 flex-1">
        {/* 017 lists every settings row's label and hint in full; these are
            short, fixed strings, so they wrap rather than clip. */}
        <span
          className={cn(
            'block text-ht-ink',
            condensed ? 'ht-heading text-[18px] tracking-[0.01em]' : 'text-[17px] font-semibold',
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[13px] leading-snug font-normal text-ht-muted">
            {description}
          </span>
        ) : null}
      </span>
      {trailing ?? <ChevronRight className="size-5 shrink-0 text-ht-ink" strokeWidth={2} />}
    </>
  )
  const classes = cn(ROW, 'hover:bg-ht-orange-tint/60', !first && 'border-t border-ht-line-soft')

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes} {...props}>
      {body}
    </button>
  )
}

/** Panel revealed under a SettingsRow. */
function Disclosure({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null
  return <div className="border-t border-ht-line-soft bg-ht-chip/30 px-5 py-4">{children}</div>
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ht-line-soft py-2 last:border-b-0">
      <span className="ht-heading shrink-0 text-[12px] tracking-[0.06em] text-ht-muted">{label}</span>
      <span className="min-w-0 text-right text-[13px] leading-snug text-ht-ink">{value}</span>
    </div>
  )
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        // inline-block matters: as a bare <span> inside a button (not a flex
        // item) the width/height would not apply and the track collapses to 0.
        'relative inline-block h-7 w-[46px] shrink-0 rounded-full transition-colors',
        on ? 'bg-ht-orange' : 'bg-ht-ring',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-all',
          on ? 'left-[20px]' : 'left-0.5',
        )}
      />
    </span>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[14px] font-semibold text-ht-ink">
      {children}
    </label>
  )
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

/** Browser push subscribe/unsubscribe against /api/push/subscribe. */
function usePushToggle() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setSupported(false)
        return
      }
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setEnabled(!!sub && Notification.permission === 'granted')
      } catch {
        if (!cancelled) setSupported(false)
      }
    }
    void read()
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()

      if (existing && enabled) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        })
        await existing.unsubscribe()
        setEnabled(false)
        toast.success('Push notifications turned off')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Your browser blocked notification permission')
        return
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('Push is not configured on this server')

      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }))
      const json = sub.toJSON()
      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          user_agent: navigator.userAgent,
        }),
      })
      if (!r.ok) throw new Error('Could not register this device')
      setEnabled(true)
      toast.success('Push notifications turned on')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change push notifications')
    } finally {
      setBusy(false)
    }
  }, [enabled])

  return { enabled, busy, supported, toggle }
}

/** Shared push row used by both screens' disclosure panels. */
function PushToggleRow({
  title,
  body,
  push,
}: {
  title: string
  body: string
  push: ReturnType<typeof usePushToggle>
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ht-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-5 text-ht-muted">
          {push.supported ? body : 'This browser does not support push notifications.'}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={push.enabled}
        aria-label={title}
        disabled={push.busy || !push.supported}
        onClick={() => void push.toggle()}
        className="inline-flex shrink-0 items-center disabled:opacity-50"
      >
        {push.busy ? (
          <LoaderCircle className="size-6 animate-spin text-ht-orange" />
        ) : (
          <Switch on={push.enabled} />
        )}
      </button>
    </div>
  )
}

/* ============================================================== Me (012) == */

function PlayerMe({ user, onSignOut }: { user: UserInfo; onSignOut: () => void }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [panel, setPanel] = useState<string | null>(null)
  const push = usePushToggle()

  useEffect(() => {
    fetch('/api/player/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setProfile(d.profile)
        setStats(d.stats)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not load your profile'))
  }, [])

  const toggle = (key: string) => setPanel((current) => (current === key ? null : key))

  /* 012 prints the position group — "Guard", not "SG" and not the full
     "Shooting Guard", which overflows a third of a phone screen. The group is
     the last word of the stored position; a bare abbreviation is passed
     through as-is for rosters that only store one. */
  const shortPosition = (value?: string | null) => {
    if (!value) return '—'
    const words = value.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '—'
    const last = words[words.length - 1]
    return last.length <= 3 ? last.toUpperCase() : last
  }

  const facts: Array<[string, string]> = [
    ['Position', shortPosition(profile?.position)],
    ['Height', profile?.height || '—'],
    ['Jersey', profile?.jersey_number == null ? '—' : String(profile.jersey_number)],
  ]

  const counters: Array<[LucideIcon, number, string]> = [
    [Activity, stats?.recordings ?? 0, 'Recordings'],
    [CircleCheck, stats?.completed ?? 0, 'Completed'],
    [Flame, stats?.streak ?? 0, 'Day Streak'],
  ]

  return (
    <>
      <PageTitle>Me</PageTitle>

      <Card padded={false} className="mt-5">
        <div className="flex items-center gap-4 px-5 pt-5">
          <Avatar name={user.name} src={user.avatar_path} size={68} />
          <div className="min-w-0 flex-1">
            {/* The account name is the one thing this card exists to state, so
                it wraps rather than ellipsising on a phone. */}
            <p className="text-[23px] font-bold leading-tight text-ht-ink">{user.name}</p>
            <p className="mt-1 truncate text-[15px] text-ht-muted">{user.email}</p>
            <p className="mt-1.5 text-[15px] text-ht-ink">
              {profile?.class_year ? `Class of ${profile.class_year}` : 'Class year not set'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 px-5 pb-5">
          {facts.map(([label, value], index) => (
            <div key={label} className={cn('text-center', index > 0 && 'border-l border-ht-line-soft')}>
              {/* ios/012 draws these labels in ink, darker than the email line
                  above — same treatment as StatCell's own stat labels. */}
              <div className="ht-heading text-[12px] tracking-[0.06em] text-ht-ink">{label}</div>
              <div className="mt-1.5 truncate text-[22px] font-semibold leading-none text-ht-orange">
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padded={false} className="mt-5">
        <div className="grid grid-cols-3 px-2 py-4">
          {counters.map(([Icon, value, label], index) => (
            <div
              key={label}
              className={cn(
                'flex items-center justify-center gap-2',
                index > 0 && 'border-l border-ht-line-soft',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ht-orange-soft">
                <Icon className="size-[17px] text-ht-orange" strokeWidth={2} />
              </span>
              <span>
                <span className="block text-[21px] font-bold leading-none text-ht-orange">{value}</span>
                <span className="mt-1 block whitespace-nowrap text-[12px] text-ht-ink">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card padded={false} className="mt-5">
        <SettingsRow
          first
          icon={UserRound}
          label="Account Settings"
          onClick={() => toggle('account')}
          aria-expanded={panel === 'account'}
        />
        <Disclosure open={panel === 'account'}>
          <DetailRow label="Name" value={profile?.name || user.name} />
          <DetailRow label="Email" value={profile?.email || user.email} />
          <DetailRow label="School" value={profile?.school || '—'} />
          <DetailRow label="Grade" value={profile?.grade_level || '—'} />
          <DetailRow label="Class Year" value={profile?.class_year || '—'} />
          <DetailRow label="Roster Status" value={profile?.roster_status || '—'} />
          <p className="mt-3 text-[13px] leading-5 text-ht-muted">
            Your coach maintains these roster details. Ask them to update anything that looks wrong.
          </p>
        </Disclosure>

        <SettingsRow
          icon={SlidersHorizontal}
          label="Preferences"
          onClick={() => toggle('prefs')}
          aria-expanded={panel === 'prefs'}
        />
        <Disclosure open={panel === 'prefs'}>
          <PushToggleRow
            title="Push notifications"
            body="Alerts for new workouts, requests and coach feedback on this device."
            push={push}
          />
        </Disclosure>

        <SettingsRow icon={Bell} label="Notifications" href="/player/notifications" />
        <SettingsRow icon={ShieldCheck} label="Privacy" href="/privacy" />
        <SettingsRow icon={CircleHelp} label="Support" href="/support" />
        <SettingsRow icon={FileText} label="Terms of Service" href="/terms" />

        <div className="p-3">
          <button
            type="button"
            onClick={() => toggle('delete')}
            aria-expanded={panel === 'delete'}
            className="flex w-full items-center gap-3.5 rounded-lg border border-ht-red/50 px-3 py-3 text-left transition-colors hover:bg-ht-red-tint"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ht-red-tint">
              <Trash2 className="size-[18px] text-ht-red" strokeWidth={2} />
            </span>
            <span className="flex-1 text-[16px] font-semibold text-ht-red">Delete Account</span>
            <ChevronRight className="size-5 shrink-0 text-ht-red" strokeWidth={2} />
          </button>
          {panel === 'delete' ? (
            <div className="mt-3">
              <AccountDeletion open onOpenChange={(next) => !next && setPanel(null)} />
            </div>
          ) : null}
        </div>
      </Card>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-5 w-full rounded-lg border border-ht-line bg-ht-surface py-3.5 text-[16px] text-ht-ink transition-colors hover:bg-ht-chip"
      >
        Sign Out
      </button>
    </>
  )
}

/* =================================================== Coach settings (017) == */

function CoachSettings({ user, onSignOut }: { user: UserInfo; onSignOut: () => void }) {
  const [panel, setPanel] = useState<string | null>(null)
  const [aiModel, setAiModel] = useState('Codex CLI')
  const [aiCreds, setAiCreds] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)
  const push = usePushToggle()

  const isImpersonating = !!user.actual_id

  useEffect(() => {
    fetch('/api/users/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => {
        if (!settings) return
        if (settings.ai_model) setAiModel(settings.ai_model)
        if (settings.ai_credentials) {
          setAiCreds(
            typeof settings.ai_credentials === 'string'
              ? JSON.parse(settings.ai_credentials)
              : settings.ai_credentials,
          )
        }
      })
      .catch(() => toast.error('Could not load your AI settings'))
  }, [])

  const toggle = (key: string) => setPanel((current) => (current === key ? null : key))

  async function handleSaveSettings() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_model: aiModel, ai_credentials: aiCreds }),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const loadPlayers = useCallback(async () => {
    setLoadingPlayers(true)
    try {
      const r = await fetch('/api/users/all-players', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load players')
      setPlayers(d.players || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load players')
    } finally {
      setLoadingPlayers(false)
    }
  }, [])

  function openPicker() {
    setPanel('picker')
    if (players.length === 0) void loadPlayers()
  }

  async function exitPreview() {
    setSwitching(-1)
    try {
      const r = await fetch('/api/auth/view-as', { method: 'DELETE' })
      if (!r.ok) throw new Error('Could not exit the player preview')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not exit the player preview')
      setSwitching(null)
    }
  }

  async function previewAs(player: PlayerOption) {
    setSwitching(player.id)
    try {
      const r = await fetch('/api/auth/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: player.id }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Could not start the player preview')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the player preview')
      setSwitching(null)
    }
  }

  const engine = AI_ENGINES.find((option) => option.value === aiModel)

  return (
    <>
      <PageTitle>Coach Settings</PageTitle>

      <Card padded={false} className="mt-5">
        <button
          type="button"
          onClick={() => toggle('account')}
          aria-expanded={panel === 'account'}
          className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-ht-orange-tint/60"
        >
          <Avatar name={user.name} src={user.avatar_path} size={68} />
          <span className="min-w-0 flex-1">
            {/* Wraps rather than clips: 017 shows the coach's full name. */}
            <span className="block text-[23px] font-bold leading-tight text-ht-ink">
              {user.name}
            </span>
            <span className="mt-1 block truncate text-[15px] text-ht-muted">{user.email}</span>
            <Pill tone="orange" className="mt-2.5 gap-1.5 px-3 py-1.5 text-[14px]">
              <WhistleIcon className="size-[18px]" />
              Trainer
            </Pill>
          </span>
          <ChevronRight className="size-6 shrink-0 text-ht-orange" strokeWidth={2.2} />
        </button>
        <Disclosure open={panel === 'account'}>
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Role" value="Trainer" />
          <DetailRow label="AI Engine" value={engine?.label ?? aiModel} />
        </Disclosure>
      </Card>

      <Card padded={false} className="mt-5">
        <button
          type="button"
          role="switch"
          aria-checked={isImpersonating}
          disabled={switching === -1}
          onClick={() => (isImpersonating ? void exitPreview() : openPicker())}
          className={cn(ROW, 'hover:bg-ht-orange-tint/60')}
        >
          <UserRound className="size-7 shrink-0 text-ht-orange" strokeWidth={1.7} />
          <span className="min-w-0 flex-1">
            <span className="ht-heading block truncate text-[18px] tracking-[0.01em] text-ht-ink">
              View as player
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ht-muted">
              {isImpersonating ? `Previewing as ${user.name}` : 'Preview the player experience'}
            </span>
          </span>
          {switching === -1 ? (
            <LoaderCircle className="size-6 shrink-0 animate-spin text-ht-orange" />
          ) : (
            <Switch on={isImpersonating} />
          )}
        </button>

        <SettingsRow
          condensed
          icon={Users}
          label="Select player"
          onClick={() => (panel === 'picker' ? setPanel(null) : openPicker())}
          aria-expanded={panel === 'picker'}
        />
        {panel === 'picker' ? (
          <div className="border-t border-ht-line-soft">
            {loadingPlayers ? (
              <p className="px-5 py-4 text-[14px] text-ht-muted">Loading players…</p>
            ) : players.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-ht-muted">No player accounts yet.</p>
            ) : (
              players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => void previewAs(player)}
                  disabled={switching !== null}
                  className="flex w-full items-center gap-3 border-t border-ht-line-soft px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-ht-orange-tint/60 disabled:opacity-60"
                >
                  <Initials name={player.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ht-ink">{player.name}</span>
                    {player.email ? (
                      <span className="block truncate text-[12.5px] text-ht-muted">{player.email}</span>
                    ) : null}
                  </span>
                  {switching === player.id ? (
                    <LoaderCircle className="size-4 shrink-0 animate-spin text-ht-orange" />
                  ) : (
                    <Eye className="size-4 shrink-0 text-ht-muted" strokeWidth={2} />
                  )}
                </button>
              ))
            )}
          </div>
        ) : null}
      </Card>

      <Card padded={false} className="mt-5">
        <SettingsRow
          first
          condensed
          icon={Brain}
          label="AI model settings"
          onClick={() => toggle('ai')}
          aria-expanded={panel === 'ai'}
        />
        <Disclosure open={panel === 'ai'}>
          <p className="text-[14px] leading-6 text-ht-muted">
            Configure the AI Engine that powers your workout generations and progress reports.
          </p>
          <div className="mt-3.5 space-y-3.5">
            <div>
              <FieldLabel htmlFor="ai-engine">AI Engine</FieldLabel>
              <select
                id="ai-engine"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className={cn(FIELD, 'mt-2')}
              >
                {AI_ENGINES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {engine?.fields.map((field) => (
              <div key={field.key}>
                <FieldLabel htmlFor={`cred-${field.key}`}>{field.label}</FieldLabel>
                <input
                  id={`cred-${field.key}`}
                  type={field.secret ? 'password' : 'text'}
                  value={aiCreds[field.key] || ''}
                  onChange={(e) => setAiCreds({ ...aiCreds, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className={cn(FIELD, 'mt-2')}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="ht-heading inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ht-orange px-5 py-3 text-[15px] tracking-[0.02em] text-white transition-colors hover:bg-ht-orange-hover disabled:opacity-60"
            >
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {isSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </Disclosure>

        <SettingsRow
          condensed
          icon={Bell}
          label="Push notifications"
          onClick={() => toggle('push')}
          aria-expanded={panel === 'push'}
        />
        <Disclosure open={panel === 'push'}>
          <PushToggleRow
            title="Push on this device"
            body="Player uploads, requests and reminders delivered to this browser."
            push={push}
          />
        </Disclosure>

        <SettingsRow
          condensed
          icon={Mail}
          label="Email notifications"
          onClick={() => toggle('email')}
          aria-expanded={panel === 'email'}
        />
        <Disclosure open={panel === 'email'}>
          <p className="text-[14px] leading-6 text-ht-muted">
            HoopTrack does not send email yet — every alert is delivered in the app and, when you
            turn it on above, as a push notification.
          </p>
          <Link
            href="/coach/notifications"
            className="ht-heading mt-3 inline-flex items-center gap-1.5 text-[13px] tracking-[0.04em] text-ht-orange hover:underline"
          >
            Open notifications
            <ChevronRight className="size-4" strokeWidth={2.5} />
          </Link>
        </Disclosure>

        <SettingsRow condensed icon={ShieldCheck} label="Privacy settings" href="/privacy" />
        <SettingsRow condensed icon={CircleHelp} label="Help and support" href="/support" />
        <SettingsRow condensed icon={FileText} label="Terms of service" href="/terms" />
      </Card>

      <button
        type="button"
        onClick={onSignOut}
        className="ht-heading mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ht-orange bg-ht-surface px-5 py-3.5 text-[15px] tracking-[0.02em] text-ht-orange transition-colors hover:bg-ht-orange-soft"
      >
        <LogOut className="size-[18px]" strokeWidth={2.2} />
        Sign Out
      </button>
    </>
  )
}

/* ============================================================ page shell == */

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => toast.error('Could not load your profile'))
  }, [])

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <div className="w-full max-w-2xl pt-4 lg:pt-2">
      {user === null ? (
        <p className="px-1 py-10 text-center text-[14px] text-ht-muted">Loading your profile…</p>
      ) : user.role === 'trainer' ? (
        <CoachSettings user={user} onSignOut={handleSignOut} />
      ) : (
        <PlayerMe user={user} onSignOut={handleSignOut} />
      )}
    </div>
  )
}
