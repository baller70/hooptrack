# HoopTrack production readiness

## Environments and promotion

- **Local:** `npm run dev` with `.env.local` copied from `.env.example` and fake data only.
- **Automated test:** temporary SQLite data and synthetic `example.test` users. `npm run verify` is the required code gate; `npm run test:e2e` is the browser gate.
- **Staging:** required before production, but no staging URL is currently assigned. Provision a TLS endpoint with isolated storage, VAPID keys, APNs sandbox credentials, and review accounts.
- **Production:** Contabo/PM2 is the documented target. Deployment, synchronization, Caddy changes, and PM2 actions require Kevin's explicit approval.

Promote the exact tested commit from staging. Never rebuild an unpinned working tree during promotion.

## Release gate

1. Run `npm ci`, `npm run verify`, and `npm run test:e2e` on Node 22/npm 10.
2. Run both iOS schemes in Debug and Release and retain `.xcresult` artifacts.
3. Confirm the staging smoke test, Web Push, APNs sandbox, upload, account deletion, and backup restore.
4. Review dependency and secret scans with no unexplained Critical or High result.
5. Record the commit, database schema version, artifact hashes, operator, and rollback point.

## Backup and restore

- Back up SQLite with its online backup API rather than copying an active database file.
- Back up recordings and attachments with versioning and retention independent of the application host.
- Encrypt backups, restrict access, and test restoration into an isolated directory at least monthly.
- Before deployment, record a database backup and the previous application commit/artifact.
- Restore by stopping application writes, validating the backup with `PRAGMA integrity_check`, restoring media, and starting the previous known-good artifact. PM2 commands require explicit approval.

The automated SQLite readiness test exercises online backup, restore integrity, WAL, busy timeout, and alternating connections with temporary data.

## Rollback

1. Stop promotion when health checks fail; do not continue partial rollout.
2. Select the previous tested artifact and compatible schema backup.
3. Restore into a new path first and run integrity checks.
4. Switch traffic only after authentication, schedule, message, and recording smoke checks pass.
5. Preserve failed logs and data for incident analysis.

## Observability

- Emit structured server logs with request ID, route, status, latency, and sanitized error category. Never log credentials, cookies, private keys, message attachments, or complete device tokens.
- Add error tracking for server exceptions, browser errors, and native crashes before launch.
- Add uptime checks for `/`, `/login`, and a dedicated non-database health endpoint.
- Alert on sustained 5xx responses, authentication failure spikes, disk pressure, backup failure, push rejection rate, and process restarts.
- Use privacy-respecting analytics only after documenting consent and retention.

## Security and secrets

All real JWT, VAPID, APNs, AI, SSH, and review credentials belong in environment or Cloud secret storage. `.env.example` contains names and placeholders only. Rotate credentials after exposure and periodically according to the owner-managed schedule.

Run dependency audit, secret scanning, and static analysis in CI. Authorization tests must cover unauthenticated, Player, Coach, and unrelated-user access for every API mutation.

The July 22, 2026 dependency review found vulnerable transitive `brace-expansion` and `sharp` versions. Root overrides pin the patched `brace-expansion` 1.x release and Sharp 0.35.3; `npm audit --omit=dev` is the production gate, while the full audit also covers development tooling.

## Media lifecycle

Staging validation must cover supported maximum files, malformed media, interrupted transfers, retries, storage exhaustion, and cleanup of temporary/orphaned files. A failed upload must never create a UI success state. Cleanup tooling must default to dry-run.

## PWA and push

Before promotion, install the current PWA, update it to the candidate build, verify cache cleanup and offline messaging, then test reconnect without duplicate mutations. Validate browser notification grant/deny, stale subscription cleanup, APNs sandbox delivery, invalid token cleanup, and notification deep links.

## Ownership gaps before production

- Assign a staging URL and operator.
- Select error monitoring, uptime, and analytics providers.
- Define backup retention and recovery objectives.
- Record incident, rollback, and credential-rotation owners.
