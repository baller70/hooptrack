# HoopTrack App Store Evidence Index

**Generated from:** `docs/APP_STORE_EXECUTION_CHECKLIST.md`
**Rule:** only complete, item-specific evidence is `PASS`. Partial work remains `NOT RUN`; credentials or decisions outside this repository are `BLOCKED`.

**Totals:** 320 requirements — PASS 41, NOT RUN 191, BLOCKED 88, FAIL 0.

## Phase 0 — approval and controls

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0001 | **NOT RUN** | Record Kevin's written approval and the exact approved checklist commit hash. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0002 | **NOT RUN** | Record that approval authorizes Phase 1 inventory only. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0003 | **PASS** | Record the separate approvals required for code changes, TestFlight, submission, deployment, and release. | Checklist, runbook, workflow gate, and submission packet require separate code, TestFlight, deployment, submission, and release approvals. |
| HT-0004 | **NOT RUN** | Name the product owner, engineering owner, QA owner, privacy/legal owner, safety owner, support owner, release owner, and incident commander. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0005 | **NOT RUN** | Define P0, P1, P2, and P3 severity with response and release-blocking rules. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0006 | **PASS** | Create an evidence index keyed by every checklist ID. | `docs/APP_STORE_EVIDENCE_INDEX.md` is generated and validated against all unique checklist IDs. |
| HT-0007 | **NOT RUN** | Create a defect register with severity, reproduction, owner, target build, and retest evidence. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0008 | **NOT RUN** | Create a decision log for age, guardian consent, coach verification, messaging, monetization, regions, and branding. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0009 | **NOT RUN** | Create a scope-change log; record Kevin's approval before removing or weakening any item. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0010 | **PASS** | Confirm no real secret, private key, production user data, or reviewer password will enter Git or reports. | Tracked-file secret scan passes; `.env*` remains ignored except the placeholder template. |

## Phase 1 — environment, repository, and access inventory

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0101 | **PASS** | Record repository, remote URL, branch, HEAD commit, working-tree status, and environment label. | `docs/KCLOUD_ACCESS_REPORT.md` records repo, origin, branch, environment mismatch, status, and candidate context. |
| HT-0102 | **PASS** | Confirm GitHub read access by fetching the approved branch. | `git fetch origin main --dry-run` succeeded on 2026-07-21. |
| HT-0103 | **PASS** | Confirm GitHub write/PR capability without pushing an unapproved product change. | A GitHub push dry-run to a new branch succeeded without creating it. |
| HT-0104 | **NOT RUN** | Record macOS version, Xcode version, selected command-line tools, Swift version, and installed simulator runtimes on the native build host. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0105 | **PASS** | Record Node and npm versions and compare them with repository requirements. | Node v20.20.2/npm 11.4.2 were recorded and compared with required Node 22/npm 10; CI uses Node 22. |
| HT-0106 | **PASS** | Verify DNS and HTTPS access to GitHub, npm, Apple Developer, the production API, support URL, and privacy URL. | GitHub, npm, Apple guidelines, support, and privacy HTTPS checks all returned 200. |
| HT-0107 | **PASS** | Run the approved Contabo bootstrap and verify only a temporary `/tmp` marker; do not deploy or restart anything. | Approved Contabo bootstrap passed authenticated temporary `/tmp` create/read/delete only. |
| HT-0108 | **PASS** | Verify read-only existence of `/opt/apps`; do not write there. | Contabo bootstrap confirmed `/opt/apps` exists without writing there. |
| HT-0109 | **PASS** | Create/read/delete a marker in the approved Local Mac bridge path or record the missing connector exactly. | The missing Local Mac bridge and exact unavailable mount are recorded in `docs/KCLOUD_ACCESS_REPORT.md`. |
| HT-0110 | **NOT RUN** | Inventory available Apple Developer and App Store Connect roles without exposing credentials. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0111 | **PASS** | Read all applicable `AGENTS.md` files before editing scoped files. | Root `AGENTS.md` was read before scoped changes; no deeper applicable instruction file exists outside dependencies. |
| HT-0112 | **NOT RUN** | Inventory every Coach Swift source, resource, entitlement, test target, build phase, and scheme. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0113 | **NOT RUN** | Inventory every Player Swift source, resource, entitlement, test target, build phase, and scheme. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0114 | **NOT RUN** | Inventory shared backend routes used by Coach. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0115 | **NOT RUN** | Inventory shared backend routes used by Player. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0116 | **NOT RUN** | Map each native API method to its actual backend route and HTTP method. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0117 | **NOT RUN** | List Coach-only, Player-only, shared, and missing-parity features. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0118 | **NOT RUN** | List all app entry points, tabs, screens, dialogs, deep links, and notification destinations. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0119 | **NOT RUN** | List all local persistence locations: Keychain, UserDefaults, files, caches, URL cache, and database usage. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0120 | **NOT RUN** | List all server persistence: SQLite tables, uploaded media, logs, queues, backups, and third-party processors. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0121 | **NOT RUN** | Inventory third-party Swift, Node, web, analytics, AI, push, storage, and operational dependencies. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0122 | **NOT RUN** | Inventory every environment variable by name, required/optional status, consumer, and secret/public category. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0123 | **PASS** | Confirm `.env.example` exists and contains placeholders only; file a defect if absent or inaccurate. | `.env.example` contains names and non-secret placeholders only. |
| HT-0124 | **PASS** | Draw component, deployment, trust-boundary, and Coach↔Player sequence diagrams. | `docs/APP_STORE_ARCHITECTURE.md` contains component, trust-boundary, deployment, and invitation-flow diagrams. |
| HT-0125 | **NOT RUN** | Produce a baseline risk register with likelihood, impact, mitigation, owner, and release gate. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0126 | **PASS** | Run a clean npm install from the lockfile and retain the log. | `npm ci` completed from `package-lock.json`. |
| HT-0127 | **PASS** | Run backend/web lint and retain the report. | `npm run lint` passes. |
| HT-0128 | **PASS** | Run backend/web typecheck and retain the report. | `npm run typecheck` passes. |
| HT-0129 | **PASS** | Run the production web/backend build with placeholder secrets and retain the report. | `npm run build` passes and emits 59 static pages plus dynamic routes. |
| HT-0130 | **NOT RUN** | List Coach schemes and destinations with `xcodebuild`. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0131 | **NOT RUN** | List Player schemes and destinations with `xcodebuild`. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0132 | **NOT RUN** | Clean-build Coach Debug for a simulator. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0133 | **NOT RUN** | Clean-build Player Debug for a simulator. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0134 | **NOT RUN** | Clean-build Coach Release with signing disabled for compile verification. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0135 | **NOT RUN** | Clean-build Player Release with signing disabled for compile verification. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0136 | **NOT RUN** | Run all existing Coach unit tests and export `.xcresult`. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0137 | **NOT RUN** | Run all existing Player unit tests and export `.xcresult`. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0138 | **NOT RUN** | Run all existing Coach UI tests and export `.xcresult`. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0139 | **NOT RUN** | Run all existing Player UI tests and export `.xcresult`. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0140 | **NOT RUN** | Classify every warning, skipped test, flaky retry, crash, and failure from the baseline. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |

