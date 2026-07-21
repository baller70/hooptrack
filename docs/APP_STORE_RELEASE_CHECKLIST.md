# HoopTrack Coach + HoopTrack Player: App Store Release Checklist

**Status:** approval draft — this document authorizes no deployment or App Store submission.  
**Release scope:** two iOS apps, one shared service, and the complete Coach invitation → Player acceptance → coaching workflow.  
**Standard:** every required item has evidence, an owner, and a pass result before release. “It worked once” is not evidence.

> **How to use this document:** the actionable, line-by-line work list is in
> [`APP_STORE_EXECUTION_CHECKLIST.md`](./APP_STORE_EXECUTION_CHECKLIST.md). That file is the checklist I will execute and report against. This document defines the approvals, acceptance standard, and release gates.

## Approval boundary: no execution has started

This file is the proposed contract for the work. Creating or approving it does **not** mean that either app is ready, and it does not authorize a production deployment or App Store submission.

Until Kevin explicitly approves this checklist, I will not:

- change Coach or Player product behavior;
- create or alter production accounts, data, certificates, identifiers, secrets, or App Store Connect records;
- upload a build to TestFlight or App Store Connect;
- deploy or restart the shared backend; or
- mark any untested checklist item as passed.

Approval can be given with this exact statement:

> **I approve `docs/APP_STORE_RELEASE_CHECKLIST.md` as the release-readiness scope. Begin Phase 1 only. Do not deploy or submit either app without a later written approval.**

Approval starts **Phase 1 only**. Every later phase has its own stop point and evidence report. Kevin may add, remove, or revise checklist items before approval; after approval, scope changes are recorded in a dated change log rather than silently changing the standard.

## Execution contract: what I will deliver after approval

I will execute the work in the following order. I will stop at each approval point, report every failure rather than hiding it, and never interpret “mostly passed” as passed.

| Phase | Work I will perform | Concrete deliverable | Exit/stop rule |
| --- | --- | --- | --- |
| **1 — inventory and baseline** | Inspect both iOS targets, shared API/backend, data model, environments, signing/capabilities, dependencies, existing tests, legal/support surfaces, and App Store Connect configuration available to me | Versioned readiness report, system/data-flow diagrams, env-name inventory, feature parity matrix, test inventory, risk register, and prioritized defect backlog | Stop for Kevin to approve the findings and product decisions; no product fixes yet unless separately approved |
| **2 — safety and release design** | Specify account/role boundaries, invitation state machine, minor/guardian model, moderation/report/block flow, data retention/deletion, permissions, notification privacy, AI safeguards, staging, monitoring, backup, and rollback | Approved requirements and acceptance tests for every P0 boundary | Stop if age, guardian, coach trust, messaging, payments, or legal ownership remains undecided |
| **3 — implementation and automated tests** | Fix approved gaps in small reviewable commits; add unit, API-contract, integration, UI, cross-app, accessibility, migration, security, and recovery automation | Code review links, green CI evidence, traceability from every fix to checklist IDs, and updated risk register | No release candidate while any P0 fails; no unrelated redesigns |
| **4 — RC qualification** | Build signed release candidates on macOS/Xcode; test supported devices/iOS versions, real Coach↔Player flows, standalone Player, networking, media, push, performance, accessibility, privacy traffic, security, backup/restore, and rollback | Immutable RC build numbers, `.xcresult`/test reports, screenshots or recordings, archive validation, security/accessibility reports, and defect disposition | Stop and rebuild from Phase 3 after any code/config change; an untested rebuild never advances |
| **5 — TestFlight** | Run internal beta, then an approved external cohort using safe test data; monitor crashes, hangs, feedback, backend health, invitations, media, and notifications | Cohort/device matrix, feedback log, crash/metric report, soak-test evidence, and go/no-go recommendation | Stop for Kevin’s submission approval; TestFlight approval is not production approval |
| **6 — submission packet** | Prepare each app’s accurate metadata, screenshots, privacy/age-rating answers, export-compliance response, review notes, durable review accounts, and reviewer walkthrough | Two separately reviewed App Store Connect packets and a final evidence index | Kevin must explicitly approve submission; I will not press Submit without that approval |
| **7 — launch and aftercare** | After separate authorization, coordinate controlled/phased release, synthetic smoke tests, monitoring, support, incident response, pause/rollback decisions, and 24-hour/7-day reviews | Launch log, live health report, incident record if needed, and post-launch review | Pause rollout immediately when a defined P0 stop threshold is met |

