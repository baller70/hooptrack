# KCLOUD Access Verification — 2026-07-21

This is setup evidence only. It does not authorize deployment, production changes, TestFlight, submission, or release.

| Area | Result | Evidence / exact finding |
| --- | --- | --- |
| Environment identity | **Mismatch recorded** | Configured group is `KCLOUD-BUILDOUT-20260720-SALES`; requested group is `KCLOUD-BUILDOUT-20260720`. Repository is `baller70/hooptrack`; environment label in `AGENTS.md` is `KCLOUD-BUILDOUT-20260720-SALES-02-hooptrack-main-PWA`. Current working branch is `work`, not `main`. |
| GitHub origin | **PASS** | Fetch and push URLs are both `https://github.com/baller70/hooptrack.git`. |
| GitHub read | **PASS** | `git fetch origin main --dry-run` returned exit 0 and populated `origin/main`. |
| GitHub write integration | **PASS (dry run only)** | `git push --dry-run origin HEAD:refs/heads/codex-readiness-write-check` returned exit 0; no branch was created. |
| Runtime | **Mismatch recorded** | Host has Node `v20.20.2` and npm `11.4.2`; repository requires Node 22.x and npm 10.x. CI is pinned to Node 22 and npm lockfile installation. |
| Internet | **PASS** | HTTPS returned 200 for GitHub, npm registry, Apple App Review Guidelines, HoopTrack support, and HoopTrack privacy. No tested host was blocked. |
| Contabo safe read/write | **PASS** | `bash scripts/kcloud-contabo-ssh-setup.sh` used the authenticated HTTPS bridge, confirmed host `vmi3325810`, user `root`, read-only `/opt/apps` existence, and create/read/delete only under `/tmp`. No deployment or service action occurred. |
| Local Mac bridge | **BLOCKED** | Configured `LOCAL_BRIDGE_PATH` resolved to `/Users/kevinhouston`, which is not mounted. The required `/Volumes/APPLICATIONS/CodexStorage/kcloud-local-bridge/rw-tests` connector is also unavailable in this Linux environment. |
| Xcode build/test | **PASS through connectors** | GitHub macOS CI and the KCLOUD Xcode broker both passed Coach and Player simulator builds, unit tests, and UI tests; retained evidence is indexed in `docs/NATIVE_CI_EVIDENCE.md`. |
| Apple roles/signing | **BLOCKED** | No Apple Developer/App Store Connect roles, distribution certificates, provisioning profiles, APNs credentials, or signed archive access is attached. Simulator evidence cannot prove distribution signing. |
| Secrets | **PASS for Git** | Environment-variable names are inventoried in `.env.example`; staged tracked-file secret scanning is mandatory. Values were neither printed nor committed. |
| Preview | **Previously verified; no perceptible UI change in this pass** | Registration and team membership controls were visually checked in the prior candidate. This pass changes response headers, API abuse limits, CI policy, and evidence tooling only. |
| Staging | **BLOCKED** | No separately approved persistent staging target or credentials are documented. The production deployment workflow contains a temporary pre-cutover process, but it is not a safe persistent TestFlight staging environment. |

## Exact next environment action

Configure the approved KCLOUD group and local bridge mount, then push the reviewed commit so the non-deploying `mobile-readiness` macOS job can run. Configure GitHub's `production` environment with required reviewers before any manual deployment workflow can proceed.