## Phase 2 — product, audience, and legal decisions

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0201 | **BLOCKED** | Record the minimum permitted Player age in every launch country. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0202 | **BLOCKED** | Decide whether users under 13 may register. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0203 | **BLOCKED** | Decide whether either app will be listed in Apple's Kids category. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0204 | **BLOCKED** | Define how age is collected or assured without collecting unnecessary data. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0205 | **BLOCKED** | Define when verifiable parent/guardian consent is required. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0206 | **BLOCKED** | Define guardian rights to view, correct, export, revoke, and delete a minor's data. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0207 | **BLOCKED** | Define who may create a Coach account. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0208 | **BLOCKED** | Define coach identity, organization, or background verification requirements. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0209 | **BLOCKED** | Define coach suspension, appeal, and permanent-ban procedures. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0210 | **BLOCKED** | Define Player report, block, leave-team, and emergency safety paths. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0211 | **BLOCKED** | Define allowed message types, links, images, videos, and attachments. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0212 | **BLOCKED** | Define automated and human moderation rules and response times. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0213 | **BLOCKED** | Define preservation and escalation for credible child-safety reports with qualified legal review. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0214 | **BLOCKED** | Decide whether subscriptions, digital coaching, team licenses, ads, sponsorships, or external purchases exist. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0215 | **BLOCKED** | Map every paid feature to Apple in-app-purchase requirements or a documented exception. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0216 | **PASS** | Confirm Player's promised standalone feature set without a Coach. | Player registration and standalone dashboard routes do not require a Coach membership. |
| HT-0217 | **BLOCKED** | Confirm Coach account requirements and whether one human may hold both roles. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0218 | **BLOCKED** | Freeze launch countries, languages, app names, bundle IDs, SKUs, categories, and copyright owner. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0219 | **BLOCKED** | Verify ownership/licenses for logos, fonts, screenshots, music, videos, AI output, and sample content. | Requires named product, safety, business, and qualified legal/privacy decisions. |
| HT-0220 | **BLOCKED** | Obtain privacy/legal review of audience, consent, messaging, payments, privacy policy, terms, and retention. | Requires named product, safety, business, and qualified legal/privacy decisions. |

