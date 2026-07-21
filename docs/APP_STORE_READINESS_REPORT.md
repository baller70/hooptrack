# HoopTrack App Store Readiness Report

**Checklist revision:** `7c59810`  
**Execution pass:** 1 of 3  
**Phase:** 1 — inventory and baseline  
**Report date:** 2026-07-21  
**Status:** in progress; native qualification is blocked outside a macOS/Xcode host

## Result vocabulary

- **PASS:** executed with retained terminal or repository evidence.
- **FAIL:** executed and did not meet the requirement.
- **BLOCKED:** cannot execute without a named external capability.
- **NOT RUN:** executable but not yet attempted.
- **N/A:** reviewed and demonstrably not applicable.

No `BLOCKED` or `NOT RUN` result is counted as a pass.

## Phase 1 evidence ledger

| ID | Result | Evidence / finding | Required follow-up |
| --- | --- | --- | --- |
| HT-0101 | PASS | Repository `baller70/hooptrack`; origin uses the approved GitHub HTTPS URL; supplied branch is `work`, not `main`; baseline checklist commit was `7c59810` | Reconcile the environment branch with the documented `main` policy before an RC |
| HT-0102 | PASS | `git fetch origin main` completed successfully | Repeat immediately before each qualification pass |
| HT-0103 | PASS | Commits and PR metadata can be created through the connected integration | Protect later product changes behind review |
| HT-0104 | BLOCKED | Linux host has no `xcodebuild` | Provide a macOS host with current supported Xcode, Swift, simulators, and signing access |
| HT-0105 | FAIL | Host reports Node 20.20.2/npm 11.4.2; repository requires Node 22.x/npm 10.x | Run future baseline/CI in the documented toolchain |
| HT-0106 | PASS | GitHub, npm, Apple guidelines, HoopTrack privacy, and HoopTrack support returned HTTP 200 | Add production API synthetic check without private payloads |
| HT-0107 | PASS | KCLOUD Contabo bootstrap authenticated and created/read/deleted only a `/tmp` marker | Do not deploy or run PM2 without explicit authorization |
| HT-0108 | PASS | Contabo bootstrap confirmed `/opt/apps` exists read-only | No write was authorized or performed |
| HT-0109 | BLOCKED | `/Volumes/APPLICATIONS/CodexStorage/kcloud-local-bridge/rw-tests` is not mounted | Configure the Local Mac bridge connector |
| HT-0110 | BLOCKED | No Apple Developer/App Store Connect session is exposed in this Linux environment | Provide least-privilege Apple access during the approved phase |
| HT-0111 | PASS | Root `AGENTS.md`, README, package manifest, application sources, components, libraries, native resources, projects, and tests were inspected | Recheck nested instructions before every edit |
| HT-0112 | PASS | Coach target inventory includes SwiftUI app/state, models, API client, views, assets, Info.plist, privacy manifest, APNs entitlement, unit tests, and UI tests | Convert inventory to maintained architecture appendix |
| HT-0113 | PASS | Player target inventory includes SwiftUI app/state, models, API client, views, assets, Info.plist, privacy manifest, unit tests, and UI tests; no Player entitlement file is present | Confirm whether native Player push is intended before adding an entitlement |
| HT-0114 | PASS | Coach API contract routes are enumerated by existing unit tests and native API client inspection | Add generated contract coverage in Phase 9 |
| HT-0115 | PASS | Player API contract routes are enumerated by native API client inspection | Add generated contract coverage in Phase 9 |
| HT-0116 | PASS | Native clients use the shared `/api` backend rather than an untracked mobile-only API | Produce the route/authorization matrix below in the next report revision |
| HT-0117 | PASS | Coach-only, Player-only, and shared native surfaces were identified; factory fixtures are not treated as end-to-end proof | Build a screen-by-screen parity matrix during Phase 1 continuation |
| HT-0118 | PASS | Native roots, tabs, views, URLs, and notification entry points were enumerated from source | Deep-link authorization remains a Phase 5 test requirement |
| HT-0119 | PASS | Native API clients use URLSession cookie handling; local-secret/persistence review remains required | Complete Keychain/UserDefaults/cache traffic inspection on macOS |
| HT-0120 | PASS | Shared service uses SQLite plus recording/attachment directories; runtime paths are now safely documented by name in `.env.example` | Map table and file retention/deletion in Phase 4 |
| HT-0121 | PASS | Node dependencies and native first-party sources were inventoried; no Swift package dependency was observed in the project listing | Generate SBOM and vulnerability results in Phase 8 |
| HT-0122 | PASS | All referenced environment variable names were inventoried without values | Keep inventory synchronized with source |
| HT-0123 | PASS | Added a placeholder-only `.env.example`; no real secret is present | Validate placeholders during CI |
| HT-0124 | PASS | Added versioned system-context, deployment, trust-boundary, invitation, and deletion diagrams in `docs/APP_STORE_ARCHITECTURE.md` | Reconcile the source-derived baseline with macOS traffic inspection and production operators |
| HT-0125 | PASS | Initial risk register is included below | Assign human owners after Kevin supplies the release team |
| HT-0126 | PASS | `npm install` completed; full audit initially found vulnerable transitive `brace-expansion`; `npm audit fix` updated it and both full and production-only audits now report zero vulnerabilities | Repeat on every RC and review future changes rather than applying blind breaking upgrades |
| HT-0127 | PASS | `npm run lint` completed | Repeat via `npm run verify` |
| HT-0128 | PASS | `npm run typecheck` completed | Repeat via `npm run verify` |
| HT-0129 | PASS | `npm run build` completed and generated 59 static pages plus dynamic routes | Repeat under Node 22/npm 10 with release placeholders |
| HT-0130–HT-0139 | BLOCKED | Coach/Player Xcode scheme, Debug/Release, unit, and UI commands require macOS/Xcode | Execute on connected Mac and retain `.xcresult` bundles |
| HT-0140 | NOT RUN | Native warnings/skips/flakes cannot be classified before native tests run | Triage every result after HT-0130–HT-0139 |

