# HoopTrack Object-Level Authorization Matrix

**Rule:** authentication establishes identity; it never grants access to an arbitrary object ID. Coach access to Player-owned objects requires at least one active accepted membership in a non-archived Coach-owned group. Player access is limited to self-owned objects and Coaches connected through an active accepted membership.

## Relationship and identity invariants

| Invariant | Enforcement |
| --- | --- |
| Player cannot invoke Coach mutations | Role checks plus integration tests |
| Coach cannot discover every Player | `/api/players` and `/api/users/contacts` join accepted active memberships |
| Player cannot discover every Coach | Contacts join accepted active memberships |
| Coach cannot read/mutate arbitrary Player object IDs | `canAccessPlayer` / `resolvePlayerId` relationship checks |
| Former relationship cannot continue messaging | Message list/read/send checks `usersShareActiveGroup` on every request |
| View-as cannot elevate Coach scope | `coachIdForSession` resolves the real Coach and applies membership scope |
| Unknown invite email does not reveal registration | Privacy-safe HTTP 202 response |
| Invitation IDs are recipient/owner scoped | Invite response binds `player_id`; revoke binds group and Coach owner |

## API matrix

| Resource / routes | Player | Coach | Negative checks |
| --- | --- | --- | --- |
| `/api/auth/*` | Own registration/session/logout | Own session/logout; Coach creation remains administrative | Weak/missing JWT; role swap; missing age/terms confirmation |
| `/api/account/delete` | Own account after password + `DELETE` | Own account after password + `DELETE`; Player accounts survive Coach deletion | View-as deletion; wrong password; cross-account content |
| `/api/coach/groups` | Forbidden | Only groups whose `coach_id` is the real Coach | Player role; other Coach group ID |
| `/api/coach/groups/:id/invites` | Forbidden | Create only in owned active group | Unknown email enumeration; full group; duplicate; rate limit |
| `/api/coach/groups/:id/invites/:inviteId` | Forbidden | Revoke only owned pending invitation in matching group | Other Coach; mismatched group/invite; answered/replayed invite |
| `/api/player/invites` | Only invitations addressed to own ID and own memberships | Forbidden | Other Player; expired pending invitation |
| `/api/player/invites/:id/respond` | Only intended own pending invitation | Forbidden | Other Player; expired/revoked/answered; capacity race |
| `/api/coach/groups/:id/members/:playerId` | Forbidden | Remove only membership in owned active group | Other Coach; wrong group/player |
| `/api/player/memberships/:id` | Leave only own membership | Forbidden | Other Player membership; missing membership |
| `/api/players` | Forbidden | Accepted Players connected to real Coach only | Unconnected Player excluded |
| `/api/players/:id/activity` | Own activity | Connected Player only | Guessed unconnected Player ID |
| `/api/activity` | Forbidden | Activity limited to accepted connected Players | Unconnected filter ID; empty roster |
| `/api/users/contacts` | Connected Coaches only | Connected Players only | Removed/left relationship excluded |
| `/api/messages` | Connected Coach only | Connected Player only | Arbitrary recipient; removed/left relation; block; unsafe body |
| `/api/messages/thread` | Participant context only | Own-created context or connected Player context only | Guessed context ID; removed membership; invalid attachment |
| `/api/recordings` | Own recordings | Connected Player recordings only | Arbitrary `playerId`; Coach with no relation |
| `/api/recordings/:id`, `/video`, `/clip`, `/upload` | Own recording | Connected Player recording only | Guessed recording ID; stale relationship; path traversal |
| `/api/schedule`, `/api/schedule/:id` | Own schedule/completion | Connected Player schedule only | Arbitrary `player_id`; other Player schedule ID |
| `/api/suite/calendar/*` | Own schedule | Connected Player schedules only | Guessed/unconnected Player; unscoped all-team export |
| `/api/progress/report`, `/api/ai/progress`, `/api/ai/moves` | Own metrics | Connected Player only | Arbitrary `playerId` |
| `/api/notifications` | Own notifications | Connected Player notifications only | Arbitrary `player_id`; other notification read ID |
| `/api/push/apns` | Own token under Player bundle only | Own token under Coach bundle only | Cross-role bundle; invalid token/environment |
| `/api/safety/block` | Own block relationship | Own block relationship | Self-block; unknown user; cross-user unblock |
| `/api/safety/report` | Message visible to reporter | Message visible to reporter | Other conversation message; own message |
| `/api/workouts`, `/api/workouts/:id` | Authenticated read of available library | Create; update/delete only own `created_by` objects | Other Coach mutation |
| `/api/drills` | No mutation | Mutate only drills under own workout | Other Coach workout/drill ID |
| `/api/moves`, `/api/moves/:id` | Read applicable library; no mutation | Create own; assign only connected Player; mutate own | Other Coach move; arbitrary assigned Player |
| `/api/quizzes`, `/api/quizzes/:id` | Authenticated read/attempt | Create/mutate own | Other Coach quiz |

## Automated evidence

`npm run test:mobile-readiness` currently exercises real Next.js handlers and isolated SQLite state for:

- Player→Coach role isolation.
- Non-enumerating invitations.
- Wrong-Coach invite revocation and member removal.
- Wrong-Player leave attempt.
- Coach/Player contacts and Coach Player-list membership scoping.
- Connected messaging and immediate denial after removal.
- Invitation expiry, replay, duplicate/capacity race behavior.
- APNs bundle/role binding.
- Coach deletion with Player-account retention.
- SQLite backup/restore integrity and schema preservation.

Every matrix row not covered by that integration harness remains a required negative test in the macOS/RC or backend security suite; the matrix is not a claim that untested rows pass.