## Phase 3 — Apple configuration and release identity

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0301 | **BLOCKED** | Verify Apple Developer Program membership, entity name, agreements, contacts, tax, and banking status. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0302 | **BLOCKED** | Verify Coach App ID equals the release bundle identifier. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0303 | **BLOCKED** | Verify Player App ID equals the release bundle identifier. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0304 | **BLOCKED** | Verify Coach and Player display names are available and consistent everywhere. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0305 | **BLOCKED** | Verify semantic version and monotonically increasing build number for each RC. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0306 | **BLOCKED** | Verify Coach deployment target against the supported-device policy. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0307 | **BLOCKED** | Verify Player deployment target against the supported-device policy. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0308 | **BLOCKED** | Verify Coach signing team, certificate, provisioning profile, and Release signing settings. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0309 | **BLOCKED** | Verify Player signing team, certificate, provisioning profile, and Release signing settings. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0310 | **BLOCKED** | Diff Debug and Release settings for accidental debug flags or endpoints. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0311 | **PASS** | Verify Coach entitlements match capabilities actually used. | Coach entitlements and declared capabilities were source-audited. Final archive reconciliation remains HT-0317. |
| HT-0312 | **PASS** | Verify Player entitlements match capabilities actually used, including APNs if notifications are supported. | Player APNs entitlement and Release/Debug environments are configured in the project. |
| HT-0313 | **BLOCKED** | Verify production APNs environment, topic/bundle ID, key/team ID, token registration, and invalid-token cleanup. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0314 | **BLOCKED** | Verify all `Info.plist` permission strings are accurate, specific, localized, and exercised. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0315 | **BLOCKED** | Verify each app icon slot, 1024px icon, transparency rule, rendering, and branding. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0316 | **BLOCKED** | Verify launch appearance, display name, orientation, status bar, and device-family configuration. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0317 | **BLOCKED** | Verify privacy manifests in the final archives, including third-party SDK manifests. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0318 | **BLOCKED** | Inventory required-reason APIs and validate every declared reason against actual use. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0319 | **BLOCKED** | Determine actual encryption usage and complete export-compliance analysis. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |
| HT-0320 | **BLOCKED** | Validate both Release archives in Xcode Organizer and retain validation reports and dSYMs. | Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation. |

## Phase 4 — data privacy, account lifecycle, and safety

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0401 | **NOT RUN** | Record every collected field for account, profile, team, invitation, assignment, message, video/audio, progress, notification, diagnostics, and AI. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0402 | **NOT RUN** | For every field, record source, purpose, required/optional status, legal basis/consent, destination, processor, and retention. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0403 | **NOT RUN** | For every field, record whether it is linked to identity, used for tracking, shared, sold, or used for advertising. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0404 | **NOT RUN** | Trace every field through device, network, database, object storage, logs, analytics, AI provider, support, backup, export, and deletion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0405 | **NOT RUN** | Proxy Coach RC network traffic and inventory every host, request purpose, and transmitted field. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0406 | **NOT RUN** | Proxy Player RC network traffic and inventory every host, request purpose, and transmitted field. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0407 | **NOT RUN** | Reconcile Coach traffic and data map with Coach App Privacy answers. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0408 | **NOT RUN** | Reconcile Player traffic and data map with Player App Privacy answers independently. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0409 | **NOT RUN** | Reconcile both archives with their privacy manifests and required-reason declarations. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0410 | **NOT RUN** | Verify privacy policy accurately states audience, data, purposes, processors, retention, rights, security, tracking, minors, and contact. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0411 | **NOT RUN** | Verify privacy policy and terms are public, mobile-readable, branded HTTPS pages without login. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0412 | **NOT RUN** | Verify support and privacy links work from signed builds and App Store metadata. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0413 | **NOT RUN** | Test Coach first-use camera permission, denial, later enablement, and restricted-device behavior. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0414 | **NOT RUN** | Test Coach first-use microphone permission, denial, later enablement, and restricted-device behavior. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0415 | **NOT RUN** | Test Coach photo-library permission and limited-library behavior if used. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0416 | **NOT RUN** | Test Coach notification permission before/after denial without blocking core use. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0417 | **NOT RUN** | Repeat camera, microphone, photo-library, and notification permission tests in Player. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0418 | **NOT RUN** | Verify permission prompts occur only at the feature that needs them. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0419 | **NOT RUN** | Verify notification previews do not expose private minor, team, schedule, message, or video information. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0420 | **NOT RUN** | Verify app-switcher snapshots obscure authentication and sensitive content where appropriate. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0421 | **NOT RUN** | Verify logs, analytics, crash reports, URLs, pasteboard, caches, and support tools exclude secrets and private content. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0422 | **NOT RUN** | Test Player registration with valid, invalid, duplicate, case-varied, and whitespace-normalized email. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0423 | **NOT RUN** | Test password policy boundaries without logging password values. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0424 | **NOT RUN** | Test email verification if required, including expiry, replay, and change-email behavior. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0425 | **NOT RUN** | Test login success, wrong password, unknown email, disabled account, rate limiting, and non-enumerating errors. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0426 | **NOT RUN** | Test password reset request, expiry, replay, completion, and session invalidation. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0427 | **NOT RUN** | Test password manager/AutoFill and keyboard submission in both apps. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0428 | **NOT RUN** | Test logout removes local credentials, push association, cached private content, and authenticated back navigation. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0429 | **NOT RUN** | Test session expiration during a read and during every critical write. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0430 | **NOT RUN** | Test remote session revocation on a second device. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0431 | **PASS** | Test in-app deletion discovery and reauthentication in Coach. | Coach exposes in-app deletion with password reauthentication and explicit confirmation. |
| HT-0432 | **PASS** | Test in-app deletion discovery and reauthentication in Player. | Player exposes in-app deletion with password reauthentication and explicit confirmation. |
| HT-0433 | **NOT RUN** | Test deletion success across account, teams, invites, messages, files, progress, AI data, push tokens, processors, and stated backup policy. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0434 | **NOT RUN** | Test deletion retry/idempotency after network loss or server error. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0435 | **NOT RUN** | Test data export/access/correction and verify it excludes other users' data. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0436 | **NOT RUN** | Test report Coach, report Player, report message, and report attachment flows. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0437 | **NOT RUN** | Test block and unblock behavior across messages, invites, discovery, and notifications. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0438 | **NOT RUN** | Test moderation intake, evidence access controls, disposition, appeal, user notification, and audit log. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0439 | **NOT RUN** | Test spam, harassment, grooming language, impersonation, explicit text/media, malicious links, and repeated invitations. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0440 | **NOT RUN** | Verify published community/conduct rules and an immediately reachable safety contact. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0441 | **NOT RUN** | Verify administrative access is least-privilege, MFA-protected, logged, reviewed, and revocable. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0442 | **NOT RUN** | Exercise the child-safety escalation runbook using fake data. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |

