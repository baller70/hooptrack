'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import AIProgressReport from '@/components/ai-progress-report'
import AccountDeletion from '@/components/account-deletion'
import Link from 'next/link'

interface UserInfo {
  id: number
  name: string
  email: string
  role: string
  ai_model?: string
  ai_credentials?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  
  // Settings UI State
  const [aiModel, setAiModel] = useState('Codex CLI')
  const [aiCreds, setAiCreds] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(async (d) => {
        setUser(d.user)
        if (d.user?.role !== 'trainer') return

        const settingsRes = await fetch('/api/users/settings', { cache: 'no-store' })
        if (!settingsRes.ok) return
        const settings = await settingsRes.json()
        if (settings.ai_model) setAiModel(settings.ai_model)
        if (settings.ai_credentials) {
          try {
            setAiCreds(
              typeof settings.ai_credentials === 'string'
                ? JSON.parse(settings.ai_credentials)
                : settings.ai_credentials
            )
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
  }

  async function handleSaveSettings() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_model: aiModel, ai_credentials: aiCreds })
      })
      if (!res.ok) throw new Error('Failed to save settings')
      toast.success('Settings saved successfully')
    } catch(err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return <div className="p-4 text-center">Loading...</div>

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h2 className="font-[family-name:var(--font-russo)] text-2xl">Profile</h2>

      <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-hoop-orange rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <p className="text-muted-foreground">{user.email}</p>
            <span className="text-xs bg-hoop-orange text-white px-2 py-0.5 rounded-full font-medium capitalize mt-1 inline-block">
              {user.role}
            </span>
          </div>
        </div>

        <Button onClick={handleLogout} variant="outline" className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-semibold">
          <Link href="/privacy" className="hover:text-hoop-orange">Privacy</Link>
          <Link href="/terms" className="hover:text-hoop-orange">Terms</Link>
          <Link href="/support" className="hover:text-hoop-orange">Support</Link>
        </div>
      </div>

      {user.role === 'trainer' && (
        <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-6 space-y-4">
          <h3 className="font-semibold text-xl">App Settings</h3>
          <p className="text-sm text-muted-foreground">Configure the AI Engine that powers your workout generations and progress reports.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">AI Engine</label>
              <select 
                value={aiModel} 
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full border-2 border-black rounded-md p-2 bg-gray-50 focus:bg-white"
              >
                <option value="Codex CLI">Codex CLI (Local)</option>
                <option value="OpenAI">OpenAI (GPT-4o)</option>
                <option value="Claude Code (API)">Anthropic (Claude 3 Haiku)</option>
                <option value="MiniMax">MiniMax</option>
                <option value="OpenRouter">OpenRouter</option>
                <option value="Local Model">Local Model (e.g. Ollama/Llama 3)</option>
              </select>
            </div>

            {aiModel === 'Codex CLI' && (
              <div>
                <label className="block text-sm font-medium mb-1">Codex CLI Path</label>
                <input 
                  type="text" 
                  value={aiCreds.codex_cli_path || ''} 
                  onChange={(e) => setAiCreds({...aiCreds, codex_cli_path: e.target.value})}
                  placeholder="/usr/bin/codex"
                  className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                />
              </div>
            )}

            {aiModel === 'OpenAI' && (
              <div>
                <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                <input 
                  type="password" 
                  value={aiCreds.openai_api_key || ''} 
                  onChange={(e) => setAiCreds({...aiCreds, openai_api_key: e.target.value})}
                  placeholder="sk-..."
                  className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                />
              </div>
            )}

            {aiModel === 'Claude Code (API)' && (
              <div>
                <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
                <input 
                  type="password" 
                  value={aiCreds.anthropic_api_key || ''} 
                  onChange={(e) => setAiCreds({...aiCreds, anthropic_api_key: e.target.value})}
                  placeholder="sk-ant-..."
                  className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                />
              </div>
            )}

            {aiModel === 'MiniMax' && (
              <div>
                <label className="block text-sm font-medium mb-1">MiniMax API Key</label>
                <input 
                  type="password" 
                  value={aiCreds.minimax_api_key || ''} 
                  onChange={(e) => setAiCreds({...aiCreds, minimax_api_key: e.target.value})}
                  placeholder="Paste MiniMax key here"
                  className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                />
              </div>
            )}

            {aiModel === 'OpenRouter' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">OpenRouter API Key</label>
                  <input 
                    type="password" 
                    value={aiCreds.openrouter_api_key || ''} 
                    onChange={(e) => setAiCreds({...aiCreds, openrouter_api_key: e.target.value})}
                    placeholder="sk-or-v1-..."
                    className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model Name</label>
                  <input 
                    type="text" 
                    value={aiCreds.openrouter_model || ''} 
                    onChange={(e) => setAiCreds({...aiCreds, openrouter_model: e.target.value})}
                    placeholder="anthropic/claude-3-haiku"
                    className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                  />
                </div>
              </>
            )}

            {aiModel === 'Local Model' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">OpenAI-Compatible Base URL</label>
                  <input 
                    type="text" 
                    value={aiCreds.local_base_url || ''} 
                    onChange={(e) => setAiCreds({...aiCreds, local_base_url: e.target.value})}
                    placeholder="http://localhost:11434/v1/chat/completions"
                    className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model Name</label>
                  <input 
                    type="text" 
                    value={aiCreds.local_model || ''} 
                    onChange={(e) => setAiCreds({...aiCreds, local_model: e.target.value})}
                    placeholder="llama3"
                    className="w-full border-2 border-black rounded-md p-2 font-mono text-sm"
                  />
                </div>
              </>
            )}

            <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* AI Progress Report */}
      {user.role === 'player' && (
        <>
          <div>
            <AIProgressReport />
          </div>
          <div className="space-y-3 rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#0A0A0A]">
            <h3 className="text-xl font-semibold">Account And Data</h3>
            <p className="text-sm leading-6 text-muted-foreground">Manage permanent removal of your HoopTrack account and associated content.</p>
            <AccountDeletion role={user.role} />
          </div>
        </>
      )}
    </div>
  )
}
