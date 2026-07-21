# HoopTrack App Store Submission Packet

**Status:** repository-prepared draft. Fields marked **EXTERNAL** require App Store Connect, legal, business, or final-RC evidence. Nothing in this file authorizes submission.

## Shared review explanation

HoopTrack ships as two focused applications backed by one service:

- **HoopTrack Player** works independently for basketball training, recording, schedules, quizzes, and progress. A Player may optionally accept an invitation from a Coach.
- **HoopTrack Coach** is for authorized Coach accounts. A Coach creates a team or training group and sends an invitation to an existing eligible Player email. The Coach receives Player access only after that Player affirmatively accepts. Players may decline, leave, report/block, or delete their account; Coaches may revoke an invitation or remove a Player.

Review must exercise both apps against the same review environment and seeded non-personal accounts.

## HoopTrack Player record

| Field | Draft / evidence |
| --- | --- |
| Name | HoopTrack Player |
| Bundle ID | `com.kevinhouston.hooptrackplayer` |
| Version/build | 1.0 (5 currently; final RC must use an approved monotonic build) |
| Primary category | Sports — **EXTERNAL approval** |
| Subtitle | Train, record, and track progress |
| Support URL | `https://hooptrack.194-146-12-139.sslip.io/support` — reachable, but branded-domain gate remains |
| Privacy URL | `https://hooptrack.194-146-12-139.sslip.io/privacy` — reachable, but branded-domain gate remains |
| Account | Player can register in-app; registration requires 13+ confirmation and Terms/Privacy acceptance |
| Account deletion | Profile → Delete Account; password and `DELETE` confirmation; deletes Player account/content |
| Encryption | `ITSAppUsesNonExemptEncryption=false`; **EXTERNAL export-compliance confirmation required** |

### Player description draft

HoopTrack Player helps basketball players organize training, complete workouts and skill studies, record practice video, follow a schedule, take basketball-IQ quizzes, and review progress. It works as a standalone training app. Players who choose to connect with a Coach can review and accept or decline team invitations, receive assignments, communicate with their connected Coach, and leave a team at any time.

Camera, microphone, and photo access are requested only when the Player chooses a recording or upload feature. Notifications are optional and can alert the Player to invitations, assignments, messages, and schedule updates.

### Player screenshot shot list

1. Standalone Today dashboard with the next training action.
2. Training library and workout detail.
3. Recording setup/capture with no private real-person content.
4. Progress report with representative fake data.
5. Invitation screen showing Coach identity and accept/decline.
6. Connected team/messages screen showing report/block controls.

## HoopTrack Coach record

| Field | Draft / evidence |
| --- | --- |
| Name | HoopTrack Coach |
| Bundle ID | `com.kevinhouston.hooptrackcoach` |
| Version/build | 1.0 (5 currently; final RC must use an approved monotonic build) |
| Primary category | Sports — **EXTERNAL approval** |
| Subtitle | Guide teams and player development |
| Support URL | Same reachable support URL; branded-domain gate remains |
| Privacy URL | Same reachable privacy URL; branded-domain gate remains |
| Account | Coach accounts are administratively provisioned; no public Coach signup |
| Account deletion | Native Account or web Profile → Delete Account; deletes Coach-owned teams/content while retaining Player accounts |
| Encryption | `ITSAppUsesNonExemptEncryption=false`; **EXTERNAL export-compliance confirmation required** |

### Coach description draft

HoopTrack Coach helps basketball Coaches organize accepted Players, create workouts and basketball-IQ activities, schedule development work, review submitted recordings, monitor progress, and communicate within an active team relationship. Coaches invite an existing Player by email; no Player data is available through that relationship until the intended Player accepts.

Coaches can withdraw pending invitations and remove Players. Player discovery, direct messaging, activity, schedules, recordings, progress, and notifications are scoped to accepted active memberships.

### Coach screenshot shot list

