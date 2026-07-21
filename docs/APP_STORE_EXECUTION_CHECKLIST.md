# HoopTrack App Store Execution Checklist

**Purpose:** this is the atomic work list for HoopTrack Coach, HoopTrack Player, and their shared backend. It is not a list of topic headings. Each checkbox is an action I must perform or a result I must prove.  
**Current state:** all items are unverified until evidence is produced. An unchecked box does not mean failure; it means not yet proven.  
**Authorization:** approval of this checklist starts Phase 1 only. It does not authorize product changes, deployment, TestFlight upload, App Store submission, or release.

## How I will report every item

For every ID below I will record `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, or `N/A`, plus the date, app/build, environment, device/OS, exact command or manual steps, expected result, actual result, evidence link, defect ID, and retest result. I will never convert `BLOCKED` or `NOT RUN` to `PASS`.

---

## Phase 0 — approval and controls

- [ ] **HT-0001** Record Kevin's written approval and the exact approved checklist commit hash.
- [ ] **HT-0002** Record that approval authorizes Phase 1 inventory only.
- [ ] **HT-0003** Record the separate approvals required for code changes, TestFlight, submission, deployment, and release.
- [ ] **HT-0004** Name the product owner, engineering owner, QA owner, privacy/legal owner, safety owner, support owner, release owner, and incident commander.
- [ ] **HT-0005** Define P0, P1, P2, and P3 severity with response and release-blocking rules.
- [ ] **HT-0006** Create an evidence index keyed by every checklist ID.
- [ ] **HT-0007** Create a defect register with severity, reproduction, owner, target build, and retest evidence.
- [ ] **HT-0008** Create a decision log for age, guardian consent, coach verification, messaging, monetization, regions, and branding.
- [ ] **HT-0009** Create a scope-change log; record Kevin's approval before removing or weakening any item.
- [ ] **HT-0010** Confirm no real secret, private key, production user data, or reviewer password will enter Git or reports.

## Phase 1 — environment, repository, and access inventory

### Environment identity and safe access

- [ ] **HT-0101** Record repository, remote URL, branch, HEAD commit, working-tree status, and environment label.
- [ ] **HT-0102** Confirm GitHub read access by fetching the approved branch.
- [ ] **HT-0103** Confirm GitHub write/PR capability without pushing an unapproved product change.
- [ ] **HT-0104** Record macOS version, Xcode version, selected command-line tools, Swift version, and installed simulator runtimes on the native build host.
- [ ] **HT-0105** Record Node and npm versions and compare them with repository requirements.
- [ ] **HT-0106** Verify DNS and HTTPS access to GitHub, npm, Apple Developer, the production API, support URL, and privacy URL.
- [ ] **HT-0107** Run the approved Contabo bootstrap and verify only a temporary `/tmp` marker; do not deploy or restart anything.
- [ ] **HT-0108** Verify read-only existence of `/opt/apps`; do not write there.
- [ ] **HT-0109** Create/read/delete a marker in the approved Local Mac bridge path or record the missing connector exactly.
- [ ] **HT-0110** Inventory available Apple Developer and App Store Connect roles without exposing credentials.

### Repository map

- [ ] **HT-0111** Read all applicable `AGENTS.md` files before editing scoped files.
- [ ] **HT-0112** Inventory every Coach Swift source, resource, entitlement, test target, build phase, and scheme.
- [ ] **HT-0113** Inventory every Player Swift source, resource, entitlement, test target, build phase, and scheme.
- [ ] **HT-0114** Inventory shared backend routes used by Coach.
- [ ] **HT-0115** Inventory shared backend routes used by Player.
- [ ] **HT-0116** Map each native API method to its actual backend route and HTTP method.
- [ ] **HT-0117** List Coach-only, Player-only, shared, and missing-parity features.
- [ ] **HT-0118** List all app entry points, tabs, screens, dialogs, deep links, and notification destinations.
- [ ] **HT-0119** List all local persistence locations: Keychain, UserDefaults, files, caches, URL cache, and database usage.
- [ ] **HT-0120** List all server persistence: SQLite tables, uploaded media, logs, queues, backups, and third-party processors.
- [ ] **HT-0121** Inventory third-party Swift, Node, web, analytics, AI, push, storage, and operational dependencies.
- [ ] **HT-0122** Inventory every environment variable by name, required/optional status, consumer, and secret/public category.
- [ ] **HT-0123** Confirm `.env.example` exists and contains placeholders only; file a defect if absent or inaccurate.
- [ ] **HT-0124** Draw component, deployment, trust-boundary, and Coach↔Player sequence diagrams.
- [ ] **HT-0125** Produce a baseline risk register with likelihood, impact, mitigation, owner, and release gate.

### Clean baseline builds

- [ ] **HT-0126** Run a clean npm install from the lockfile and retain the log.
- [ ] **HT-0127** Run backend/web lint and retain the report.
- [ ] **HT-0128** Run backend/web typecheck and retain the report.
- [ ] **HT-0129** Run the production web/backend build with placeholder secrets and retain the report.
- [ ] **HT-0130** List Coach schemes and destinations with `xcodebuild`.
- [ ] **HT-0131** List Player schemes and destinations with `xcodebuild`.
- [ ] **HT-0132** Clean-build Coach Debug for a simulator.
- [ ] **HT-0133** Clean-build Player Debug for a simulator.
- [ ] **HT-0134** Clean-build Coach Release with signing disabled for compile verification.
- [ ] **HT-0135** Clean-build Player Release with signing disabled for compile verification.
- [ ] **HT-0136** Run all existing Coach unit tests and export `.xcresult`.
- [ ] **HT-0137** Run all existing Player unit tests and export `.xcresult`.
- [ ] **HT-0138** Run all existing Coach UI tests and export `.xcresult`.
- [ ] **HT-0139** Run all existing Player UI tests and export `.xcresult`.
- [ ] **HT-0140** Classify every warning, skipped test, flaky retry, crash, and failure from the baseline.

## Phase 2 — product, audience, and legal decisions

- [ ] **HT-0201** Record the minimum permitted Player age in every launch country.
- [ ] **HT-0202** Decide whether users under 13 may register.
- [ ] **HT-0203** Decide whether either app will be listed in Apple's Kids category.
- [ ] **HT-0204** Define how age is collected or assured without collecting unnecessary data.
- [ ] **HT-0205** Define when verifiable parent/guardian consent is required.
- [ ] **HT-0206** Define guardian rights to view, correct, export, revoke, and delete a minor's data.
- [ ] **HT-0207** Define who may create a Coach account.
- [ ] **HT-0208** Define coach identity, organization, or background verification requirements.
- [ ] **HT-0209** Define coach suspension, appeal, and permanent-ban procedures.
- [ ] **HT-0210** Define Player report, block, leave-team, and emergency safety paths.
- [ ] **HT-0211** Define allowed message types, links, images, videos, and attachments.
- [ ] **HT-0212** Define automated and human moderation rules and response times.
- [ ] **HT-0213** Define preservation and escalation for credible child-safety reports with qualified legal review.
- [ ] **HT-0214** Decide whether subscriptions, digital coaching, team licenses, ads, sponsorships, or external purchases exist.
- [ ] **HT-0215** Map every paid feature to Apple in-app-purchase requirements or a documented exception.
- [ ] **HT-0216** Confirm Player's promised standalone feature set without a Coach.
- [ ] **HT-0217** Confirm Coach account requirements and whether one human may hold both roles.
- [ ] **HT-0218** Freeze launch countries, languages, app names, bundle IDs, SKUs, categories, and copyright owner.
- [ ] **HT-0219** Verify ownership/licenses for logos, fonts, screenshots, music, videos, AI output, and sample content.
- [ ] **HT-0220** Obtain privacy/legal review of audience, consent, messaging, payments, privacy policy, terms, and retention.

## Phase 3 — Apple configuration and release identity

- [ ] **HT-0301** Verify Apple Developer Program membership, entity name, agreements, contacts, tax, and banking status.
- [ ] **HT-0302** Verify Coach App ID equals the release bundle identifier.
- [ ] **HT-0303** Verify Player App ID equals the release bundle identifier.
- [ ] **HT-0304** Verify Coach and Player display names are available and consistent everywhere.
- [ ] **HT-0305** Verify semantic version and monotonically increasing build number for each RC.
- [ ] **HT-0306** Verify Coach deployment target against the supported-device policy.
- [ ] **HT-0307** Verify Player deployment target against the supported-device policy.
- [ ] **HT-0308** Verify Coach signing team, certificate, provisioning profile, and Release signing settings.
- [ ] **HT-0309** Verify Player signing team, certificate, provisioning profile, and Release signing settings.
- [ ] **HT-0310** Diff Debug and Release settings for accidental debug flags or endpoints.
- [ ] **HT-0311** Verify Coach entitlements match capabilities actually used.
- [ ] **HT-0312** Verify Player entitlements match capabilities actually used, including APNs if notifications are supported.
- [ ] **HT-0313** Verify production APNs environment, topic/bundle ID, key/team ID, token registration, and invalid-token cleanup.
- [ ] **HT-0314** Verify all `Info.plist` permission strings are accurate, specific, localized, and exercised.
- [ ] **HT-0315** Verify each app icon slot, 1024px icon, transparency rule, rendering, and branding.
- [ ] **HT-0316** Verify launch appearance, display name, orientation, status bar, and device-family configuration.
- [ ] **HT-0317** Verify privacy manifests in the final archives, including third-party SDK manifests.
- [ ] **HT-0318** Inventory required-reason APIs and validate every declared reason against actual use.
- [ ] **HT-0319** Determine actual encryption usage and complete export-compliance analysis.
- [ ] **HT-0320** Validate both Release archives in Xcode Organizer and retain validation reports and dSYMs.

## Phase 4 — data privacy, account lifecycle, and safety

### Data map and privacy disclosures

- [ ] **HT-0401** Record every collected field for account, profile, team, invitation, assignment, message, video/audio, progress, notification, diagnostics, and AI.
- [ ] **HT-0402** For every field, record source, purpose, required/optional status, legal basis/consent, destination, processor, and retention.
- [ ] **HT-0403** For every field, record whether it is linked to identity, used for tracking, shared, sold, or used for advertising.
- [ ] **HT-0404** Trace every field through device, network, database, object storage, logs, analytics, AI provider, support, backup, export, and deletion.
- [ ] **HT-0405** Proxy Coach RC network traffic and inventory every host, request purpose, and transmitted field.
- [ ] **HT-0406** Proxy Player RC network traffic and inventory every host, request purpose, and transmitted field.
- [ ] **HT-0407** Reconcile Coach traffic and data map with Coach App Privacy answers.
- [ ] **HT-0408** Reconcile Player traffic and data map with Player App Privacy answers independently.
- [ ] **HT-0409** Reconcile both archives with their privacy manifests and required-reason declarations.
- [ ] **HT-0410** Verify privacy policy accurately states audience, data, purposes, processors, retention, rights, security, tracking, minors, and contact.
- [ ] **HT-0411** Verify privacy policy and terms are public, mobile-readable, branded HTTPS pages without login.
- [ ] **HT-0412** Verify support and privacy links work from signed builds and App Store metadata.

### Permissions and sensitive presentation

- [ ] **HT-0413** Test Coach first-use camera permission, denial, later enablement, and restricted-device behavior.
- [ ] **HT-0414** Test Coach first-use microphone permission, denial, later enablement, and restricted-device behavior.
- [ ] **HT-0415** Test Coach photo-library permission and limited-library behavior if used.
- [ ] **HT-0416** Test Coach notification permission before/after denial without blocking core use.
- [ ] **HT-0417** Repeat camera, microphone, photo-library, and notification permission tests in Player.
- [ ] **HT-0418** Verify permission prompts occur only at the feature that needs them.
- [ ] **HT-0419** Verify notification previews do not expose private minor, team, schedule, message, or video information.
- [ ] **HT-0420** Verify app-switcher snapshots obscure authentication and sensitive content where appropriate.
- [ ] **HT-0421** Verify logs, analytics, crash reports, URLs, pasteboard, caches, and support tools exclude secrets and private content.

### Account lifecycle

- [ ] **HT-0422** Test Player registration with valid, invalid, duplicate, case-varied, and whitespace-normalized email.
- [ ] **HT-0423** Test password policy boundaries without logging password values.
- [ ] **HT-0424** Test email verification if required, including expiry, replay, and change-email behavior.
- [ ] **HT-0425** Test login success, wrong password, unknown email, disabled account, rate limiting, and non-enumerating errors.
- [ ] **HT-0426** Test password reset request, expiry, replay, completion, and session invalidation.
- [ ] **HT-0427** Test password manager/AutoFill and keyboard submission in both apps.
- [ ] **HT-0428** Test logout removes local credentials, push association, cached private content, and authenticated back navigation.
- [ ] **HT-0429** Test session expiration during a read and during every critical write.
- [ ] **HT-0430** Test remote session revocation on a second device.
- [ ] **HT-0431** Test in-app deletion discovery and reauthentication in Coach.
- [ ] **HT-0432** Test in-app deletion discovery and reauthentication in Player.
- [ ] **HT-0433** Test deletion success across account, teams, invites, messages, files, progress, AI data, push tokens, processors, and stated backup policy.
- [ ] **HT-0434** Test deletion retry/idempotency after network loss or server error.
- [ ] **HT-0435** Test data export/access/correction and verify it excludes other users' data.

### Safety and moderation

- [ ] **HT-0436** Test report Coach, report Player, report message, and report attachment flows.
- [ ] **HT-0437** Test block and unblock behavior across messages, invites, discovery, and notifications.
- [ ] **HT-0438** Test moderation intake, evidence access controls, disposition, appeal, user notification, and audit log.
- [ ] **HT-0439** Test spam, harassment, grooming language, impersonation, explicit text/media, malicious links, and repeated invitations.
- [ ] **HT-0440** Verify published community/conduct rules and an immediately reachable safety contact.
- [ ] **HT-0441** Verify administrative access is least-privilege, MFA-protected, logged, reviewed, and revocable.
- [ ] **HT-0442** Exercise the child-safety escalation runbook using fake data.

## Phase 5 — Coach↔Player authorization and invitation lifecycle

- [ ] **HT-0501** Verify a Coach cannot sign into Player and obtain Player data.
- [ ] **HT-0502** Verify a Player cannot sign into Coach and obtain Coach capabilities.
- [ ] **HT-0503** Verify changing a client-side role value never changes server authorization.
- [ ] **HT-0504** Verify a Coach can create a valid team with permitted name, type, description, and capacity.
- [ ] **HT-0505** Verify invalid, empty, overlong, duplicate, and abusive team values are rejected safely.
- [ ] **HT-0506** Verify only the owning/authorized Coach can view or edit a team.
- [ ] **HT-0507** Verify Coach can invite an existing eligible Player by normalized email.
- [ ] **HT-0508** Verify invite response does not reveal whether an arbitrary email has an account.
- [ ] **HT-0509** Verify invite creation is rate-limited and protected from bulk abuse.
- [ ] **HT-0510** Verify duplicate pending invitations are deduplicated or explicitly resolved.
- [ ] **HT-0511** Verify invitation contains immutable intended Player, team, Coach, creation, expiry, status, and audit information.
- [ ] **HT-0512** Verify only the intended authenticated Player can view an invitation.
- [ ] **HT-0513** Verify Player sees Coach identity, team, requested relationship/data access, accept, and decline before deciding.
- [ ] **HT-0514** Verify acceptance creates exactly one membership and updates both apps.
- [ ] **HT-0515** Verify rapid double-tap acceptance creates exactly one membership.
- [ ] **HT-0516** Verify simultaneous acceptance on two devices creates exactly one membership.
- [ ] **HT-0517** Verify simultaneous last-capacity acceptance admits no more than the configured limit.
- [ ] **HT-0518** Verify declining creates no membership or Coach access and updates both apps.
- [ ] **HT-0519** Verify Coach can revoke a pending invite and Player can no longer accept it.
- [ ] **HT-0520** Verify expired invite cannot be accepted while displayed from stale cache.
- [ ] **HT-0521** Verify a copied/forwarded/replayed invite cannot join a different Player.
- [ ] **HT-0522** Verify reinvite rules after decline, revoke, and expiry.
- [ ] **HT-0523** Verify Player can belong to multiple teams without cross-team disclosure.
- [ ] **HT-0524** Verify Player can leave a team and new Coach access/notifications stop immediately.
- [ ] **HT-0525** Verify Coach can remove a Player and Player access/status updates immediately.
- [ ] **HT-0526** Verify deleting a team revokes team-scoped access and handles history per retention policy.
- [ ] **HT-0527** Verify deleting Coach handles teams, pending invites, memberships, content, and Player notification correctly.
- [ ] **HT-0528** Verify deleting Player handles memberships, pending invites, media, messages, and Coach views correctly.
- [ ] **HT-0529** Verify guessed team, Player, invite, message, recording, assignment, and file IDs return no unauthorized data.
- [ ] **HT-0530** Verify stale tokens, cached screens, deep links, and push links cannot bypass revoked access.

## Phase 6 — functional workflows

### Player standalone

- [ ] **HT-0601** Complete clean-install onboarding and first useful action without a Coach.
- [ ] **HT-0602** Verify standalone Player has no forced invitation, team, or Coach dependency.
- [ ] **HT-0603** Create/open/complete each supported standalone workout flow.
- [ ] **HT-0604** Create/open/complete each supported move flow.
- [ ] **HT-0605** Open/complete/score each supported quiz flow.
- [ ] **HT-0606** Create/open/complete schedule items across time zones and DST transitions.
- [ ] **HT-0607** Run each timer mode through start, pause, resume, background, interruption, and completion.
- [ ] **HT-0608** Capture, review, rename, upload, play, seek, export, and delete a recording.
- [ ] **HT-0609** Verify progress calculations and empty/partial/full progress states.
- [ ] **HT-0610** Verify every standalone empty, loading, error, retry, and offline state has an actionable path.

### Connected Player and Coach

- [ ] **HT-0611** Assign each supported workout type from Coach and receive the correct item in Player.
- [ ] **HT-0612** Assign each supported move type from Coach and receive the correct item in Player.
- [ ] **HT-0613** Assign each supported quiz/classroom item and receive/score it correctly in Player.
- [ ] **HT-0614** Assign each supported schedule/calendar item with correct date, time, zone, notes, and recipient.
- [ ] **HT-0615** Complete an assignment in Player and verify Coach status/progress updates once.
- [ ] **HT-0616** Submit a Player recording and verify Coach sees the correct Player, assignment, media, metadata, and authorization.
- [ ] **HT-0617** Review/comment/clip/export a recording in Coach and verify Player-visible results.
- [ ] **HT-0618** Send Coach→Player and Player→Coach messages with correct ordering, sender, thread, timestamp, and unread state.
- [ ] **HT-0619** Verify messages and attachments never appear in another team or Player thread.
- [ ] **HT-0620** Verify notification list, unread count, mark-one-read, mark-all-read, and badge reconciliation in both apps.

### Media, AI, failures, and recovery

- [ ] **HT-0621** Test camera/mic interruption by call, lock, background, route change, and app termination.
- [ ] **HT-0622** Test low storage, no storage, oversized, long, empty, corrupt, renamed, and unsupported media.
- [ ] **HT-0623** Test upload cancellation, timeout, retry, duplicate submission, resume, server rejection, and orphan cleanup.
- [ ] **HT-0624** Test playback with slow network, expired URL, missing file, range requests, rotation, mute, and external audio.
- [ ] **HT-0625** Verify exported/downloaded media remains authorized and uses accurate filenames/formats.
- [ ] **HT-0626** Test every AI workflow with normal, empty, overlong, adversarial, and personal-data input.
- [ ] **HT-0627** Test AI timeout, rate limit, malformed output, provider outage, unsafe output, and non-AI fallback.
- [ ] **HT-0628** Verify AI output is disclosed, reportable, age-appropriate, and not presented as medical advice.
- [ ] **HT-0629** Inject 400, 401, 403, 404, 409, 413, 422, 429, 500, timeout, disconnect, and malformed JSON into every API class.
- [ ] **HT-0630** Verify failures never crash, leak internals, silently lose user work, or duplicate completed mutations.
- [ ] **HT-0631** Test airplane mode at launch, during every critical read, and during every critical write.
- [ ] **HT-0632** Test slow, high-latency, packet-loss, and flapping connections.
- [ ] **HT-0633** Verify cached/offline data is labeled and reconnect converges to server truth.
- [ ] **HT-0634** Verify bounded retry/backoff and idempotency for invites, membership, assignments, messages, recordings, and deletion.
- [ ] **HT-0635** Test push allowed, denied, delayed, duplicated, tapped foreground/background/terminated, revoked access, and logged-out state.
- [ ] **HT-0636** Verify all deep links authenticate and authorize before rendering content.
- [ ] **HT-0637** Test clean install, upgrade from every supported prior schema/build, reinstall, and app-data restoration behavior.
- [ ] **HT-0638** Test same account on two devices with concurrent edits, logout, block, removal, and deletion.
- [ ] **HT-0639** Test locale, 12/24-hour clock, device/server clock skew, DST, and travel between time zones.
- [ ] **HT-0640** Test every shipped localization for missing keys, truncation, pluralization, formatting, and inappropriate fallback.

## Phase 7 — accessibility, usability, performance, and device quality

- [ ] **HT-0701** Define supported iPhone models, minimum iOS, latest iOS, screen sizes, and hardware performance classes.
- [ ] **HT-0702** Execute the P0 workflow on the minimum supported physical device/iOS.
- [ ] **HT-0703** Execute the P0 workflow on the latest physical device/iOS.
- [ ] **HT-0704** Execute the P0 workflow on smallest and largest supported screen sizes.
- [ ] **HT-0705** Verify portrait/landscape behavior matches declared support on every screen and media flow.
- [ ] **HT-0706** Audit every screen with VoiceOver for order, label, value, hint, heading, action, focus, and error announcement.
- [ ] **HT-0707** Complete every P0 workflow using VoiceOver without sight.
- [ ] **HT-0708** Test every screen at all Dynamic Type sizes, including accessibility sizes.
- [ ] **HT-0709** Test Bold Text, Button Shapes, Increase Contrast, Differentiate Without Color, Reduce Motion, and Reduce Transparency.
- [ ] **HT-0710** Verify all actionable controls have at least 44×44 point hit areas.
- [ ] **HT-0711** Measure text, control, focus, chart, and status contrast against the approved WCAG target.
- [ ] **HT-0712** Verify charts, icons, color statuses, video, and audio have textual/caption alternatives as applicable.
- [ ] **HT-0713** Test switch control, keyboard navigation, Full Keyboard Access, and assistive access where applicable.
- [ ] **HT-0714** Test light mode, dark mode, increased contrast, grayscale, and RTL layouts.
- [ ] **HT-0715** Conduct usability tests with representative independent Players, connected Players, Coaches, guardians, and accessibility users.
- [ ] **HT-0716** Measure cold/warm launch time and compare p50/p95 against an approved budget.
- [ ] **HT-0717** Measure scrolling/rendering responsiveness for largest realistic rosters, schedules, feeds, and media libraries.
- [ ] **HT-0718** Measure API, invite propagation, message delivery, progress refresh, media start, and upload p50/p95/p99.
- [ ] **HT-0719** Profile CPU, memory, leaks, hangs, main-thread stalls, disk, network, and energy with Instruments.
- [ ] **HT-0720** Test memory warning, thermal pressure, low battery, low storage, background/foreground, lock/unlock, and termination recovery.
- [ ] **HT-0721** Measure app archive, download, installed, cache, and user-media storage sizes against budgets.
- [ ] **HT-0722** Run repeated core loops and multi-hour soak tests without crash, hang, leak, duplication, or drift.
- [ ] **HT-0723** Complete Apple's accessibility nutrition-label assessment from actual test evidence.
- [ ] **HT-0724** Capture visual evidence for every App Store screenshot flow on the submitted RC.

## Phase 8 — security, backend, and operations

- [ ] **HT-0801** Threat-model users, minors, guardians, abusive coaches, outsiders, staff, lost devices, compromised accounts, and third parties.
- [ ] **HT-0802** Threat-model authentication, invitations, teams, messages, media, notifications, AI, admin tools, exports, and deletion.
- [ ] **HT-0803** Verify TLS for every endpoint and failure on invalid hostname, certificate, downgrade, and cleartext transport.
- [ ] **HT-0804** Verify credentials/tokens are stored only in appropriately configured Keychain items.
- [ ] **HT-0805** Verify tokens/private data are absent from UserDefaults, plist, source, binary strings, logs, caches, backups, screenshots, and pasteboard.
- [ ] **HT-0806** Test horizontal authorization for every resource ID and vertical authorization for every role-only operation.
- [ ] **HT-0807** Test injection, mass assignment, path traversal, SSRF, malicious URLs, oversized bodies, and content-type confusion.
- [ ] **HT-0808** Verify media type by content, size/duration limits, metadata handling, malware process, storage ACL, signed URL scope/expiry, and deletion.
- [ ] **HT-0809** Verify CSRF/cookie security for web endpoints used by the service and native token/session protections.
- [ ] **HT-0810** Verify rate limits for login, reset, register, invite, accept, message, report, upload, AI, export, and deletion.
- [ ] **HT-0811** Generate dependency inventory/SBOM for native and backend releases.
- [ ] **HT-0812** Run dependency vulnerability, secret, SAST, license, and malicious-package scans; triage every finding.
- [ ] **HT-0813** Verify dependency lockfiles, reproducible install, SDK privacy manifests, signatures, owners, and update plan.
- [ ] **HT-0814** Complete an independent penetration test of both apps and backend and retest fixed critical/high findings.
- [ ] **HT-0815** Build an isolated staging environment with fake Coach/Player data and no production customer data.
- [ ] **HT-0816** Test database migrations forward, rollback where supported, mixed mobile versions, failure recovery, and idempotency.
- [ ] **HT-0817** Test encrypted backup creation, access, retention, deletion, and full restore; record measured RPO/RTO.
- [ ] **HT-0818** Load-test login, invites, capacity races, assignments, messages, notifications, media, AI, and deletion.
- [ ] **HT-0819** Verify timeouts, bounded retries, queues, dead letters, circuit breakers, provider outages, and reconciliation jobs.
- [ ] **HT-0820** Create dashboards for availability, latency, errors, crashes, auth anomalies, invite abuse, uploads, push, AI, storage, DB, moderation, and deletion SLA.
- [ ] **HT-0821** Create actionable alerts with thresholds, owner, escalation, runbook, and test signal.
- [ ] **HT-0822** Create synthetic standalone Player and Coach→Player journeys and prove alerts detect failures.
- [ ] **HT-0823** Rehearse service incident, privacy breach, child-safety escalation, provider outage, database restore, and rollback using fake data.
- [ ] **HT-0824** Verify feature-disable controls and backend compatibility can protect already-installed old mobile builds.
- [ ] **HT-0825** Define support hours, safety response, escalation, status communication, and launch on-call schedule.

## Phase 9 — CI, release candidate, and traceability

- [ ] **HT-0901** Add or verify CI clean-install, lint, typecheck, build, integration, audit, and secret-scan gates.
- [ ] **HT-0902** Add or verify macOS CI for Coach build/unit/UI tests.
- [ ] **HT-0903** Add or verify macOS CI for Player build/unit/UI tests.
- [ ] **HT-0904** Add API-contract tests for every native endpoint and response/error decoder.
- [ ] **HT-0905** Add backend object-level authorization tests for every Coach/Player/team resource.
- [ ] **HT-0906** Add invitation state-machine tests for all HT-0507 through HT-0522 cases.
- [ ] **HT-0907** Add true cross-app tests using isolated Coach and Player accounts against staging.
- [ ] **HT-0908** Add account lifecycle, deletion, offline, retry/idempotency, migration, push-routing, accessibility, and deep-link tests.
- [ ] **HT-0909** Require protected checks before merging an approved release change.
- [ ] **HT-0910** Treat flaky tests as defects with owner and expiry; allow no unexplained RC retry.
- [ ] **HT-0911** Link every implemented change to checklist ID, defect, review, test, and retest evidence.
- [ ] **HT-0912** Freeze an RC source commit, backend contract/schema, dependency lockfiles, config version, and store content version.
- [ ] **HT-0913** Build signed Coach and Player RC archives from the same approved source/configuration.
- [ ] **HT-0914** Record commit, version/build, archive checksum, signing identity, provisioning profile, dSYMs, privacy report, and test bundle.
- [ ] **HT-0915** Download/install the distributed RC rather than relying only on Xcode-installed builds.
- [ ] **HT-0916** Re-run every P0 standalone and Coach↔Player test on the immutable distributed RC.
- [ ] **HT-0917** Rebuild and restart qualification from Phase 9 after any code, dependency, entitlement, signing, config, or backend-contract change.
- [ ] **HT-0918** Produce pass/fail totals, unresolved defects, waivers, metrics, evidence index, and written RC go/no-go recommendation.

## Phase 10 — TestFlight

- [ ] **HT-1001** Create internal TestFlight groups with least-privilege access and documented devices/roles.
- [ ] **HT-1002** Publish accurate beta notes, focus areas, known issues, privacy guidance, safety contact, and feedback instructions.
- [ ] **HT-1003** Verify Coach and Player TestFlight builds point to the approved environment and production-like APNs configuration.
- [ ] **HT-1004** Run internal clean-install, upgrade, login, standalone, invite, connected, media, push, report/block, and deletion tests.
- [ ] **HT-1005** Confirm crash/hang symbols resolve to the correct source for both builds.
- [ ] **HT-1006** Triage every internal crash, hang, feedback item, and metric regression.
- [ ] **HT-1007** Obtain approval before creating an external TestFlight cohort.
- [ ] **HT-1008** Recruit representative Coaches, standalone Players, connected Players, guardians where applicable, accessibility users, devices, OS versions, networks, and regions.
- [ ] **HT-1009** Use consented fake/non-sensitive beta data; do not use production children or customer content.
- [ ] **HT-1010** Run a multi-day external soak covering expiry, scheduled items, APNs, token refresh, offline recovery, media, and backend compatibility.
- [ ] **HT-1011** Record cohort/device coverage and every result in the evidence index.
- [ ] **HT-1012** Close or explicitly waive every beta defect with retest evidence and named approval.
- [ ] **HT-1013** Produce a TestFlight go/no-go report and stop for Kevin's submission approval.

## Phase 11 — App Store Connect packets

Complete every item separately for Coach and Player; copying an answer is not verification.

- [ ] **HT-1101** Verify app name, subtitle, description, promotional text, keywords, primary/secondary category, and copyright for Coach.
- [ ] **HT-1102** Verify the same metadata independently for Player and prominently state standalone capability.
- [ ] **HT-1103** Verify support, marketing if used, and privacy-policy URLs are branded, stable, public, mobile-readable HTTPS pages.
- [ ] **HT-1104** Capture required Coach screenshots from the submitted RC at each required display size.
- [ ] **HT-1105** Capture required Player screenshots from the submitted RC at each required display size.
- [ ] **HT-1106** Verify screenshots contain no debug UI, fake claim, private person/data, unlicensed content, wrong device frame, or unreleased feature.
- [ ] **HT-1107** Complete Coach App Privacy answers from HT-0401–HT-0409 evidence.
- [ ] **HT-1108** Complete Player App Privacy answers independently from HT-0401–HT-0409 evidence.
- [ ] **HT-1109** Complete each age-rating questionnaire based on chat, AI, web/video, user recordings, and actual safeguards.
- [ ] **HT-1110** Complete each export-compliance answer from HT-0319 evidence.
- [ ] **HT-1111** Configure price, availability, territories, phased/manual release, content rights, and IAP products if approved.
- [ ] **HT-1112** Verify all agreements, tax, banking, certificates, and App Store Connect warnings are resolved.
- [ ] **HT-1113** Create durable non-personal Coach and Player review accounts with safe seeded data.
- [ ] **HT-1114** Prove review accounts work from a fresh external network and require no inaccessible MFA/CAPTCHA step.
- [ ] **HT-1115** Write exact reviewer steps for Coach login, team create, invitation, Player login/accept, assignment, completion, recording, messaging, report/block, and deletion.
- [ ] **HT-1116** Explain two-app design, standalone Player, permissions, notifications, AI, media, moderation, and backend dependencies in review notes.
- [ ] **HT-1117** Record review contact who can answer Apple promptly throughout review, including weekends.
- [ ] **HT-1118** Keep backend, seeded data, review accounts, and support URLs monitored throughout review.
- [ ] **HT-1119** Independently proofread both packets against the exact submitted binaries.
- [ ] **HT-1120** Present both completed packets, evidence index, and remaining risks to Kevin; do not submit without written approval.

## Phase 12 — final launch, monitoring, and aftercare

- [ ] **HT-1201** Record Kevin's explicit approval to submit each named app/version/build.
- [ ] **HT-1202** Submit only the approved immutable builds and retain App Store Connect confirmation.
- [ ] **HT-1203** Answer App Review questions accurately and log every response or requested change.
- [ ] **HT-1204** Requalify any changed binary/configuration; never submit an untested replacement.
- [ ] **HT-1205** Record Apple approval for each app and verify approved binary/build numbers.
- [ ] **HT-1206** Record Kevin's separate explicit approval to release each app.
- [ ] **HT-1207** Verify production DNS/TLS, API, database, object storage, email if used, APNs, AI, quotas, billing, backups, dashboards, alerts, status, and support immediately before release.
- [ ] **HT-1208** Verify no secret appears in Git, app bundle, artifacts, logs, screenshots, review notes, or support content.
- [ ] **HT-1209** Confirm on-call staffing, incident commander, support coverage, escalation contacts, rollback/disable access, and pause authority.
- [ ] **HT-1210** Start manual/phased release according to the approved plan.
- [ ] **HT-1211** Run synthetic standalone Player and Coach→Player journeys immediately before and after availability.
- [ ] **HT-1212** Monitor crashes, hangs, login, invites, authorization, messages, uploads, push, AI, DB, storage, moderation, deletion, reviews, and support.
- [ ] **HT-1213** Pause phased release for any P0, privacy/safety signal, broken login/deletion/invitation, authorization leak, or material crash regression.
- [ ] **HT-1214** Execute incident communication, containment, feature disablement, server rollback, or emergency patch procedure when a stop threshold is met.
- [ ] **HT-1215** Verify first consented real standalone and connected journeys through metrics without inspecting private content.
- [ ] **HT-1216** Hold a 24-hour review and record metrics, defects, support, safety, privacy, and rollout decision.
- [ ] **HT-1217** Hold a 7-day review and record the same evidence plus retention/deletion and infrastructure trends.
- [ ] **HT-1218** Close the release only after the final evidence index, incident status, remaining risks, and next-patch backlog are accepted.

## Approval statement

To authorize inventory work only, Kevin may say:

> **I approve `docs/APP_STORE_EXECUTION_CHECKLIST.md` at commit `[commit]`. Begin Phase 1 only. Do not change product behavior, deploy, upload, submit, or release without the later approvals required by this checklist.**