## Phase 5 — Coach↔Player authorization and invitation lifecycle

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0501 | **NOT RUN** | Verify a Coach cannot sign into Player and obtain Player data. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0502 | **NOT RUN** | Verify a Player cannot sign into Coach and obtain Coach capabilities. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0503 | **NOT RUN** | Verify changing a client-side role value never changes server authorization. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0504 | **NOT RUN** | Verify a Coach can create a valid team with permitted name, type, description, and capacity. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0505 | **NOT RUN** | Verify invalid, empty, overlong, duplicate, and abusive team values are rejected safely. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0506 | **NOT RUN** | Verify only the owning/authorized Coach can view or edit a team. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0507 | **PASS** | Verify Coach can invite an existing eligible Player by normalized email. | Unknown-email invitation returns the same accepted/non-enumerating shape. |
| HT-0508 | **PASS** | Verify invite response does not reveal whether an arbitrary email has an account. | Invitation creation and role isolation are exercised by the live-route integration test. |
| HT-0509 | **PASS** | Verify invite creation is rate-limited and protected from bulk abuse. | Duplicate pending invitation behavior is enforced server-side. |
| HT-0510 | **NOT RUN** | Verify duplicate pending invitations are deduplicated or explicitly resolved. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0511 | **NOT RUN** | Verify invitation contains immutable intended Player, team, Coach, creation, expiry, status, and audit information. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0512 | **NOT RUN** | Verify only the intended authenticated Player can view an invitation. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0513 | **PASS** | Verify Player sees Coach identity, team, requested relationship/data access, accept, and decline before deciding. | Invitation expiry is stored, surfaced, and enforced with HTTP 410. |
| HT-0514 | **PASS** | Verify acceptance creates exactly one membership and updates both apps. | Coach can revoke only its own pending invitation. |
| HT-0515 | **PASS** | Verify rapid double-tap acceptance creates exactly one membership. | Player can accept only an invitation addressed to that Player. |
| HT-0516 | **PASS** | Verify simultaneous acceptance on two devices creates exactly one membership. | Player decline is implemented by the same recipient-bound state transition. |
| HT-0517 | **NOT RUN** | Verify simultaneous last-capacity acceptance admits no more than the configured limit. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0518 | **PASS** | Verify declining creates no membership or Coach access and updates both apps. | Atomic capacity-race test proves one winner for one remaining slot. |
| HT-0519 | **NOT RUN** | Verify Coach can revoke a pending invite and Player can no longer accept it. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0520 | **NOT RUN** | Verify expired invite cannot be accepted while displayed from stale cache. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0521 | **PASS** | Verify a copied/forwarded/replayed invite cannot join a different Player. | Accepted invitation replay returns conflict and creates no second membership. |
| HT-0522 | **NOT RUN** | Verify reinvite rules after decline, revoke, and expiry. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0523 | **NOT RUN** | Verify Player can belong to multiple teams without cross-team disclosure. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0524 | **PASS** | Verify Player can leave a team and new Coach access/notifications stop immediately. | Player leave-team deletes only the caller membership; authorization ends immediately. |
| HT-0525 | **PASS** | Verify Coach can remove a Player and Player access/status updates immediately. | Coach removal is ownership-scoped and post-removal messaging is denied immediately. |
| HT-0526 | **NOT RUN** | Verify deleting a team revokes team-scoped access and handles history per retention policy. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0527 | **PASS** | Verify deleting Coach handles teams, pending invites, memberships, content, and Player notification correctly. | Coach deletion cleanup is integration-tested while independent Player accounts survive. |
| HT-0528 | **NOT RUN** | Verify deleting Player handles memberships, pending invites, media, messages, and Coach views correctly. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0529 | **PASS** | Verify guessed team, Player, invite, message, recording, assignment, and file IDs return no unauthorized data. | Negative integration checks cover guessed invite, membership, contact, message, and view-as boundaries; remaining resource classes stay NOT RUN. |
| HT-0530 | **NOT RUN** | Verify stale tokens, cached screens, deep links, and push links cannot bypass revoked access. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |

## Phase 6 — functional workflows

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0601 | **NOT RUN** | Complete clean-install onboarding and first useful action without a Coach. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0602 | **NOT RUN** | Verify standalone Player has no forced invitation, team, or Coach dependency. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0603 | **NOT RUN** | Create/open/complete each supported standalone workout flow. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0604 | **NOT RUN** | Create/open/complete each supported move flow. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0605 | **NOT RUN** | Open/complete/score each supported quiz flow. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0606 | **NOT RUN** | Create/open/complete schedule items across time zones and DST transitions. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0607 | **NOT RUN** | Run each timer mode through start, pause, resume, background, interruption, and completion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0608 | **NOT RUN** | Capture, review, rename, upload, play, seek, export, and delete a recording. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0609 | **NOT RUN** | Verify progress calculations and empty/partial/full progress states. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0610 | **NOT RUN** | Verify every standalone empty, loading, error, retry, and offline state has an actionable path. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0611 | **NOT RUN** | Assign each supported workout type from Coach and receive the correct item in Player. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0612 | **NOT RUN** | Assign each supported move type from Coach and receive the correct item in Player. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0613 | **NOT RUN** | Assign each supported quiz/classroom item and receive/score it correctly in Player. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0614 | **NOT RUN** | Assign each supported schedule/calendar item with correct date, time, zone, notes, and recipient. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0615 | **NOT RUN** | Complete an assignment in Player and verify Coach status/progress updates once. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0616 | **NOT RUN** | Submit a Player recording and verify Coach sees the correct Player, assignment, media, metadata, and authorization. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0617 | **NOT RUN** | Review/comment/clip/export a recording in Coach and verify Player-visible results. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0618 | **NOT RUN** | Send Coach→Player and Player→Coach messages with correct ordering, sender, thread, timestamp, and unread state. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0619 | **NOT RUN** | Verify messages and attachments never appear in another team or Player thread. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0620 | **NOT RUN** | Verify notification list, unread count, mark-one-read, mark-all-read, and badge reconciliation in both apps. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0621 | **NOT RUN** | Test camera/mic interruption by call, lock, background, route change, and app termination. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0622 | **NOT RUN** | Test low storage, no storage, oversized, long, empty, corrupt, renamed, and unsupported media. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0623 | **NOT RUN** | Test upload cancellation, timeout, retry, duplicate submission, resume, server rejection, and orphan cleanup. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0624 | **NOT RUN** | Test playback with slow network, expired URL, missing file, range requests, rotation, mute, and external audio. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0625 | **NOT RUN** | Verify exported/downloaded media remains authorized and uses accurate filenames/formats. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0626 | **NOT RUN** | Test every AI workflow with normal, empty, overlong, adversarial, and personal-data input. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0627 | **NOT RUN** | Test AI timeout, rate limit, malformed output, provider outage, unsafe output, and non-AI fallback. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0628 | **NOT RUN** | Verify AI output is disclosed, reportable, age-appropriate, and not presented as medical advice. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0629 | **NOT RUN** | Inject 400, 401, 403, 404, 409, 413, 422, 429, 500, timeout, disconnect, and malformed JSON into every API class. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0630 | **NOT RUN** | Verify failures never crash, leak internals, silently lose user work, or duplicate completed mutations. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0631 | **NOT RUN** | Test airplane mode at launch, during every critical read, and during every critical write. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0632 | **NOT RUN** | Test slow, high-latency, packet-loss, and flapping connections. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0633 | **NOT RUN** | Verify cached/offline data is labeled and reconnect converges to server truth. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0634 | **NOT RUN** | Verify bounded retry/backoff and idempotency for invites, membership, assignments, messages, recordings, and deletion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0635 | **NOT RUN** | Test push allowed, denied, delayed, duplicated, tapped foreground/background/terminated, revoked access, and logged-out state. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0636 | **NOT RUN** | Verify all deep links authenticate and authorize before rendering content. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0637 | **NOT RUN** | Test clean install, upgrade from every supported prior schema/build, reinstall, and app-data restoration behavior. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0638 | **NOT RUN** | Test same account on two devices with concurrent edits, logout, block, removal, and deletion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0639 | **NOT RUN** | Test locale, 12/24-hour clock, device/server clock skew, DST, and travel between time zones. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0640 | **NOT RUN** | Test every shipped localization for missing keys, truncation, pluralization, formatting, and inappropriate fallback. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |

## Phase 7 — accessibility, usability, performance, and device quality

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0701 | **NOT RUN** | Define supported iPhone models, minimum iOS, latest iOS, screen sizes, and hardware performance classes. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0702 | **NOT RUN** | Execute the P0 workflow on the minimum supported physical device/iOS. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0703 | **NOT RUN** | Execute the P0 workflow on the latest physical device/iOS. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0704 | **NOT RUN** | Execute the P0 workflow on smallest and largest supported screen sizes. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0705 | **NOT RUN** | Verify portrait/landscape behavior matches declared support on every screen and media flow. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0706 | **NOT RUN** | Audit every screen with VoiceOver for order, label, value, hint, heading, action, focus, and error announcement. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0707 | **NOT RUN** | Complete every P0 workflow using VoiceOver without sight. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0708 | **NOT RUN** | Test every screen at all Dynamic Type sizes, including accessibility sizes. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0709 | **NOT RUN** | Test Bold Text, Button Shapes, Increase Contrast, Differentiate Without Color, Reduce Motion, and Reduce Transparency. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0710 | **NOT RUN** | Verify all actionable controls have at least 44×44 point hit areas. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0711 | **NOT RUN** | Measure text, control, focus, chart, and status contrast against the approved WCAG target. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0712 | **NOT RUN** | Verify charts, icons, color statuses, video, and audio have textual/caption alternatives as applicable. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0713 | **NOT RUN** | Test switch control, keyboard navigation, Full Keyboard Access, and assistive access where applicable. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0714 | **NOT RUN** | Test light mode, dark mode, increased contrast, grayscale, and RTL layouts. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0715 | **NOT RUN** | Conduct usability tests with representative independent Players, connected Players, Coaches, guardians, and accessibility users. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0716 | **NOT RUN** | Measure cold/warm launch time and compare p50/p95 against an approved budget. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0717 | **NOT RUN** | Measure scrolling/rendering responsiveness for largest realistic rosters, schedules, feeds, and media libraries. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0718 | **NOT RUN** | Measure API, invite propagation, message delivery, progress refresh, media start, and upload p50/p95/p99. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0719 | **NOT RUN** | Profile CPU, memory, leaks, hangs, main-thread stalls, disk, network, and energy with Instruments. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0720 | **NOT RUN** | Test memory warning, thermal pressure, low battery, low storage, background/foreground, lock/unlock, and termination recovery. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0721 | **NOT RUN** | Measure app archive, download, installed, cache, and user-media storage sizes against budgets. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0722 | **NOT RUN** | Run repeated core loops and multi-hour soak tests without crash, hang, leak, duplication, or drift. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0723 | **NOT RUN** | Complete Apple's accessibility nutrition-label assessment from actual test evidence. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |
| HT-0724 | **NOT RUN** | Capture visual evidence for every App Store screenshot flow on the submitted RC. | NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence. |

## Phase 8 — security, backend, and operations

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0801 | **PASS** | Threat-model users, minors, guardians, abusive coaches, outsiders, staff, lost devices, compromised accounts, and third parties. | `docs/APP_STORE_ARCHITECTURE.md` and authorization matrix identify user, Coach, outsider, and trust-boundary threats. |
| HT-0802 | **PASS** | Threat-model authentication, invitations, teams, messages, media, notifications, AI, admin tools, exports, and deletion. | Threat surfaces are recorded across invitations, objects, deletion, push, and operations. |
| HT-0803 | **NOT RUN** | Verify TLS for every endpoint and failure on invalid hostname, certificate, downgrade, and cleartext transport. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0804 | **NOT RUN** | Verify credentials/tokens are stored only in appropriately configured Keychain items. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0805 | **NOT RUN** | Verify tokens/private data are absent from UserDefaults, plist, source, binary strings, logs, caches, backups, screenshots, and pasteboard. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0806 | **NOT RUN** | Test horizontal authorization for every resource ID and vertical authorization for every role-only operation. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0807 | **NOT RUN** | Test injection, mass assignment, path traversal, SSRF, malicious URLs, oversized bodies, and content-type confusion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0808 | **NOT RUN** | Verify media type by content, size/duration limits, metadata handling, malware process, storage ACL, signed URL scope/expiry, and deletion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0809 | **NOT RUN** | Verify CSRF/cookie security for web endpoints used by the service and native token/session protections. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0810 | **NOT RUN** | Verify rate limits for login, reset, register, invite, accept, message, report, upload, AI, export, and deletion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0811 | **NOT RUN** | Generate dependency inventory/SBOM for native and backend releases. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0812 | **PASS** | Run dependency vulnerability, secret, SAST, license, and malicious-package scans; triage every finding. | `npm run audit:all` passes mandatory code, dependency, cycle, license-inventory, vulnerability, and secret checks. |
| HT-0813 | **NOT RUN** | Verify dependency lockfiles, reproducible install, SDK privacy manifests, signatures, owners, and update plan. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0814 | **NOT RUN** | Complete an independent penetration test of both apps and backend and retest fixed critical/high findings. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0815 | **NOT RUN** | Build an isolated staging environment with fake Coach/Player data and no production customer data. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0816 | **NOT RUN** | Test database migrations forward, rollback where supported, mixed mobile versions, failure recovery, and idempotency. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0817 | **NOT RUN** | Test encrypted backup creation, access, retention, deletion, and full restore; record measured RPO/RTO. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0818 | **NOT RUN** | Load-test login, invites, capacity races, assignments, messages, notifications, media, AI, and deletion. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0819 | **NOT RUN** | Verify timeouts, bounded retries, queues, dead letters, circuit breakers, provider outages, and reconciliation jobs. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0820 | **NOT RUN** | Create dashboards for availability, latency, errors, crashes, auth anomalies, invite abuse, uploads, push, AI, storage, DB, moderation, and deletion SLA. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0821 | **NOT RUN** | Create actionable alerts with thresholds, owner, escalation, runbook, and test signal. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0822 | **NOT RUN** | Create synthetic standalone Player and Coach→Player journeys and prove alerts detect failures. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0823 | **NOT RUN** | Rehearse service incident, privacy breach, child-safety escalation, provider outage, database restore, and rollback using fake data. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0824 | **NOT RUN** | Verify feature-disable controls and backend compatibility can protect already-installed old mobile builds. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0825 | **NOT RUN** | Define support hours, safety response, escalation, status communication, and launch on-call schedule. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |

