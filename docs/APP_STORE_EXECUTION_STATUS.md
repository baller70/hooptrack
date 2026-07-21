# App Store Execution Status

**Updated:** 2026-07-21  
**Active pass:** Repository-executable passes 1–3 complete; external release gates remain
**Rule:** a phase is complete only when every applicable checklist ID has evidence. Repository readiness can advance without local Xcode, but native build/signing/device/TestFlight/App Store checks remain external gates rather than implied passes.

## Phase dashboard

| Phase | Status | Completed in repository | Remaining gate |
| --- | --- | --- | --- |
| 0 — approval and controls | In progress | Checklist IDs, evidence vocabulary, commit/PR traceability | Human owners and legal/safety decision owners |
| 1 — inventory and baseline | In progress | Repository/env inventory, clean web build, env template, diagrams, risk register | macOS/native evidence and final feature/API matrices |
| 2 — product/legal | Blocked externally | Enforced a technical 13+ registration floor and legal acceptance; public privacy/terms now match that rule | Qualified legal/privacy approval for age, Coach verification, payments, retention, regions |
| 3 — Apple configuration | In progress | Bundle IDs, versions, permissions, icons, manifests, API origin, and Coach + Player APNs entitlements/registration prepared | Apple account, signing, archive, APNs credentials, branded production domain |
| 4 — privacy/account/safety | In progress | Player and Coach in-app deletion, report/block, privacy manifests/pages, storage and env names implemented/reviewed | Processor/backup retention verification and qualified privacy/legal review |
| 5 — Coach↔Player authorization | In progress | Invite create/expiry/revoke, accept/decline, capacity race, Coach removal, Player leave, membership-scoped discovery/messaging/object access, and negative integration tests | Complete remaining route-negative tests and native/device proof |
| 6 — functional workflows | In progress | Live Next.js integration covers roles, invitations, membership lifecycle, APNs bundle binding, deletion, access revocation, and backup/restore | Full media, AI, offline, push-delivery, upgrade, and localization matrix |
| 7 — accessibility/performance | Not run | Existing UI tests include accessibility assertions | Physical/simulator devices, VoiceOver, Instruments, budgets, representative users |
| 8 — security/operations | In progress | Threat boundaries, clean dependency/dead-code/circular/secret audits, CI SBOM, isolated backup/restore proof, and incident/rollback runbook | Independent pentest, production staging/load/restore/alert drills |
| 9 — CI/RC | In progress | Non-deploying Ubuntu gate and macOS Coach/Player test job with `.xcresult` artifacts prepared; Node/npm pinned | Push/run workflow, protect it, signed immutable RC and distribution evidence |
| 10 — TestFlight | Blocked externally | Cohort/device/safety matrix, review accounts secret path, test focus, and soak scope prepared | Apple/TestFlight access, approved testers, distributed builds and executed soak |
| 11 — App Store Connect | Blocked externally | Separate Coach/Player record, descriptions, screenshot lists, privacy reconciliation, and exact reviewer journey drafted | Final assets/answers, legal/business approval, review accounts, signed upload, submit approval |
| 12 — launch/aftercare | Blocked externally | Deployment topology, stop thresholds, incident roles, backup/restore and rollback/compatibility runbook documented | Explicit deploy/release authorization, production drills/monitoring, support/on-call, phased release |

## Pass ledger

| Pass | Scope | Result |
| --- | --- | --- |
| 1 | Source/configuration audit and safe readiness implementation | **Repository scope passed.** Lifecycle, authorization, deletion, APNs, audit, CI, backup/restore, and release documentation fixes implemented; external gates recorded |
| 2 | Independent repeat of all repository-executable checks after Pass 1 fixes | **Repository scope passed.** Lint, typecheck, live-route integration, and production build repeated successfully |
| 3 | Final independent repeat against the current candidate configuration | **Repository scope passed.** The same gate passed a third consecutive time; this is not a signed or externally approved RC |

### Repository-executable verification loops

On 2026-07-21, `npm run verify` was run three consecutive times after the final authorization fixes. All three loops passed lint, TypeScript, the isolated live-route mobile-readiness integration test, and the 59-page production build. `npm run audit:all` separately passed dead-code, dependency-use, circular-import, license-inventory, production-vulnerability, and tracked-file secret checks. This is repeatability evidence for repository-executable scope only; it does not substitute for native CI, signed-device, TestFlight, independent security, privacy/legal, or production operational evidence.

## Verified invitation invariants

The repeatable `npm run test:mobile-readiness` test starts the real Next.js routes against an isolated SQLite database and proves:

- Player sessions cannot create Coach groups.
- Unknown Player emails receive an accepted, non-enumerating response.
- Real invitations receive a seven-day expiration timestamp.
- Two Players racing for the last roster slot result in exactly one membership.
- An accepted invitation cannot be replayed.
- An expired invitation returns HTTP 410, is cancelled, and creates no membership.
- The test database and generated Next output are removed after the run.

## Current failed or blocked checks

- `npm run audit:all` now passes Knip, Depcheck, circular analysis, license summary, production dependency audit, and tracked-file secret scanning. License obligations still require release-owner review.
- Native Xcode execution is not available locally; the new macOS GitHub job is the executable readiness path, but its first remote result is not yet available in this environment.
- Current native `Info.plist` files still use the reachable `sslip.io` origin value. Code now reads a single validated HTTPS configuration key, enabling a branded origin later without scattered source changes.
- Coach and Player deletion are now supported in-app and integration-tested for Coach-owned cleanup with Player-account retention; production backups/processors still require retention verification.
- Registration now technically requires a 13+ attestation plus Terms/Privacy acceptance, and public policy disallows under-13 registration. Qualified legal/privacy approval remains external; no under-13 guardian flow is claimed.
- The GitHub API returns `Not Found` for the new workflow because this commit is not present on the remote default branch; native CI evidence cannot exist until the committed workflow is pushed through the approved review path.

No deployment, PM2 action, production mutation, TestFlight upload, App Store Connect change, submission, or release was performed.
