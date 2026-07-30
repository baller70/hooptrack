# Environment contract

**Read this before telling Kevin that anything is missing.**

Across several environments the same hour was spent rediscovering access that
was configured all along, and Kevin was repeatedly told he "didn't have"
credentials he had already set up. He was right every time. This file is the
inventory so that never happens again.

## The rule

> Never tell Kevin a credential, host, device or capability does not exist
> until `scripts/env-preflight.sh` has been run in this environment and the
> relevant line came back MISS.

"I looked and couldn't find it" is not evidence. "The preflight reported MISS"
is. Two specific non-arguments, both of which have been used to reach a wrong
conclusion here before:

- Checking one binary on `$PATH` and two guessed variable names, then declaring
  there is no server access. The access was an HTTP exec bridge under variable
  names that were never checked.
- Running `xcodebuild -showdestinations -project /dev/null`, which errors and
  lists nothing, then reporting that as proof no iPhone was attached. It proves
  nothing except that `/dev/null` is not an Xcode project.

## One command

```bash
bash scripts/env-preflight.sh
```

Read-only, no secret values printed, finishes in seconds. It reports the
repository, runtime, GitHub reach, the Contabo exec bridge (with a live
round-trip), the public site, and whether the App Store Connect key is on this
machine. Everything below explains what each line means.

## Capability map

| Capability | How it is reached | Where it works |
|---|---|---|
| Production host (root shell) | `KC_FULL_BRIDGE_URL` + `KC_FULL_BRIDGE_TOKEN`, HTTP POST `{"command": "..."}` | any environment with those vars |
| Production host (SSH) | `CONTABO_SSH_PRIVATE_KEY_B64` → `scripts/kcloud-contabo-ssh-setup.sh` | when the secret is configured |
| Production database | `sqlite3 /opt/apps/hooptrack/data/hooptrack.db` **via the bridge** | via bridge |
| Deploy | `./deploy.sh` — builds locally, rsyncs `.next`, restarts PM2 | Kevin's Mac |
| GitHub | `GITHUB_TOKEN` + the GitHub MCP tools | any environment |
| Xcode, signing, archive, upload | self-hosted Mac runner, driven by the broker repo | Kevin's Mac only |
| App Store Connect API | ES256 JWT from the App Factory `.p8` key | Mac only (key lives there) |
| Install onto the iPhone | `scripts/install-on-device.sh` via the Mac runner | Mac only |

Environment variables this repo expects, **by name only** — never commit values:

`KC_FULL_BRIDGE_URL`, `KC_FULL_BRIDGE_TOKEN`, `CONTABO_HOST`,
`CONTABO_PUBLIC_HOST`, `CONTABO_SSH_PRIVATE_KEY_B64`, `GITHUB_TOKEN`.

## Contabo production

- Host is `vmi3325810`, reached as `root`. The bridge answers as `mode:
  full-control`, so treat every command as production-live.
- App lives at `/opt/apps/hooptrack` and **is a full git checkout** on `main`
  with `origin` set to the GitHub repo — it is not a bare artifact directory.
- Its working tree carries local edits to `package.json` and `pnpm-lock.yaml`
  (the Node 22 native-module ABI pin). **Do not `git checkout` a whole branch
  there** — it will take those with it. Check out individual paths, or deploy
  with `deploy.sh`, which does not touch them.
- PM2 process name is `hooptrack`. The host runs roughly fifteen other PM2
  apps; never restart anything else.
- Database: `/opt/apps/hooptrack/data/hooptrack.db`, SQLite. Use the `sqlite3`
  CLI, not `better-sqlite3` — the server's default `node` is v24 while the
  native module is built for Node 22, so requiring it from an ad-hoc script
  fails on ABI mismatch.
- Deploying builds locally and rsyncs `.next`, keeping the previous build as
  `.next.old` for rollback. Building in place under the running server is not
  safe: Next serves chunks off `.next` on disk, so an in-place rebuild without
  an immediate restart breaks the live site.

## App Store pipeline

Everything Xcode-related runs on the Mac runner. From a Cloud container you
drive it by pushing a branch whose name selects a mode:

| Branch pattern | Does |
|---|---|
| `release/<repo>-<app>-<build>[--on--<ref>]` | archive, sign, validate, upload |
| `status/<repo>` | read-only App Store Connect status |
| `testflight/<repo>-<build>` | attach a build to the internal group |
| `devices/**` | list attached devices |

**The `--on--<ref>` suffix trap, hit twice:** the text after `--on--` is the ref
cloned from the hooptrack repo. Appending anything to it (`-tf`, `-b`, a retry
suffix) changes which ref is cloned and the clone fails. Vary the part *before*
`--on--`, never the part after.

