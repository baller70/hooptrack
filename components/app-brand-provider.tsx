'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { HoopAppBrand } from '@/lib/app-brand'

/* Resolved on the server from the request's user agent, so the right wordmark
 * is in the first paint — a client-side navigator.userAgent check would flash
 * the generic name first. */
const AppBrandContext = createContext<HoopAppBrand | null>(null)

export function AppBrandProvider({
  brand,
  children,
}: {
  brand: HoopAppBrand | null
  children: ReactNode
}) {
  return <AppBrandContext.Provider value={brand}>{children}</AppBrandContext.Provider>
}

export function useAppBrand(): HoopAppBrand | null {
  return useContext(AppBrandContext)
}