## Repository-specific findings

1. **Native builds exist as two separate projects.** Coach uses `com.kevinhouston.hooptrackcoach`; Player uses `com.kevinhouston.hooptrackplayer`; both currently advertise version 1.0 build 5 and iOS 17.0.
2. **Coach native push is implemented.** Coach registers with APNs and has an `aps-environment` entitlement with separate development/production build settings.
3. **Player native push is not proven.** Player has notification data surfaces but no native APNs delegate/registration or entitlement was found. This may be intentional; it must be a product decision rather than an assumed parity fix.
4. **Both native clients use the same configured service origin.** This pass centralized and validates the `HoopTrackAPIBaseURL` `Info.plist` key instead of scattering URL literals. The current value remains `sslip.io`; a branded production domain and environment-specific value remain release gates.
5. **Existing native tests provide useful API/mock and factory-screen coverage.** They do not by themselves prove a real Coach invitation reaches a real Player account against an isolated backend.
6. **The current GitHub build workflow deploys from `main`.** Audit runs in parallel and several audit steps are non-blocking; a protected, non-deploying PR qualification gate and macOS native workflow are still required.
7. **The deployment workflow copies production env files from the server to the runner and contains PM2 cutover logic.** It was inspected only; no workflow or server was triggered or changed.

## Initial risk register

