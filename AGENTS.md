<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HoopTrack Agent Instructions

## Codex Cloud Environment

Group: `KCLOUD-BUILDOUT-20260720`

Environment label: `KCLOUD-BUILDOUT-20260720-SALES-02-hooptrack-main-PWA`

This repo is part of Kevin Houston's sale/buildout push. Use a fresh Codex Cloud environment for install, build, test, PWA/offline/push review, and production-readiness work. Push setup changes directly to `main` unless Kevin gives different instructions.

## Required Reading

Before editing, read:

- `AGENTS.md`
- `README.md`
- `package.json`
- `.env.example`
- the relevant files under `app/`, `components/`, and `lib/`

## Operating Rules

- Keep changes scoped and reviewable.
- Do not deploy unless Kevin explicitly approves.
- Do not invent production secrets or commit `.env` files.
- Do not run PM2 commands without Kevin approval.
- Keep the PWA/offline/web-push behavior intact unless the task is specifically to change it.
- For UI work, use visual verification and report what was checked.
- Native dependency note: this app uses `better-sqlite3`; expect native build requirements in Cloud.

## Setup

Use npm first. The README requires Node 22.x and npm 10.x, and the repo has `package-lock.json`.

```bash
npm install
```

## Verification

Run targeted checks for the files you touch. For setup/build-readiness work, prefer:

```bash
npm run lint
npm run typecheck
npm run build
```

Optional deeper audit:

```bash
npm run audit:all
```

## Commands To Avoid Without Kevin Approval

```bash
pm2 start ecosystem.config.js
pm2 restart hooptrack
pm2 save
```

Do not create real JWT/VAPID production secrets in the repo. Use local-only placeholder values inside the Cloud environment when needed.

## First Cloud Task Direction

The first fresh Codex Cloud environment should run a PWA setup/build-readiness pass:

- confirm Node/npm requirements
- run install, lint, typecheck, and build
- audit PWA, offline, SQLite, and web-push setup
- list missing environment variables and deployment risks
- implement only one scoped setup or readiness fix if clearly safe

## Final Response Required

Include:

- files changed
- commands run
- build/test result
- visual verification result if UI changed
- remaining risks
- exact next step for Kevin

## KCLOUD Remote Work Options

Every Codex Cloud environment for this repo must verify these setup options before doing substantial build or product work:

1. **Environment identity**: confirm group `KCLOUD-BUILDOUT-20260720`, repo `baller70/hooptrack`, branch `main`, and the approved environment label from this file.
2. **GitHub read/write**: confirm `origin` is `https://github.com/baller70/hooptrack.git`, fetch/pull `main`, and report whether the Cloud environment can create commits/patches through the connected GitHub integration.
3. **Internet/network**: verify outbound DNS/HTTPS access with lightweight checks to GitHub, npm/package registry as applicable, and the app's required public endpoints. Record any blocked host.
4. **Dependencies/runtime**: run the repo-specific install/build/check commands in this file. Report Node/runtime version, package manager, commands attempted, commands passed, and blockers.
5. **Visual interface/preview**: when the repo has a web UI or static UI, start the safest local/Cloud preview command, open it through the available Codex/browser preview surface, and report the preview URL plus visual result. If no visual app exists, state why.
6. **Contabo read/write**: verify safe SSH read/write access when credentials are available using only a temporary marker under `/tmp`; do not touch `/opt/apps` except for read-only existence checks. Never deploy, restart services, edit Caddy/PM2, or sync files without Kevin's explicit approval.
7. **Local Mac bridge read/write**: verify the Cloud environment can create/read/delete a marker under `/Volumes/APPLICATIONS/CodexStorage/kcloud-local-bridge/rw-tests`. Treat `/Volumes/APPLICATIONS/CodexStorage/projects/codex-cloud-apps/hooptrack` as the local mirror/control path for this repo.
8. **Secrets/env**: inventory required environment variables by name and category only. Use placeholders for checks. Never commit real production secrets, OAuth tokens, Gmail credentials, S3 keys, database passwords, or private SSH keys.
9. **Agent instructions**: read root `AGENTS.md` plus any directory-level instruction file before touching files. For repos where `AGENTS.md` is a symlink or adapter, follow the linked instruction file too.
10. **Remote-work report**: final Cloud output must include a checklist for GitHub, internet, dependencies, visual preview, Contabo read/write, local bridge read/write, secrets/env, blockers, and exact next step.

If any option fails, stop guessing and print the exact command, exact error, and the missing credential, connector, mount, or environment setting.

## KCLOUD Access and Dependency Checklist

Before starting substantial Codex Cloud work for this repo, verify and report these items in the task output:

- **GitHub:** confirm the checkout is on `main`, `origin` is `https://github.com/baller70/hooptrack.git`, and read/write GitHub access is available through the connected Codex Cloud GitHub integration.
- **Dependencies:** run the repo-specific setup/install/build commands listed above. Record the package manager, Node/runtime version, successful commands, and blockers.
- **Contabo read/write:** verify SSH read/write access when credentials are available with `ssh -o BatchMode=yes -o ConnectTimeout=10 root@194.146.12.139 'set -e; hostname; whoami; test -d /opt/apps && echo apps-ok; marker=/tmp/kcloud-rw-$(date +%s)-$; printf kcloud-rw-test > "$marker"; cat "$marker"; rm "$marker"; echo rw-ok'`. Do not deploy, sync, restart services, or edit Caddy/PM2 without Kevin's explicit approval.
- **Local Mac bridge read/write:** verify the Codex Cloud environment can reach Kevin's local bridge by creating, reading, and deleting a marker under `/Volumes/APPLICATIONS/CodexStorage/kcloud-local-bridge/rw-tests`. Treat `/Volumes/APPLICATIONS/CodexStorage/projects/codex-cloud-apps/hooptrack` as this repo's local mirror/control path. If the bridge path is not mounted, report the exact missing connector instead of silently falling back.
- **Secrets:** never commit real production secrets. Inventory required env vars by name/category and use placeholders for setup checks.