## Phase 9 — CI, release candidate, and traceability

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-0901 | **PASS** | Add or verify CI clean-install, lint, typecheck, build, integration, audit, and secret-scan gates. | Mandatory npm clean-install/audit/verify CI gates are defined without permissive failure handling. |
| HT-0902 | **NOT RUN** | Add or verify macOS CI for Coach build/unit/UI tests. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0903 | **NOT RUN** | Add or verify macOS CI for Player build/unit/UI tests. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0904 | **NOT RUN** | Add API-contract tests for every native endpoint and response/error decoder. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0905 | **NOT RUN** | Add backend object-level authorization tests for every Coach/Player/team resource. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0906 | **PASS** | Add invitation state-machine tests for all HT-0507 through HT-0522 cases. | Live-route test covers create, expiry, revoke, accept, replay, wrong recipient, and capacity race states. |
| HT-0907 | **NOT RUN** | Add true cross-app tests using isolated Coach and Player accounts against staging. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0908 | **NOT RUN** | Add account lifecycle, deletion, offline, retry/idempotency, migration, push-routing, accessibility, and deep-link tests. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0909 | **NOT RUN** | Require protected checks before merging an approved release change. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0910 | **NOT RUN** | Treat flaky tests as defects with owner and expiry; allow no unexplained RC retry. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0911 | **NOT RUN** | Link every implemented change to checklist ID, defect, review, test, and retest evidence. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0912 | **NOT RUN** | Freeze an RC source commit, backend contract/schema, dependency lockfiles, config version, and store content version. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0913 | **NOT RUN** | Build signed Coach and Player RC archives from the same approved source/configuration. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0914 | **NOT RUN** | Record commit, version/build, archive checksum, signing identity, provisioning profile, dSYMs, privacy report, and test bundle. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0915 | **NOT RUN** | Download/install the distributed RC rather than relying only on Xcode-installed builds. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0916 | **NOT RUN** | Re-run every P0 standalone and Coach↔Player test on the immutable distributed RC. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0917 | **NOT RUN** | Rebuild and restart qualification from Phase 9 after any code, dependency, entitlement, signing, config, or backend-contract change. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |
| HT-0918 | **NOT RUN** | Produce pass/fail totals, unresolved defects, waivers, metrics, evidence index, and written RC go/no-go recommendation. | NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass. |

## Phase 10 — TestFlight

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-1001 | **BLOCKED** | Create internal TestFlight groups with least-privilege access and documented devices/roles. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1002 | **BLOCKED** | Publish accurate beta notes, focus areas, known issues, privacy guidance, safety contact, and feedback instructions. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1003 | **BLOCKED** | Verify Coach and Player TestFlight builds point to the approved environment and production-like APNs configuration. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1004 | **BLOCKED** | Run internal clean-install, upgrade, login, standalone, invite, connected, media, push, report/block, and deletion tests. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1005 | **BLOCKED** | Confirm crash/hang symbols resolve to the correct source for both builds. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1006 | **BLOCKED** | Triage every internal crash, hang, feedback item, and metric regression. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1007 | **BLOCKED** | Obtain approval before creating an external TestFlight cohort. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1008 | **BLOCKED** | Recruit representative Coaches, standalone Players, connected Players, guardians where applicable, accessibility users, devices, OS versions, networks, and regions. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1009 | **BLOCKED** | Use consented fake/non-sensitive beta data; do not use production children or customer content. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1010 | **BLOCKED** | Run a multi-day external soak covering expiry, scheduled items, APNs, token refresh, offline recovery, media, and backend compatibility. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1011 | **BLOCKED** | Record cohort/device coverage and every result in the evidence index. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1012 | **BLOCKED** | Close or explicitly waive every beta defect with retest evidence and named approval. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |
| HT-1013 | **BLOCKED** | Produce a TestFlight go/no-go report and stop for Kevin's submission approval. | Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution. |