Scripts, all of which discover the key the same way:

- `scripts/appfactory-credentials.sh` — locates the App Factory `.p8`. It
  checks an **explicit list of paths and never searches.** An earlier version
  ran `find -maxdepth 6` across multi-terabyte external drives and burned a
  90-minute CI job one line into its output. Add paths to the list; do not
  reintroduce a search.
- `scripts/appstore-release.sh` — preflight, archive, export, validate, upload,
  submit.
- `scripts/appstore-check-readiness.mjs` — read-only status: versions, builds,
  TestFlight groups, review demo account, submission state.
- `scripts/appstore-submit-for-review.mjs` — submits, and **waits** for Apple to
  finish processing first. A build uploaded seconds ago is not submittable;
  processing takes 5–30 minutes.
- `scripts/testflight-internal.mjs` — internal group, build attach, tester
  invite. Internal testing needs no beta review.
- `scripts/install-on-device.sh` — builds Debug and installs straight onto the
  iPhone with `devicectl`.

Full runbook, credential inventory, TestFlight and device-install procedure:
`docs/APP_STORE_SUBMISSION.md`.

JWT details that are easy to get wrong: ES256, `aud: appstoreconnect-v1`, and
signatures **must** use `dsaEncoding: 'ieee-p1363'` (64-byte r‖s). DER is
rejected. Use `node:crypto` and not `jose` — the Mac runner has no npm, and a
hard failure on `npm install jose` once killed a job after the first app had
uploaded, so the second never built.

## Installing on the iPhone

Not the App Store path — an app-store-signed IPA cannot be installed directly.
`scripts/install-on-device.sh` builds Debug with a development identity minted
through the API key and hands the result to `devicectl`.

Two traps, both already fixed in that script but worth understanding:

1. **`errSecInternalComponent`.** codesign cannot unlock `login.keychain` from a
   launchd process with no GUI session, so signing dies *after* the app has
   compiled. The fix is a throwaway unlocked keychain.
2. **Default keychain is not the same as visible keychain.** `security
   default-keychain` controls where *new* keys are written; `security
   list-keychains -d user -s` controls which existing identities are *visible*.
   Making the throwaway keychain default was not enough — automatic signing kept
   picking the unusable identity in `login.keychain`. It has to be removed from
   the search path.

Both settings are **per-user and shared with Kevin's GUI session.** Leaving a
throwaway keychain on the search path makes macOS prompt him for a password
that was generated, used and discarded inside a CI run. The script restores
them in a `trap ... EXIT INT TERM`; keep it that way, and keep it to one trap —
a second `trap ... EXIT` silently replaces the first.

Also: `devicectl`'s `tunnelState` says whether a network tunnel is up, which is
a different question from whether the device can be installed to. A
USB-attached phone can read `disconnected` and install fine. Warn, then let
`devicectl` decide.

## Accounts

Roles are `trainer` (the Coach app) and `player` (the Player app). Emails are
unique, so **one email is one account with one role** — the same login cannot
work in both apps. `/player` redirects a trainer to `/coach`, which looks like
"the player app shows me the coach screen".

App Review demo accounts, one per app:

- `app-review+hooptrackcoach@thebasketballfactorynj.com` — trainer
- `app-review+hooptrackplayer@thebasketballfactorynj.com` — player

Note the **hyphen**: `app-review+…`, not `appreview…`. Searching the users
table for `LIKE '%appreview%'` matches neither, and once led to the wrong
conclusion that the accounts did not exist — followed by overwriting a password
Apple already held, desyncing it from review.

There is a built-in "view as player" feature for trainers
(`/api/auth/view-as`, honored by `lib/session.ts`) if a coach needs to see the
player experience without a second account.

## What a Cloud agent is blocked from doing

These are refused by the permission layer regardless of Kevin's approval in
chat. Do not try to route around them — hand Kevin the command instead.

| Blocked | Do this instead |
|---|---|
| `pm2 *` (including read-only `pm2 describe`) | Kevin runs `./deploy.sh` from his Mac |
| Writing to the production `users` table | Kevin registers through the app UI |
| Posting credentials to the live site | same |

Reads through the bridge — `sqlite3` SELECTs, `ls`, `git status` — work fine.

## Build verification

```bash
npm run lint
npm run typecheck
NODE_ENV=production npm run build
```

`NODE_ENV=production` is not optional and must be on the command itself; a
`.env.local` entry will not override an exported shell variable. Without it
Next resolves React through the `development` export condition while emitting a
production server, the two Reacts disagree about the hook dispatcher, and every
prerender dies with `Cannot read properties of null (reading 'useContext')`.
Next warns about the non-standard value near the top of the build log — that
warning is the tell.
