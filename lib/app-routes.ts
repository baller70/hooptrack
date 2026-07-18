import type { UserPayload } from '@/lib/auth'

export type HoopApp = 'player' | 'coach'
export type HoopRole = UserPayload['role']

export function appForRole(role: HoopRole): HoopApp {
  return role === 'trainer' ? 'coach' : 'player'
}

export function appBaseForRole(role: HoopRole): '/player' | '/coach' {
  return appForRole(role) === 'coach' ? '/coach' : '/player'
}

export function appHomeForRole(role: HoopRole): '/player' | '/coach' {
  return appBaseForRole(role)
}

export function dashboardPathForRole(role: HoopRole): string {
  return role === 'trainer' ? '/coach' : '/player'
}

export function appPath(app: HoopApp, path = ''): string {
  const base = app === 'coach' ? '/coach' : '/player'
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