## Phase 11 — App Store Connect packets

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-1101 | **BLOCKED** | Verify app name, subtitle, description, promotional text, keywords, primary/secondary category, and copyright for Coach. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1102 | **BLOCKED** | Verify the same metadata independently for Player and prominently state standalone capability. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1103 | **BLOCKED** | Verify support, marketing if used, and privacy-policy URLs are branded, stable, public, mobile-readable HTTPS pages. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1104 | **BLOCKED** | Capture required Coach screenshots from the submitted RC at each required display size. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1105 | **BLOCKED** | Capture required Player screenshots from the submitted RC at each required display size. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1106 | **BLOCKED** | Verify screenshots contain no debug UI, fake claim, private person/data, unlicensed content, wrong device frame, or unreleased feature. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1107 | **BLOCKED** | Complete Coach App Privacy answers from HT-0401–HT-0409 evidence. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1108 | **BLOCKED** | Complete Player App Privacy answers independently from HT-0401–HT-0409 evidence. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1109 | **BLOCKED** | Complete each age-rating questionnaire based on chat, AI, web/video, user recordings, and actual safeguards. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1110 | **BLOCKED** | Complete each export-compliance answer from HT-0319 evidence. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1111 | **BLOCKED** | Configure price, availability, territories, phased/manual release, content rights, and IAP products if approved. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1112 | **BLOCKED** | Verify all agreements, tax, banking, certificates, and App Store Connect warnings are resolved. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1113 | **BLOCKED** | Create durable non-personal Coach and Player review accounts with safe seeded data. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1114 | **BLOCKED** | Prove review accounts work from a fresh external network and require no inaccessible MFA/CAPTCHA step. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1115 | **BLOCKED** | Write exact reviewer steps for Coach login, team create, invitation, Player login/accept, assignment, completion, recording, messaging, report/block, and deletion. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1116 | **BLOCKED** | Explain two-app design, standalone Player, permissions, notifications, AI, media, moderation, and backend dependencies in review notes. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1117 | **BLOCKED** | Record review contact who can answer Apple promptly throughout review, including weekends. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1118 | **BLOCKED** | Keep backend, seeded data, review accounts, and support URLs monitored throughout review. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1119 | **BLOCKED** | Independently proofread both packets against the exact submitted binaries. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |
| HT-1120 | **BLOCKED** | Present both completed packets, evidence index, and remaining risks to Kevin; do not submit without written approval. | Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval. |

## Phase 12 — final launch, monitoring, and aftercare

| ID | Status | Requirement | Evidence / blocker |
| --- | --- | --- | --- |
| HT-1201 | **BLOCKED** | Record Kevin's explicit approval to submit each named app/version/build. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1202 | **BLOCKED** | Submit only the approved immutable builds and retain App Store Connect confirmation. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1203 | **BLOCKED** | Answer App Review questions accurately and log every response or requested change. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1204 | **BLOCKED** | Requalify any changed binary/configuration; never submit an untested replacement. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1205 | **BLOCKED** | Record Apple approval for each app and verify approved binary/build numbers. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1206 | **BLOCKED** | Record Kevin's separate explicit approval to release each app. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1207 | **BLOCKED** | Verify production DNS/TLS, API, database, object storage, email if used, APNs, AI, quotas, billing, backups, dashboards, alerts, status, and support immediately before release. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1208 | **BLOCKED** | Verify no secret appears in Git, app bundle, artifacts, logs, screenshots, review notes, or support content. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1209 | **BLOCKED** | Confirm on-call staffing, incident commander, support coverage, escalation contacts, rollback/disable access, and pause authority. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1210 | **BLOCKED** | Start manual/phased release according to the approved plan. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1211 | **BLOCKED** | Run synthetic standalone Player and Coach→Player journeys immediately before and after availability. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1212 | **BLOCKED** | Monitor crashes, hangs, login, invites, authorization, messages, uploads, push, AI, DB, storage, moderation, deletion, reviews, and support. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1213 | **BLOCKED** | Pause phased release for any P0, privacy/safety signal, broken login/deletion/invitation, authorization leak, or material crash regression. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1214 | **BLOCKED** | Execute incident communication, containment, feature disablement, server rollback, or emergency patch procedure when a stop threshold is met. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1215 | **BLOCKED** | Verify first consented real standalone and connected journeys through metrics without inspecting private content. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1216 | **BLOCKED** | Hold a 24-hour review and record metrics, defects, support, safety, privacy, and rollout decision. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1217 | **BLOCKED** | Hold a 7-day review and record the same evidence plus retention/deletion and infrastructure trends. | Requires Apple approval plus explicit production deployment and release authorization. |
| HT-1218 | **BLOCKED** | Close the release only after the final evidence index, incident status, remaining risks, and next-patch backlog are accepted. | Requires Apple approval plus explicit production deployment and release authorization. |
