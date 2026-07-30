export type HoopAppBrand = 'coach' | 'player'

/**
 * Which wrapper app is asking.
 *
 * The two iOS apps are WKWebViews onto the same site, so a shared page like
 * the sign-in screen has no idea which one it is inside. The only thing that
 * tells them apart is the user agent each app sets — see
 * `applicationNameForUserAgent` in HooptrackCoach/Views/RootView.swift and
 * HooptrackPlayer/Views/RootView.swift.
 *
 * Returns null for a plain browser, where "HoopTrack" on its own is right.
 */
export function brandFromUserAgent(userAgent: string | null | undefined): HoopAppBrand | null {
  if (!userAgent) return null
  if (userAgent.includes('HoopTrackCoach')) return 'coach'
  if (userAgent.includes('HoopTrackPlayer')) return 'player'
  return null
}

export function brandWordmark(brand: HoopAppBrand | null): string {
  if (brand === 'coach') return 'HoopTrack Coach'
  if (brand === 'player') return 'HoopTrack Player'
  return 'HoopTrack'
}
