import type { NextConfig } from 'next'

const appRoot = __dirname

const securityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: appRoot,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    root: appRoot,
  },
  experimental: {
    serverSourceMaps: false,
    webpackMemoryOptimizations: true,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async rewrites() {
    return [
      { source: '/player/:path*', destination: '/dashboard/:path*' },
      { source: '/coach/:path*', destination: '/dashboard/:path*' },
    ]
  },
}

export default nextConfig
