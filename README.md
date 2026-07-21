# HoopTrack

A basketball tracking application for managing players, sessions, drills, and progress. Built as a Next.js App Router project with offline-capable PWA support and web push notifications.

## Tech Stack

- **Framework:** Next.js 16 (App Router) on React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui + tw-animate-css
- **UI primitives:** Base UI, lucide-react, sonner (toasts)
- **State & forms:** react-hook-form + zod resolvers
- **Drag & drop:** @dnd-kit
- **Charts:** recharts
- **Calendar:** FullCalendar
- **Storage:** better-sqlite3 (server), idb (client IndexedDB)
- **Auth:** jose (JWT) + bcryptjs + cookies-next
- **PWA / Push:** @ducanh2912/next-pwa + web-push (VAPID)
- **Process manager:** PM2

## Requirements

- Node.js 22.x
- npm 10.x
- A POSIX environment for `better-sqlite3` native bindings

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   - Generate JWT_SECRET:    openssl rand -hex 32
#   - Generate VAPID keys:    npx web-push generate-vapid-keys
#   - Fill the values in .env.local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app in development.

## Environment Variables

All variables are documented in [`.env.example`](./.env.example). Summary:

| Variable                       | Required | Purpose                                              |
| ------------------------------ | -------- | ---------------------------------------------------- |
| `NODE_ENV`                     | yes      | `development` / `production`                         |
| `JWT_SECRET`                   | yes      | Signs auth JWTs. 32+ byte hex.                       |
| `VAPID_PUBLIC_KEY`             | yes      | Web Push public key.                                 |
| `VAPID_PRIVATE_KEY`            | yes      | Web Push private key. **Never expose to client.**    |
| `VAPID_SUBJECT`                | yes      | `mailto:` or `https:` contact for push services.     |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | yes      | Same as `VAPID_PUBLIC_KEY`, exposed to the browser.  |
| `CLAUDE_CLI_PATH`              | no       | Absolute path to Claude CLI binary, if integrated.   |

## NPM Scripts

| Script          | Purpose                                  |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start Next.js in development mode        |
| `npm run build` | Production build (`.next/`)              |
| `npm run start` | Start the production server              |
| `npm run lint`  | Run ESLint                               |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run test:mobile-readiness` | Exercise role, invitation, membership, APNs, deletion, and backup invariants against isolated live routes |
| `npm run verify` | Run lint, typecheck, mobile-readiness integration, and production build |
| `npm run audit:all` | Run dead-code, dependency, cycle, license, vulnerability, and tracked-secret checks |

## Production Deployment (PM2)

The app is supervised by PM2 using [`ecosystem.config.js`](./ecosystem.config.js).

```bash
# Build
npm run build

# Start / reload under PM2
pm2 start ecosystem.config.js
pm2 restart hooptrack
pm2 logs hooptrack --lines 50

# Persist across reboots
pm2 save
```

The production process listens on the port configured in `ecosystem.config.js` (default `3200`). Front it with a reverse proxy (nginx/Caddy) for TLS termination.

## Project Layout

```
app/             Next.js App Router routes, layouts, server actions
components/      Reusable React components (UI + feature)
lib/             Server utilities (db, auth, push, helpers)
public/          Static assets, PWA icons, service worker assets
scripts/         Operational scripts (migrations, seeding, maintenance)
data/            Runtime data (SQLite db, persisted state)
```

## Security Notes

- `.env.local` and `data/` are excluded from version control via `.gitignore`.
- JWTs are signed server-side with `JWT_SECRET`; rotate by updating the secret and invalidating sessions.
- VAPID private key MUST remain server-side; only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is sent to the browser.
- Native modules (`better-sqlite3`) require rebuild on Node version changes: `npm rebuild better-sqlite3`.

## Troubleshooting

- **Build fails on `better-sqlite3`:** ensure build toolchain is installed (`apt-get install build-essential python3`) and run `npm rebuild`.
- **Push notifications not delivered:** verify `VAPID_*` values match between server and the public key registered in the browser subscription.
- **PM2 process keeps restarting:** check `pm2 logs hooptrack --err --lines 100` and confirm `.env.local` is present in the working directory.
