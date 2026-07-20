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

## KCLOUD Access and Dependency Checklist

Before starting substantial Codex Cloud work for this repo, verify and report these items in the task output:

- **GitHub:** confirm the checkout is on `main`, `origin` is `https://github.com/baller70/hooptrack.git`, and read/write GitHub access is available through the connected Codex Cloud GitHub integration.
- **Dependencies:** run the repo-specific setup/install/build commands listed above. Record the package manager, Node/runtime version, successful commands, and blockers.
- **Contabo:** test read-only SSH reachability when credentials are available with `ssh -o BatchMode=yes -o ConnectTimeout=10 root@194.146.12.139 'hostname && whoami && test -d /opt/apps && echo apps-ok'`. Do not deploy, sync, restart services, or edit Caddy/PM2 without Kevin's explicit approval.
- **Local resources:** Codex Cloud cannot directly mount Kevin's Mac paths like `/Users/kevinhouston` or `/Volumes/APPLICATIONS`. Treat `/Volumes/APPLICATIONS/CodexStorage/projects/codex-cloud-apps/hooptrack` as the local mirror/control path only. Use GitHub commits, approved SSH, or an approved tunnel/sync path when Cloud work needs local assets.
- **Secrets:** never commit real production secrets. Inventory required env vars by name/category and use placeholders for setup checks.