1. Coach dashboard with fake roster/activity summary.
2. Team creation, pending invitation, withdraw control, and accepted roster.
3. Workout creation/assignment.
4. Player recording review and feedback.
5. Player progress dashboard.
6. Connected messaging and safety controls.

## App Privacy draft reconciliation

Final answers must be completed separately in App Store Connect from RC traffic evidence. Current native manifests declare no tracking and app-functionality purposes for linked name, email, user ID, other user content, photos/video, and audio; each APNs-enabled app declares linked device ID. Verify server, web container, support, AI, logs, and all SDK behavior before answering.

- No third-party advertising is represented in current policy.
- No sale of personal data is represented in current policy.
- Tracking is declared false in native privacy manifests.
- User content includes messages, notes, attachments, recordings, photos/video, and audio.
- Device ID includes APNs device token when native notifications are enabled.
- Diagnostics and usage-data answers remain **EXTERNAL/RC TRAFFIC REVIEW** rather than assumed absent.

## App Review accounts and walkthrough

Store credentials only in `APP_REVIEW_DEMO_ACCOUNTS_JSON` in an approved CI/App Review secret store. Do not put values here.

1. Sign in to the seeded Coach account in HoopTrack Coach.
2. Open Teams, create or select the seeded review group, and send an invitation to the seeded Player email.
3. Open HoopTrack Player and sign in to the seeded Player account.
4. Open Team Requests, verify Coach identity/group details, and accept.
5. Return to Coach; verify Player appears in the roster.
6. Assign the seeded workout and schedule item.
7. Return to Player; open and complete the assignment and submit the provided safe sample recording.
8. Return to Coach; review the recording and send a message.
9. Return to Player; verify the message, report/block controls, and leave-team control.
10. Demonstrate account deletion only with disposable review accounts or a resettable seeded copy.

Provide Apple a short screen recording if any cross-app transition is non-obvious. Keep review services and accounts available throughout review, including weekends.

## TestFlight cohort matrix

| Cohort | Required coverage |
| --- | --- |
| Internal | Product/QA, both roles, clean install, upgrade, permissions, invitation lifecycle, account deletion |
| Standalone Player | No Coach relationship; complete training/recording/progress loop |
| Connected Player | Accept/decline, multiple groups, assignment, message, report/block, leave |
| Coach | Create group, invite/revoke, capacity, remove, content ownership, delete |
| Accessibility | VoiceOver, Dynamic Type, reduced motion, contrast, switch/keyboard where applicable |
| Device/network | Minimum/latest iOS, small/large screens, slow/flapping/offline, low storage, interrupted media |
| Safety/privacy | Non-enumeration, wrong IDs, revoked access, locked-screen preview, moderation path |

External TestFlight requires explicit approval and consented fake/non-sensitive data. A multi-day soak must cover invite expiry, APNs, schedule times, token refresh, media retry, backend compatibility, crashes, hangs, and deletion.

## External completion fields

- [ ] Branded production/support/privacy domain approved and configured.
- [ ] Legal entity, agreements, tax, banking, certificates, App IDs, and roles confirmed.
- [ ] Qualified legal/privacy review approves 13+ policy, Coach verification, retention, moderation, regions, and terms.
- [ ] Business owner confirms pricing, territories, monetization, and in-app-purchase answer.
- [ ] Final age-rating questionnaires completed from actual chat/AI/video/UGC behavior.
- [ ] Final App Privacy questionnaires reconciled to RC traffic.
- [ ] Export-compliance answer approved.
- [ ] Final screenshots captured from exact submitted builds in every required size.
- [ ] Durable review accounts and backend tested from an external network.
- [ ] Signed archives validated and uploaded; dSYMs/privacy reports retained.
- [ ] Internal and external TestFlight evidence accepted.
- [ ] Kevin explicitly approves each exact submission build.
- [ ] Apple approval recorded, then Kevin separately approves phased/manual release.
