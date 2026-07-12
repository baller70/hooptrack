import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()

  return Response.json({
    businessName: 'HoopTrack',
    teamName: 'HoopTrack',
    logoUrl: '/assets/brand/rise-is-one-logo.png',
    primaryColor: '#f97316',
    accentColor: '#111827',
    roleMode: 'basketball',
    terminology: {
      player: 'Player',
      players: 'Players',
      coach: 'Coach',
      coaches: 'Coaches',
      practice: 'Practice',
      practices: 'Practices',
      game: 'Game',
      games: 'Games',
      workout: 'Workout',
      workouts: 'Workouts',
      drill: 'Drill',
      drills: 'Drills',
    },
    defaults: {
      defaultPracticeLengthMin: 90,
      timezone: 'America/New_York',
      primaryGoal: 'Player development',
    },
    user: session
      ? {
          id: String(session.id),
          name: session.name,
          email: session.email,
          role: session.role,
        }
      : null,
    rev: 1,
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
