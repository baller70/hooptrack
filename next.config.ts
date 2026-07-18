import type { NextConfig } from 'next'

const appRoot = __dirname

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
  async rewrites() {
    return [
      { source: '/player/:path*', destination: '/dashboard/:path*' },
      { source: '/coach/:path*', destination: '/dashboard/:path*' },
    ]
  },
}

export default nextConfig
