'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { appHomeForRole } from '@/lib/app-routes'
import { brandWordmark } from '@/lib/app-brand'
import { useAppBrand } from '@/components/app-brand-provider'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.literal('player'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const brand = useAppBrand()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'player' },
  })

  async function onSubmit(data: RegisterForm) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        // "Email already registered" on its own leaves people retyping the
        // same address. Say what to do about it.
        toast.error(
          res.status === 409
            ? 'That email already has an account. Use a different address — an email can only belong to one account.'
            : json.error || 'Registration failed',
        )
        return
      }
      toast.success('Account created!')
      router.push(appHomeForRole(json.user.role))
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] p-8">
        <h1 className="font-[family-name:var(--font-russo)] text-3xl text-center mb-2">
          {brandWordmark(brand)}
        </h1>
        <p className="text-center text-muted-foreground mb-8">Create your player account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            {/* The unique-email rule is invisible until it rejects you, and the
             * likeliest person to hit it is a coach who already has an account
             * and is reaching for the same address again. */}
            <p className="text-sm text-muted-foreground mt-1">
              Use an address that isn&apos;t already registered. Each email belongs to one account,
              so a coach&apos;s email can&apos;t also be a player.
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <input type="hidden" value="player" {...register('role')} />
            {/* Say what this form *does* create, not only what it can't. The
             * old copy read as "register as a trainer/administrator" and sent
             * people looking for a player sign-up that was already in front
             * of them. */}
            <p className="text-sm text-muted-foreground">
              This signs you up as a <span className="font-semibold">player</span>. Trainer accounts
              are created by an administrator.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-hoop-orange font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
