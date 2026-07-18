import path from 'path'

export function resolveInside(baseDir: string, candidate: string): string | null {
  const base = path.resolve(baseDir)
  const resolved = path.resolve(base, candidate)
  const relative = path.relative(base, resolved)
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return resolved
  }
  return null
}