### Accountability rules

- [ ] Every requirement and test receives a stable ID; each defect, commit, test result, and waiver links back to one or more IDs.
- [ ] I will provide a phase report containing: work completed, files changed, exact commands, pass/fail totals, evidence links, unresolved risks, decisions needed, and the exact next step.
- [ ] I will distinguish **verified**, **failed**, **blocked**, **not run**, and **not applicable**. “Blocked” and “not run” are never reported as passes.
- [ ] A failed test creates a defect with severity, reproduction steps, affected apps/builds, owner, and retest evidence.
- [ ] No checklist item is removed after approval without Kevin’s written agreement and a change-log entry explaining why.
- [ ] No P0/P1 waiver is implied. A waiver must name the risk, user impact, mitigation, expiration, and approving person.
- [ ] Credentials and external access supplied by Kevin are used only for the approved phase and never copied into source, reports, screenshots, or logs.
- [ ] I will not deploy, submit, release, purchase services, alter legal agreements, or make irreversible production changes without the separately required authorization.

### Master deliverables Kevin can hold me to

- [ ] Repository-specific readiness assessment—not a generic checklist.
- [ ] Coach and Player feature/parity inventory, including features unique to each app.
- [ ] Architecture, trust-boundary, and end-to-end data-flow diagrams.
- [ ] Data inventory and reconciliation against each app’s App Privacy answers and privacy manifest.
- [ ] Minor/guardian, coach trust, user-generated-content, messaging, report/block, and escalation design.
- [ ] Complete invitation lifecycle specification: create, deliver, view, accept, decline, expire, revoke, duplicate, replay, capacity race, leave, remove, and deletion.
- [ ] Automated unit, integration, API authorization, UI, accessibility, migration, offline, retry/idempotency, and cross-app tests.
- [ ] Real-device and OS support matrix with clean-install, upgrade, reinstall, denied-permission, low-resource, and interrupted-media results.
- [ ] Security threat model, dependency/SBOM results, secret scan, traffic inspection, object-level authorization tests, and independent penetration-test disposition.
- [ ] Performance/energy/accessibility reports with agreed measurable budgets, not subjective “looks good” statements.
- [ ] Staging/test-data plan, backup restore proof, monitoring/alerting, incident response, compatibility, feature-disable, and rollback rehearsal.
- [ ] Internal and external TestFlight evidence with crash/hang/feedback disposition.
- [ ] Separate, accurate App Store Connect packet for Coach and Player, including review credentials and an end-to-end reviewer walkthrough.
- [ ] Final traceability/evidence index and written go/no-go recommendation that lists every remaining risk.

## 1. Release decision and evidence rules

Apple review approval is a minimum bar, not the release bar. A release candidate (RC) ships only when:

- [ ] **P0 blockers are zero.** A P0 is a crash, data exposure/loss, broken login/deletion, child-safety failure, payment-policy issue, unusable primary workflow, or review-guideline violation.
- [ ] **P1 defects are zero or Kevin has accepted each one in writing.** P1 includes major workflow, accessibility, reliability, or device-specific failures with a workaround.
- [ ] Both apps pass the same RC build through automated tests, internal TestFlight, external TestFlight, and App Review; no untested rebuild is submitted.
- [ ] Every checklist row has `PASS / FAIL / N/A`, tester, date, build number, device/OS, and an evidence link (test report, screenshot/video, log, or App Store Connect record).
- [ ] “N/A” includes a written reason and reviewer approval.
- [ ] A named release owner, backup owner, incident owner, privacy contact, support contact, and rollback decision-maker are recorded.

Use this evidence record for each test:

