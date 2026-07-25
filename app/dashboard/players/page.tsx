import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { PageTitle } from '@/components/ht/primitives'
import RosterList, { type RosterPlayer } from './roster-list'

/* Implements design/hooptrack-raw-individual-screens/ios/009-coach-roster-raw.png
 * and its at-capacity variant, states/002-coach-roster-full-raw.png. */

export default async function PlayersRosterPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'trainer') redirect('/player/progress')

  const players = db.prepare(`
    SELECT id, name, email, jersey_number, position, grade_level, roster_status, avatar_path
    FROM users WHERE role = 'player' ORDER BY name
  `).all() as Array<{
    id: number
    name: string
    email: string
    jersey_number: number | null
    position: string | null
    grade_level: string | null
    roster_status: string | null
    avatar_path: string | null
  }>


  const memberships = db.prepare(`
    SELECT m.player_id, g.name
    FROM coach_group_members m
    JOIN coach_groups g ON g.id = m.group_id
    WHERE g.coach_id = ? AND g.archived_at IS NULL
    ORDER BY g.name
  `).all(session.id) as Array<{ player_id: number; name: string }>

  const byPlayer = new Map<number, string[]>()
  for (const row of memberships) {
    const list = byPlayer.get(row.player_id) ?? []
    list.push(row.name)
    byPlayer.set(row.player_id, list)
  }


  const rosterPlayers: RosterPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    jerseyNumber: p.jersey_number,
    position: p.position,
    gradeLevel: p.grade_level,
    rosterStatus: p.roster_status,
    avatarPath: p.avatar_path,
    groupNames: (byPlayer.get(p.id) ?? []).join(' · '),
  }))

  return (
    <div className="pt-2">
      <PageTitle>Roster</PageTitle>

      {/* The roster-limit state lives on Teams, where the request form it locks
       * actually is — see states/002-coach-roster-full-raw.png. It used to be
       * duplicated here, which put the alert on a screen the design never
       * showed it on and away from the controls that resolve it. */}

      <RosterList players={rosterPlayers} />
    </div>
  )
}