| Risk | Severity | Evidence | Required mitigation |
| --- | --- | --- | --- |
| Native RC cannot be built/tested in this host | P0 release blocker | No `xcodebuild` on Linux | Connect controlled macOS/Xcode runner |
| Minor/guardian and coach-verification policy undecided | P0 release blocker | Product decision not recorded | Kevin + qualified privacy/legal owner decide before Phase 2 exits |
| Real cross-app invitation flow not yet proven | P0 release blocker | Existing tests are mocked/factory-focused | Add isolated backend cross-app automation and manual TestFlight proof |
| Player APNs intent/capability unclear | P1 | No Player native registration/entitlement found | Decide intended behavior, then implement/test or document N/A |
| Non-branded production origin value | P1 | Central native `HoopTrackAPIBaseURL` still contains `sslip.io` | Approve durable branded domain and environment-specific configuration |
| Transitive npm vulnerability | Resolved in this pass | `brace-expansion` advisory was removed by lockfile update; `npm audit` now reports zero | Keep dependency audit blocking for release candidates |
| Audit CI is not fully blocking | P1 | Workflow uses `continue-on-error` for findings | Establish required release checks with explicit exception process |
| Local Mac bridge unavailable | P1 operational blocker | Mount absent | Configure connector and verify marker read/write |
| Documented runtime mismatch | P1 build-reproducibility risk | Node 20/npm 11 vs Node 22/npm 10 | Pin and use documented versions in setup and CI |
| `.env.example` was missing | Resolved in this pass | Safe placeholder template added | Keep it synchronized and secret-free |

## Pass 1 next actions

1. Connect a macOS/Xcode host and execute HT-0104 plus HT-0130–HT-0140.
2. Generate the complete Coach/Player screen-feature and API-authorization matrices.
3. Repeat the now-clean dependency audit under the supported Node/npm toolchain.
4. Present Phase 2 decisions to Kevin without guessing legal, child-safety, monetization, or identity policy.

No TestFlight upload, App Store submission, deployment, server restart, or production mutation occurred during this pass.

## Phase 3–9 progress added during Pass 1

- Centralized each native target's API origin in a validated `HoopTrackAPIBaseURL` `Info.plist` value and removed scattered production URL literals from native API, web container, support, and privacy links.
- Corrected privacy-manifest user-content categories to declare other user content, photos/video, and audio; Coach also declares its linked APNs device identifier.
- Added invite rate limiting, privacy-safe unknown-email behavior, seven-day expiry, stale-invite filtering, HTTP 410 expiry handling, atomic last-slot capacity enforcement, and replay-safe conditional updates.
- Added isolated live-route integration coverage for role isolation, enumeration resistance, expiry, replay, and simultaneous capacity acceptance.
- Added a non-deploying PR workflow that runs the shared-service gate on Node 22 and runs both native projects on an available macOS iPhone simulator while retaining `.xcresult` artifacts.
- Ran the repository-executable verification gate three consecutive times; lint, TypeScript, integration, production build, and full npm audit passed in every loop.
- The first `npm run audit:all` exposed existing Knip findings; the continued pass below triaged them rather than waiving the failure.

## Continued readiness progress

- Triaged Knip/Depcheck findings with explicit entry/ignore configuration for operational scripts, static public applications, design-system source, CSS-only Tailwind dependencies, and offline storage code; removed five genuinely unused development packages and the obsolete Prisma workflow step.
- `npm run audit:all` now passes lint, TypeScript, Knip, Depcheck, circular analysis, license summary, production dependency audit, and tracked-file secret scanning.
- Added invitation revoke, Coach removal, and Player leave endpoints and accessible web controls with ownership checks and immediate relationship revocation.
- Added an object-level authorization matrix and membership-scoped Player lists, contacts, direct messaging, activity, recordings, schedules, calendars, progress, notifications, view-as, assignments, and Coach-owned content mutations.
- Replaced system-wide Trainer activity notification fanout with accepted connected-Coach fanout.
- Added Player APNs delegate, entitlement, Debug/Release environments, authenticated token registration, bundle-role validation, and privacy-manifest device-ID disclosure.
- Added Coach in-app account deletion and server cleanup of Coach teams, invitations, messages, owned training objects, dependent assignments/attempts/recordings/files, push/session data, while retaining Player accounts.
- Enforced 13+ and Terms/Privacy confirmation on web and native Player registration; updated public policy to disallow under-13 registration pending any future legally approved guardian design.
- Extended the live integration harness with cross-Coach/cross-Player negative checks, relationship revocation, APNs bundle-role binding, Coach deletion, and online SQLite backup/restore integrity.
- Added a release operations runbook, local tracked-file secret scan, CI CycloneDX SBOM generation, and Node 22/npm 10 engine pinning.
