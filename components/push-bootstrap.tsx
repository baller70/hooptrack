'use client'

import { useEffect } from 'react'

// Registers the service worker on mount. Push subscription happens on user gesture in NotificationBell.
export default function PushBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.error('SW register failed:', err))
  }, [])

  return null
}
