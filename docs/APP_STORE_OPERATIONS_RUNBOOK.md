# HoopTrack Mobile Release Operations Runbook

This runbook defines the release controls that can be prepared in Git. It does not authorize production use. Replace placeholders only in an approved environment; never commit their values.

## Release artifact identity

Before TestFlight or production, record:

- Git commit and signed tag.
- Coach version/build, bundle ID, archive SHA-256, provisioning profile UUID, signing certificate, privacy report, and dSYM checksum.
- Player version/build, bundle ID, archive SHA-256, provisioning profile UUID, signing certificate, privacy report, and dSYM checksum.
- Backend build ID, dependency-lock checksums, migration version, environment/configuration version, and SBOM checksum.
- App Store Connect metadata revision, review-account revision, and reviewer-walkthrough revision.

Any change to source, lockfile, build setting, entitlement, privacy manifest, environment-facing configuration, schema, or backend contract invalidates the RC and requires requalification.

## Backup and restore

### Automated isolated proof

`npm run test:mobile-readiness` creates an isolated migrated SQLite database, takes an online backup, opens it read-only, runs `PRAGMA integrity_check`, confirms migration version 19, and compares retained user counts.

### Production rehearsal (requires explicit authorization)

1. Quiesce or use SQLite's online backup API; never copy a live WAL database as a lone `.db` file.
2. Write the encrypted backup to a non-public, access-controlled destination.
3. Record start/end time, database size, SHA-256, key owner, retention class, and operator.
4. Restore to an isolated non-production directory and start an isolated service port with outbound push/email/AI disabled.
5. Run `PRAGMA integrity_check`, migration-version check, table counts, and synthetic Coach→Player flow.
6. Delete the temporary restore under the approved retention policy.
7. Record measured RPO/RTO and defects. A backup without a successful restore is not a pass.

## Monitoring and stop thresholds

Pause a phased release immediately for any of:

- Any cross-account or cross-team data exposure.
- Any under-13, abuse-report, blocking, or moderation failure.
- Account deletion not completing or deleting another account's data.
- Invitation acceptance exceeding roster capacity or succeeding after revoke/expiry.
- Login success rate below 98% for 10 minutes, excluding confirmed hostile traffic.
- Crash-free sessions below 99.5% or any repeatable launch crash.
- API 5xx above 2% for 10 minutes or p95 above 3 seconds for 15 minutes.
- Upload failure above 5% for 15 minutes.
- Database integrity, disk, backup, restore, APNs credential, or TLS-certificate alarm.

Required dashboards: availability, HTTP status/latency, authentication, invite creation/response, authorization denials, messages/reports/blocks, uploads, storage/disk, SQLite busy/latency/integrity, APNs/web-push outcomes, AI failures/cost, account deletion, process restarts, crash/hang metrics, and support/safety queue age. Payloads must not contain private messages, tokens, videos, passwords, or minors' details.

## Incident roles and first actions

| Role | First action |
| --- | --- |
| Incident commander | Declare severity, stop release, open timeline, assign owners |
| Security/privacy | Preserve minimal authorized evidence, rotate/revoke access, assess notification duties |
| Child-safety owner | Apply safeguarding escalation reviewed by qualified counsel; do not investigate through personal accounts |
| Engineering | Contain with feature disablement or compatible server rollback; preserve old-client compatibility |
| Support/communications | Publish accurate status and safe user instructions; never request passwords/private videos |

For suspected data exposure: disable the affected surface, preserve authorized logs, revoke compromised credentials/tokens, identify affected object IDs/accounts without opening content unnecessarily, engage qualified privacy/legal ownership, and document decisions and timestamps.

## Rollback and compatibility

iOS binaries already installed cannot be recalled instantly. The backend must support the current and previous supported mobile contracts. Rollback order:

1. Pause App Store phased release.
2. Disable the affected feature server-side if the kill switch is proven safe.
3. Roll back only to a schema-compatible backend artifact.
4. Run synthetic standalone Player and Coach→Player journeys.
5. Confirm authorization, deletion, messages, media, and push before resuming.
6. Ship an expedited mobile patch if the installed binary itself is unsafe.

## Launch checks

- Confirm explicit submission and release approvals name exact app versions/builds.
- Confirm review and production accounts are non-personal, monitored, and functional.
- Confirm DNS/TLS, API, database, storage, APNs, web push, AI, quotas, backups, dashboards, alerts, status page, and support contacts.
- Confirm no secret in Git, app bundles, dSYMs, SBOM, logs, screenshots, metadata, or review notes.
- Run distributed-build standalone Player and Coach→Player synthetic journeys immediately before and after availability.
- Hold documented 24-hour and 7-day reviews.
