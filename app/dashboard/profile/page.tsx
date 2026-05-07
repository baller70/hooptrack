'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import AIProgressReport from '@/components/ai-progress-report'

interface UserInfo {
  id: number
  name: string
  email: string
  role: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).then(d => setUser(d.user)).catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
  }

  if (!user) return <div className="p-4 text-center">Loading...</div>

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="font-[family-name:var(--font-russo)] text-2xl mb-6">Profile</h2>

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
      </div>

      {/* AI Progress Report */}
      <div className="mt-6">
        <AIProgressReport />
      </div>
    </div>
  )
}