```text
ID: HT-___  App/build: Coach|Player ___  Environment: ___
Device/OS: ___  Account/role: ___  Network state: ___
Expected: ___  Actual: ___  Result: PASS|FAIL|N/A
Evidence: ___  Tester/date: ___  Defect/waiver: ___
```

## 2. Approval gates

Do not advance a gate until its exit criteria are signed off.

| Gate | Exit criteria | Approver |
| --- | --- | --- |
| **G0 — checklist approval** | Kevin approves scope, supported ages, business model, account model, and release countries | Kevin |
| **G1 — product/privacy design** | Data map, child-safety model, retention, moderation, permissions, and legal text approved | Product + privacy/legal |
| **G2 — implementation complete** | No placeholder flows; test automation and telemetry implemented; release notes frozen | Engineering + QA |
| **G3 — RC qualification** | All automated, manual, accessibility, security, recovery, and two-app tests pass | QA + security |
| **G4 — TestFlight** | Internal then external cohort passes; feedback and crash regressions triaged | Product + QA |
| **G5 — submission ready** | Store metadata, privacy answers, review accounts, demo instructions, agreements, tax/banking, and export answers verified | Release owner |
| **G6 — launch** | Phased-release, support, monitoring, backup, incident, and rollback runbooks rehearsed | Kevin + release owner |

## 3. Decisions Kevin must approve at G0

- [ ] **Age audience:** decide whether children under 13 can create accounts, and the minimum age in every release country. Basketball players may be minors; do not infer consent from an email invitation.
- [ ] **Coach trust model:** decide who may call themselves a coach, whether identity/organization verification is required, and how abusive coaches are removed.
- [ ] **Parent/guardian model:** decide when verifiable guardian consent is required and how guardians can view, revoke, export, and delete a minor’s data.
- [ ] **Communication model:** approve coach/player messaging safeguards, attachment policy, reporting, blocking, moderation, retention, and escalation response time.
- [ ] **Business model:** declare whether subscriptions, paid digital coaching, team licenses, or external purchases exist. Digital features/content consumed in-app must be reviewed for Apple in-app-purchase requirements.
- [ ] **Account model:** confirm Player supports true standalone use and Coach requires a separate Coach account; document whether one person can hold both roles.
- [ ] **Regions/languages:** choose launch storefronts and supported languages; legal, safety, metadata, and support coverage must match.
- [ ] **App names/branding:** freeze “HoopTrack Coach” and “HoopTrack Player,” ownership of all art/text/video, bundle IDs, SKU naming, and trademark review.

## 4. Current repository baseline (not a certification)

The repository already contains two native SwiftUI targets with separate bundle identifiers, icons, privacy manifests, unit-test targets, UI-test targets, account deletion, a shared API, and Coach/Player team surfaces. These are useful foundations, but presence is not proof of production readiness.

Known items to resolve or prove during G1–G3:

- [ ] Build on a supported macOS/Xcode host. This Cloud environment is Linux and cannot execute `xcodebuild`, iOS Simulator, archive validation, signing, or TestFlight upload.
- [ ] Align the documented Node 22/npm 10 toolchain; the current Cloud host reports Node 20/npm 11.
- [ ] Restore or create the documented safe `.env.example`; it is referenced by project instructions but absent from this checkout.
- [ ] Prove production privacy/support URLs are stable branded HTTPS URLs; current iOS screens reference an `sslip.io` host.
- [ ] Verify Player signing/entitlements for APNs. Coach has an entitlement file; parity must be deliberately confirmed, not assumed.
- [ ] Replace screenshot/demo-fixture coverage as a quality proxy with real end-to-end backend tests. Factory scenes are for deterministic presentation, not cross-app correctness.
- [ ] Confirm tests cover registration, password recovery, invitation expiry/replay, revoke/leave/remove, moderation/report/block, account export, and destructive recovery; do not assume existing tests cover them.
- [ ] Inventory every production secret and runtime dependency without recording values in Git.

## 5. Apple policy and submission compliance

