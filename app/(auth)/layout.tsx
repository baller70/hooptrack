import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { brandFromUserAgent } from '@/lib/app-brand'
import { AppBrandProvider } from '@/components/app-brand-provider'

/* Reading the user agent makes these routes dynamic, which is what we want:
 * sign-in and registration are per-request anyway. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const brand = brandFromUserAgent((await headers()).get('user-agent'))
  return <AppBrandProvider brand={brand}>{children}</AppBrandProvider>
}
