import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig

// KC_RAM_OPTS_APPLIED 2026-05-24 — see /Users/kevinhouston/.claude/projects/-Users-kevinhouston/memory/ram-architecture-2026-05-24.md
// Memory optimizations applied via post-config patch (safer than editing the original config block).
declare const module: { exports?: unknown };
if (typeof module !== 'undefined' && module.exports) {
  const cfg = module.exports as Record<string, unknown> & { experimental?: Record<string, unknown> };
  cfg.productionBrowserSourceMaps = false;
  cfg.experimental = { ...(cfg.experimental || {}), serverSourceMaps: false, webpackMemoryOptimizations: true };
}
