import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HoopTrack',
    short_name: 'HoopTrack',
    description: 'Basketball accountability workout tracker',
    start_url: '/dashboard/calendar',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F97316',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