Verify against the live official documents on submission day because requirements change:

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Submitting apps to App Review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app-for-review)
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)
- [Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Age ratings](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating)
- [TestFlight](https://developer.apple.com/testflight/)
- [Accessibility evaluation](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels)

### App Review gate

- [ ] Review the full guidelines, with special attention to safety/user-generated content, privacy, kids, payments, login, minimum functionality, and accurate metadata.
- [ ] Apple Developer Program agreements are active; legal entity, contact, tax, banking, certificates, identifiers, and roles are valid.
- [ ] Each bundle ID, display name, version, monotonically increasing build number, signing team, provisioning profile, capabilities, and deployment target match App Store Connect.
- [ ] Archive uses the release configuration, production API, production APNs environment, no debug menus/demo data, no private APIs, and no non-public feature flags.
- [ ] Xcode Organizer validation passes for both archives; upload symbols and retain dSYMs for every RC.
- [ ] Export-compliance answers are confirmed by a qualified owner. Do not rely only on `ITSAppUsesNonExemptEncryption` without checking actual networking/cryptography.
- [ ] App Store age-rating answers reflect chat, AI output, web/video content, and user-generated recordings—not merely the intended audience.
- [ ] If the apps are for children or marketed in the Kids category, complete the separate Kids Category, parental-gate, advertising/analytics, and privacy review.
- [ ] All third-party SDK privacy manifests/signatures and required-reason API declarations are valid in the final archive.
- [ ] Review notes explain why there are two apps, how standalone Player works, the complete invitation workflow, camera/video use, notifications, AI features, and any feature needing special data.
- [ ] Provide durable review accounts for Coach and Player, seeded with safe realistic data, plus exact steps to invite/accept. Disable MFA/CAPTCHA only for those controlled review accounts if needed—never provide a personal account.
- [ ] Backend and review accounts remain available throughout review, including weekends; monitor them without collecting reviewer credentials or content.

## 6. Privacy, minors, safety, and user-generated content (P0)

### Data inventory and consent

- [ ] Map every data element from collection to device storage, transit, server/database/object storage, logs, analytics, AI provider, backups, support tools, export, and deletion.
- [ ] Classify name/email, age/birthdate, team membership, messages, video/audio/photos, notifications/device tokens, performance/health-adjacent metrics, identifiers, diagnostics, and inferred AI data.
- [ ] Record purpose, legal basis/consent, retention, access roles, processor, country/region, encryption, deletion SLA, and whether data is linked or used for tracking.
- [ ] App Store privacy answers for **each app** match actual app, server, SDK, and website behavior. Repeat packet inspection on the RC; never copy answers blindly between apps.
- [ ] Privacy policy names the controller, audience/minors model, collected data, purposes, sharing/processors, retention, security, user/guardian rights, deletion, contact, and change process.
- [ ] Permission prompts are just-in-time and accurately explain camera, microphone, photo library, and notifications. Denial leaves a useful fallback and Settings recovery path.
- [ ] No tracking occurs before valid consent where required; AppTrackingTransparency is used if and only if behavior meets Apple’s tracking definition.
- [ ] Sensitive content is excluded or redacted from analytics, crash logs, URLs, notification previews, console logs, support tickets, and AI prompts unless explicitly necessary and disclosed.

### Minor and coach/player safeguarding

- [ ] Age assurance and guardian consent are designed with privacy/legal review for every launch jurisdiction.
- [ ] A coach cannot discover arbitrary players, enumerate emails, join a Player, or see Player data without a valid invitation and affirmative acceptance.
- [ ] A Player sees coach identity, team, requested access, data implications, and decline option before accepting; no dark patterns or repeated harassment.
- [ ] Players/guardians can leave a team, revoke coach access, block/report a coach, and understand what historical data remains.
- [ ] Coaches can revoke pending invitations and remove a member; former coaches immediately lose access across API, caches, notifications, downloads, and deep links.
- [ ] Invitations are single-purpose, expiring, rate-limited, non-enumerating, bound to the intended account, auditable, and safe against forwarding, replay, races, and duplicate acceptance.
- [ ] Messages and attachments have report/block functions, published conduct rules, moderation/escalation, abuse contact, and timely removal/user-ban capability. Test grooming, harassment, spam, links, explicit text/media, impersonation, and retaliation scenarios.
- [ ] Notification previews do not expose a minor’s private message, video, schedule, or team on a locked device by default.
- [ ] Staff access is least-privilege and audited; child-safety incidents have preservation, escalation, notification, and lawful-reporting procedures reviewed by counsel.

### Account lifecycle

- [ ] Registration, verification, sign-in, sign-out, session expiry, password reset, credential stuffing defense, and locked/disabled accounts behave consistently in both apps.
- [ ] In-app account deletion is easy to find and deletes the account—not only local data. Confirm reauthentication, cancellation/subscription handling, completion receipt, retry/idempotency, and deletion across primary DB, files, AI data, push tokens, logs, processors, and backups under the stated policy.
- [ ] Export/access/correction requests include understandable data and do not expose another team member.
- [ ] Deleting a Coach, Player, team, message, recording, or invitation preserves only justified records and repairs references without orphaned access.

## 7. Canonical two-app acceptance matrix

Run each applicable case on iPhone, at least one supported older device/OS combination, latest iOS, small and large screens, light/dark mode, and degraded network. Include clean install, upgrade, and reinstall.

| ID | Scenario | Expected result |
| --- | --- | --- |
| HT-X01 | Player registers and never joins a team | All standalone training features work; no Coach dependency or empty-state dead end |
| HT-X02 | Coach signs into Player; Player signs into Coach | Role is safely rejected with a clear recovery path; no cross-role data leak |
| HT-X03 | Coach creates team and invites existing Player | One pending request appears only for intended Player; status is consistent in both apps |
| HT-X04 | Invite nonexistent, malformed, case-varied, or duplicate email | Privacy-safe response; no enumeration; retry and deduplication are deterministic |
| HT-X05 | Player accepts once / double taps / accepts on two devices | Exactly one membership; limits enforced atomically; both apps refresh correctly |
| HT-X06 | Player declines | No membership/access; Coach gets accurate status; reinvite policy is enforced |
| HT-X07 | Coach revokes before Player accepts | Acceptance is impossible; all devices converge to revoked state |
| HT-X08 | Invite expires while open or offline | No membership is created; clear refresh/reinvite path |
| HT-X09 | Team reaches capacity during acceptance race | Exactly the permitted count joins; losing request gets a safe actionable error |
| HT-X10 | Coach assigns workout/move/quiz/schedule | Correct Player receives exactly one item and notification with correct times/time zone |
| HT-X11 | Player completes/submits recording | Coach sees correct Player/content once; progress and status converge |
| HT-X12 | Coach comments/messages; Player replies | Authorized thread only, correct ordering, retries deduplicated, report/block works |
| HT-X13 | Player belongs to multiple teams/coaches | Data and conversations remain correctly scoped; no cross-team disclosure |
| HT-X14 | Player leaves / Coach removes Player | Access and new notifications cease immediately; retained history matches policy |
| HT-X15 | Account is deleted during pending upload/invite | Safe cancellation, no orphaned access/file, consistent status, useful confirmation |
| HT-X16 | Token expires during any mutation | No silent loss or duplicate; reauth returns user to a safe state |
| HT-X17 | Server returns 400/401/403/404/409/429/500 or malformed JSON | No crash; accurate non-sensitive error, retry behavior, and support path |
| HT-X18 | Offline/airplane mode/slow/flapping connection | Read states are labeled, writes queue or fail honestly, reconnect converges without duplicates |
| HT-X19 | Push denied, delayed, duplicated, tapped, or received logged out | App remains fully usable; routing is authorized; badges/read state reconcile |
| HT-X20 | Same account on two devices; logout/delete on one | Session policy is honored and revoked access cannot persist indefinitely |
| HT-X21 | Deep link/notification targets removed or unauthorized content | Authentication and authorization precede rendering; safe destination shown |
| HT-X22 | App upgrades with pending data and cached media | Migration preserves valid data and removes stale secrets/access safely |

## 8. Functional test suites

For **both** apps, test happy path, validation boundaries, cancellation, interruption, retry, duplicate input, concurrent action, stale data, authorization loss, and destructive recovery for every screen.

- [ ] **Onboarding/auth:** fresh install, registration where allowed, email normalization, password policy, password manager/AutoFill, keyboard navigation, failed login, recovery, session renewal, sign-out, deletion.
- [ ] **Coach:** dashboard, team create/edit/delete, limits, invite/revoke/reinvite, roster/remove, player details, assignments, calendar/time zones/DST, recordings/review/export, messages, notifications, AI workflows, account/legal/support.
- [ ] **Player standalone:** first useful action without coach, workouts/moves/quizzes, schedule, timer/background/interruption, capture/upload/playback/delete/export, progress, notifications, account/legal/support.
- [ ] **Player connected:** invitation accept/decline, membership list/leave, assignment receipt/completion, coach message/report/block, multiple coaches, revoked access.
- [ ] **Media:** camera/mic/photo permissions, interruption by call/lock/background, disk full, long/large/corrupt/unsupported files, upload resume/cancel, orientation, audio route, playback controls, metadata stripping, deletion, authorization.
- [ ] **AI:** empty/adversarial/personal-data prompts, unsafe or age-inappropriate output, hallucinated claims, timeouts/rate limits/provider outage, human-visible AI disclosure, retry/cost controls, reporting, and non-AI fallback. Do not present performance guidance as medical advice.
- [ ] **Localization/time:** every shipped language, truncation/pseudolocalization, pluralization, VoiceOver pronunciation, locale calendars/numbers, 12/24-hour time, DST crossings, travel, server/client clock skew.

## 9. Automation and continuous quality gate

- [ ] A clean macOS runner executes both schemes’ unit and UI tests on every pull request and protected release commit.
- [ ] Tests cover models/decoding, API request contracts, authentication/authorization, invitation state machine, team capacity races, deletion, notification routing, offline/retry/idempotency, migrations, and accessibility identifiers.
- [ ] UI tests use real interactions and assertions, not screenshots alone; add full Coach→Player cross-app tests against an isolated backend with fake accounts.
- [ ] Backend tests enforce object-level authorization for every Player/Coach/team/file/message endpoint. Include negative tests for guessed IDs and stale tokens.
- [ ] Web/shared backend runs lint, typecheck, build, integration tests, schema migrations, dependency/license audit, secret scan, SAST, and backup/restore test.
- [ ] CI archives release builds and runs `xcodebuild -exportArchive`/validation-equivalent checks without exposing signing secrets in logs.
- [ ] Flaky tests are defects: quarantine only with owner, issue, reason, and expiry; release suite has zero unexplained retries.
- [ ] Record code coverage trends for critical logic. Coverage percentage does not replace risk-based assertions.

Suggested macOS RC commands (scheme/destination may be adjusted and then frozen in CI):

```bash
xcodebuild -version
xcodebuild -project HooptrackCoach.xcodeproj -scheme HooptrackCoach -showdestinations
xcodebuild -project HooptrackPlayer.xcodeproj -scheme HooptrackPlayer -showdestinations
xcodebuild test -project HooptrackCoach.xcodeproj -scheme HooptrackCoach \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' -resultBundlePath artifacts/Coach.xcresult
xcodebuild test -project HooptrackPlayer.xcodeproj -scheme HooptrackPlayer \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' -resultBundlePath artifacts/Player.xcresult
npm ci
npm run lint
npm run typecheck
npm run build
```

## 10. Device, quality, accessibility, and resilience

- [ ] Test the minimum supported iOS and latest iOS on real devices, plus representative simulator/device sizes and hardware performance classes.
- [ ] Cold/warm launch, foreground/background, termination, memory warning, low storage, thermal pressure, battery use, rotation policy, phone call/audio interruption, and clock/time-zone changes pass.
- [ ] No crash, hang, watchdog termination, main-thread network/file work, runaway retry, excessive wakeup, or leaked media memory in Instruments runs.
- [ ] Set measurable budgets for launch, scrolling, API latency, media start/upload, CPU, memory, energy, binary/download size, and backend error rate; record p50/p95/p99 where meaningful.
- [ ] VoiceOver supports logical order, names/values/hints, headings, adjustable controls, error announcements, and no gesture-only operation.
- [ ] Dynamic Type through accessibility sizes, Bold Text, Button Shapes, Increase Contrast, Reduce Motion, Reduce Transparency, Differentiate Without Color, captions/transcripts, keyboard/switch control, RTL, and 44×44 point targets pass.
- [ ] Text/background and non-text contrast meet the chosen WCAG target; charts have textual equivalents and status never relies on color alone.
- [ ] Complete App Store accessibility nutrition-label answers only from tested evidence.
- [ ] Run crash-free TestFlight soak sessions and repeated core-loop/endurance tests; compare metrics to agreed thresholds.

## 11. Security verification

- [ ] Threat-model assets, actors, trust boundaries, minor/coach abuse cases, invitations, media, messages, AI, admin/support access, and lost/stolen devices.
- [ ] TLS is enforced with no arbitrary-load exception; validate hostname/certificate failures and proxy the RC to inventory all traffic.
- [ ] Credentials/tokens use Keychain with appropriate accessibility; no secrets or private content in UserDefaults, plist, source, screenshots, pasteboard, logs, caches, backups, or crash reports.
- [ ] Server authorizes every request independently of UI role; test horizontal/vertical privilege escalation, IDOR, mass assignment, injection, upload validation, path traversal, SSRF, rate limits, and enumeration.
- [ ] Media download/upload URLs are short-lived and scoped; validate type by content, size/duration limits, malware handling, metadata, storage ACLs, and deletion.
- [ ] Push payloads are minimal; device tokens are account/bundle/environment scoped and removed on logout/deletion/invalid-token feedback.
- [ ] Dependencies/SDKs are inventoried, patched, licensed, privacy-reviewed, and reproducibly locked; SBOM and vulnerability/secret scans are stored with RC evidence.
- [ ] Independent penetration test covers both apps and backend before public launch; remediate critical/high findings and retest.

## 12. Backend, operations, and disaster recovery

- [ ] Production and staging are isolated; TestFlight never needs production customer data. Seed fake Coach/Player pairs and deterministic teams/invitations.
- [ ] Database migrations are forward/backward compatible for phased mobile rollout and older supported app versions.
- [ ] Encrypted backups, restore procedure, retention, key ownership, RPO/RTO, and quarterly restore test are documented and demonstrated.
- [ ] Capacity/load tests cover login spikes, invitation bursts, media uploads/playback, notifications, AI provider limits, and team-wide assignments.
- [ ] Timeouts, bounded retries with jitter, idempotency keys, queues/dead-letter handling, circuit breakers, and reconciliation jobs are tested.
- [ ] Monitoring covers availability, latency, errors, auth anomalies, invite abuse, upload failures, push failures, AI failures/cost, storage, DB health, moderation queue, and deletion SLA—without sensitive payloads.
- [ ] Alerts have actionable thresholds, owners, escalation, dashboards, runbooks, and synthetic standalone + cross-app journeys.
- [ ] Incident response, privacy breach response, child-safety escalation, status communication, support macros, feature kill switches, and rollback are rehearsed.
- [ ] Mobile rollback acknowledges that installed binaries cannot be instantly recalled: server compatibility and remote disablement must keep old builds safe.

## 13. TestFlight program

- [ ] **Internal:** team tests clean install/upgrade, all P0 flows, analytics/crash symbols, production-like APNs, and review accounts.
- [ ] **External:** representative independent coaches, standalone players, connected players, guardians where applicable, accessibility users, devices/OS versions, networks, and regions test with consent and fake/non-sensitive data.
- [ ] Beta description states what to test, known issues, privacy/support contact, and how to report safety issues; no promises unsupported by the build.
- [ ] Run at least one multi-day soak including invite expiration, scheduled events, push delivery, token refresh, offline recovery, and backend deploy compatibility.
- [ ] Triage every crash, hang, feedback item, and metric regression. Close with evidence or explicitly accept before G5.

## 14. App Store Connect packet — separately for each app

- [ ] App name, subtitle, description, keywords, category, age rating, copyright, promotional text, version/release notes, support URL, marketing URL (if used), and privacy-policy URL are accurate and live.
- [ ] Screenshots show the actual submitted app on required device sizes, no debug/demo disclosure mistakes, no misleading features, correct status bars, legible content, and only licensed/non-private people/content.
- [ ] Coach listing says it is for coaches and requires a Coach account; Player listing prominently says it works standalone and optionally connects by invitation.
- [ ] App Review packet includes contact, durable Coach/Player credentials, seeded team, exact cross-app steps, feature notes, backend dependencies, permission explanations, and attachments/video if navigation is non-obvious.
- [ ] App Privacy and age-rating questionnaires are completed independently and reviewed against the RC network/data inventory.
- [ ] Pricing/availability, preorders, phased release, automatic release choice, territories, content rights, encryption/export compliance, and in-app purchases (if any) are approved.
- [ ] Support site has searchable help for registration, standalone use, invite/accept/decline/revoke/leave, permissions, uploads, notifications, password recovery, report/block, privacy/export/deletion, billing, and contact response expectations.
- [ ] Legal pages and support work without login on mobile, have branded durable domains, and contain no placeholders or broken links.

## 15. Final 48-hour launch checklist

- [ ] Freeze code/content/schema except approved RC fixes; tag source commit and record archive checksum, build IDs, dSYMs, privacy reports, test results, and store metadata snapshot.
- [ ] Re-run P0 smoke tests on downloaded TestFlight builds against production-like services—not only Xcode-installed builds.
- [ ] Verify production DNS/TLS, API, storage, email (if used), APNs, AI provider, quotas/billing, backups, monitoring, status page, support inbox, and on-call access.
- [ ] Confirm no production secrets are in Git, app bundle, CI artifacts/logs, screenshots, or review notes.
- [ ] Review database migration and server deployment/rollback order; confirm compatibility with current and previous mobile versions.
- [ ] Choose phased release and manual release by default for controlled launch; define pause thresholds for crashes, login, invites, uploads, safety, or privacy incidents.
- [ ] Staff monitoring and support for launch window; run synthetic Player standalone and Coach→Player journeys immediately before and after release.

## 16. Post-launch acceptance

- [ ] Watch App Store Connect diagnostics, MetricKit/crash reporting, backend SLOs, reviews, support, moderation, deletion queue, APNs, storage, and AI cost/quality.
- [ ] Pause phased release for any P0, privacy/safety signal, material crash regression, broken account flow, or broken invitation/authorization boundary.
- [ ] Confirm first real (consented) standalone and connected journeys succeed without inspecting private content.
- [ ] Publish known incident communications and fixes honestly; never ask users to disclose passwords, private videos, or children’s data in support tickets.
- [ ] Hold 24-hour and 7-day reviews; record defects, metrics, support themes, security signals, App Review feedback, and next patch decision.

## 17. Definition of “ready to submit”

Both apps are ready only when Kevin can open the evidence index and see:

1. G0–G5 approvals.
2. Two green archives from the same tagged source and backend contract.
3. Green automated and manual reports for both standalone Player and all cross-app scenarios.
4. Signed privacy/minor-safety/data-retention/moderation review.
5. Independent accessibility and security findings resolved or explicitly accepted.
6. Successful backup restore, incident drill, and rollback/compatibility rehearsal.
7. Complete, accurate, independently reviewed App Store Connect packets and functioning reviewer accounts.
8. Named launch/on-call/support owners with stop thresholds and authority.

Anything less is a beta candidate, not a professional production release.

## Approval and scope-change record

This table is intentionally blank until Kevin responds. A commit hash is recorded so the approved standard cannot later be confused with a different revision.

| Record | Date | Checklist commit | Decision or change | Approved by |
| --- | --- | --- | --- | --- |
| G0 checklist approval | _pending_ | _pending_ | _pending_ | Kevin |
| Scope change 1 | — | — | — | — |

### Phase 1 authorization check

- [ ] Kevin used the approval statement above, or gave an equally explicit written approval.
- [ ] The approved checklist commit hash is recorded in the table.
- [ ] Phase 1 access is limited to inventory/readiness work.
- [ ] Product changes, production changes, TestFlight uploads, App Store submission, and deployment remain unauthorized.
