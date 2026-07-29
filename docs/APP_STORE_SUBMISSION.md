# App Store Submission — HoopTrack Coach & Player

Two iOS apps ship from this repo:

| App    | Scheme             | Bundle ID                            | Push |
| ------ | ------------------ | ------------------------------------ | ---- |
| Coach  | `HooptrackCoach`   | `com.kevinhouston.hooptrackcoach`    | yes  |
| Player | `HooptrackPlayer`  | `com.kevinhouston.hooptrackplayer`   | no   |

Both target iOS 17.0, iPhone only, portrait only, Team `DD9G8RP575`, automatic signing.

Archiving and uploading requires macOS with Xcode. Xcode does not run on Linux
and there is no compatibility layer for it — Wine is Windows-only, and Darling
does not support Xcode. Virtualizing macOS is also not an option in a Linux
container: it needs KVM plus nested virtualization, and Apple's license permits
virtualizing macOS only on Apple hardware. Swift compiles on Linux, but without
the iOS SDK, the asset-catalog compiler, or code signing you cannot produce a
signed IPA.

## The automatic path (Kevin's Mac runner)

The shortest route is the self-hosted macOS runner already wired into
`baller70/kcloud-xcode-runner`. Pushing one branch there releases both apps:

```
release/hooptrack-both-6
```

That resolves to `mode=release`, clones this repository's `main`, and for each
app runs archive → export → validate → upload → attach → submit for review.
Nothing else needs touching.

**Credentials: nothing to supply.** That Mac already holds an App Store Connect
API key — App Factory ships with it. Its worker reads three values out of
`app-factory-standalone/worker/worker.env`:

```
ASC_KEY_ID
ASC_ISSUER_ID
ASC_KEY_PATH      # the AuthKey_<KEY_ID>.p8 on disk
```

and drives Xcode with exactly them:

```
xcodebuild -allowProvisioningUpdates \
  -authenticationKeyPath     "$ASC_KEY_PATH" \
  -authenticationKeyID       "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
```

`scripts/appfactory-credentials.sh` finds that env file and hands the same three
values to `appstore-release.sh` during preflight, so the release lane
authenticates the way App Factory already does. It reads the file without
sourcing it (those files hold unrelated secrets), prints no key material, and
registers the ids with `::add-mask::` on GitHub Actions.

Set `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_PATH` in the environment — or
supply them as repository secrets — to override the discovered key. Discovery
is skipped whenever the environment already carries a usable one.

One key covers everything. `-allowProvisioningUpdates` uses it to create the
Apple Distribution certificate and App Store provisioning profile — that Mac
has neither, only an Apple Development identity — and `altool` uses it to
upload. No certificate has to be exported by hand.

The runner has no login session, so its login keychain is locked and `codesign`
fails with `errSecInternalComponent`. The job works around that by creating a
throwaway keychain, unlocking it, and putting it ahead of the login keychain,
restoring the search path on exit. That is also where a newly minted
distribution private key lands.

The `.p8` is written from the secret at job start and deleted in an `always()`
step, so it never persists on the machine.

---

The remaining sections cover the fallbacks. Neither requires a local Mac to be
the bottleneck:

- **A GitHub-hosted macOS runner** (`.github/workflows/ios-appstore.yml`).
  Xcode is preinstalled. This is the path to use from a cloud agent or any
  machine that is not a Mac. See "Releasing without a Mac" below.
- **Your own Mac**, running `scripts/appstore-release.sh` directly. See
  "One-command release".

Both drive the same script, so behavior does not diverge between them.

## Releasing without a Mac

`.github/workflows/ios-appstore.yml` runs the release on `macos-15`. Trigger it
from the repo's Actions tab (or `gh workflow run ios-appstore.yml`) with:

| Input          | Meaning                                                     |
| -------------- | ----------------------------------------------------------- |
| `app`          | `coach`, `player`, or `both`                                 |
| `build_number` | `CFBundleVersion` — must exceed the last upload              |
| `stage`        | `archive`, `validate`, or `upload`                           |
| `xcode_version`| Optional; blank uses the runner default                      |

`stage` defaults to `validate`, which archives, exports, and runs Apple's
validation without shipping anything. Choose `upload` only when you mean to
send the build to App Store Connect. The IPA is attached to the run as an
artifact either way.

### Required repository secrets

| Secret                         | What it is                                        |
| ------------------------------ | ------------------------------------------------- |
| `APPLE_DIST_CERT_P12_BASE64`   | Apple Distribution certificate + private key, exported as `.p12` from Keychain Access, then `base64 -i cert.p12 \| pbcopy` |
| `APPLE_DIST_CERT_PASSWORD`     | The password set during that `.p12` export         |
| `ASC_KEY_ID`                   | App Store Connect API key ID                       |
| `ASC_ISSUER_ID`                | App Store Connect issuer ID                        |
| `ASC_KEY_P8_BASE64`            | The `AuthKey_<KEY_ID>.p8`, base64-encoded          |

The workflow imports the certificate into a throwaway keychain and deletes both
it and the `.p8` in an `always()` step. Provisioning profiles do not need to be
stored: `xcodebuild` creates and downloads them itself using the API key.

A note on cost: GitHub bills macOS minutes at 10× the Linux rate on private
repos, so a ~10-minute archive consumes roughly 100 minutes of quota. Prefer
`validate` while iterating on the release setup and `upload` once it is green.

### Other rented-Mac options

If GitHub Actions is not the right fit: Xcode Cloud (Apple's own, 25 free
compute hours/month, integrates directly with App Store Connect), MacStadium,
AWS EC2 Mac, Codemagic, or Bitrise. The repo also has
`scripts/kcloud-xcode-submit.sh`, which dispatches `doctor`/`build`/`test` jobs
to a separate macOS runner repo — that broker predates this workflow and does
not cover archive or upload.

## One-command release

If you do have a Mac, run it directly. From the repo on that Mac (an external
drive is fine — see below):

```bash
# Check the machine, the drive, signing config, and the backend first.
./scripts/appstore-release.sh coach preflight

# Archive -> export IPA -> validate -> upload.
export ASC_KEY_ID=XXXXXXXXXX
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
./scripts/appstore-release.sh coach  all --build 6
./scripts/appstore-release.sh player all --build 6
```

Stages also run individually: `preflight`, `archive`, `export`, `validate`,
`upload`. Preflight runs before every stage.

Artifacts land in `build/appstore/<app>/` (git-ignored).

### App Store Connect API key

Upload uses an API key, not an Apple ID password, so it never prompts for 2FA.

1. App Store Connect → Users and Access → Integrations → App Store Connect API.
2. Generate a key with the **App Manager** role.
3. Download `AuthKey_<KEY_ID>.p8` — it downloads exactly once.
4. Put it at `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`.
5. Export `ASC_KEY_ID` and `ASC_ISSUER_ID` in your shell.

Never commit the `.p8`, the key ID, or the issuer ID to this repo.

## Building from an external drive

The preflight checks these, but the reasoning matters:

- **Filesystem must be APFS or Mac OS Extended (Journaled).** On exFAT or
  FAT32 there are no POSIX permissions and no symlinks, so code signing
  produces a corrupt bundle or fails outright. Preflight refuses to continue.
  If the drive is exFAT, either reformat it or clone the repo to the internal
  drive and build there.
- **Quarantine attributes.** Files copied to an external drive from another Mac
  carry `com.apple.quarantine`, which surfaces as opaque build-phase permission
  errors. Run with `--fix-quarantine` to strip them.
- **DerivedData stays on the internal drive** (`~/Library/Developer/Xcode/DerivedData/hooptrack-release`).
  Building intermediates over USB is slow and, on a drive that sleeps, flaky.
  Override with `--derived <path>` if you need to.
- **Paths with spaces** (`/Volumes/My Passport/...`) are handled; the script
  quotes throughout.

## Build numbers

Both projects currently sit at `MARKETING_VERSION = 1.0`, `CURRENT_PROJECT_VERSION = 5`.

App Store Connect rejects a build whose `CFBundleVersion` is not higher than
the last one uploaded for that marketing version. Pass `--build <n>` to
override at archive time — the script sets it on the `xcodebuild` command line,
so the checked-in project stays clean and the repo is never dirtied by a
release. Bump `CURRENT_PROJECT_VERSION` in the project only when you want a new
baseline.

## Pre-submission audit

Verified in this repo:

- Icons: all 9 sizes present for both apps, correct dimensions, RGB with no
  alpha channel. (Alpha in the 1024 marketing icon is an automatic rejection.)
- `PrivacyInfo.xcprivacy` present for both, declaring name, email, user ID, and
  user content — all as app-functionality, none as tracking.
- `NSPrivacyAccessedAPITypes` is empty and that is correct: neither app uses
  `UserDefaults`, file-timestamp, or disk-space required-reason APIs. Adding
  any of those later means declaring them, or Apple emails an ITMS-91053 warning.
- Camera, microphone, and photo-library usage strings are present and specific.
- `ITSAppUsesNonExemptEncryption = false`, so no export-compliance prompt per upload.
- Coach Release config sets `APS_ENVIRONMENT = production`; Player has no push
  entitlement, matching its code.
- `FactoryScreenshotScene` is `#if DEBUG`-gated and does not ship in Release.
- Shared schemes exist for both apps, so `xcodebuild -scheme` works from CLI.

## Open risks before submitting

1. **Backend host.** Both apps point at
   `https://hooptrack.194-146-12-139.sslip.io` — wildcard DNS over a raw
   Contabo IP. App Review exercises the live backend; if it is down, or the TLS
   cert lapses mid-review, the result is a Guideline 2.1 rejection. A real
   domain with a monitored cert is strongly preferable before submitting.
2. **Demo accounts — player done, coach still missing.** Both apps open on a
   login screen, so review notes must carry working coach and player
   credentials or the reviewer cannot get past `AuthView`. This is the single
   most common first-submission rejection.

   **Player: live.** `appreview.player@hooptrack.app` / `AppReview2026!` was
   created through the public `POST /api/auth/register` endpoint and verified
   against production — login returns 200 and `/api/auth/me` returns the
   session. Nothing else on the host was touched.

   **Coach: blocked.** `registerSchema` pins `role` to `player`, and no route
   promotes a user to coach, so the coach account cannot be created over HTTP.
   It needs database access on the production host:

   ```bash
   ssh root@194.146.12.139
   cd <hooptrack deploy dir>
   HOOPTRACK_REVIEW_CONFIRM=yes node scripts/provision-review-account.mjs
   ```

   That script is additive only — it never deletes, is safe to re-run, puts the
   player on the coach's roster, adds one workout so the reviewer does not land
   on empty screens, and prints the block to paste into App Store Connect →
   App Review Information. Until it runs, **HoopTrack Coach cannot be
   submitted**; HoopTrack Player can.

   The accounts in `scripts/seed-design-data.mjs` do **not** exist on the
   production backend — logging in with `marcus@hooptrack.test` / `hooptrack`
   returns 401. That seed is also unusable here: it refuses to run on a
   database that already has users, and its `--force` path deletes every table.

   Run `scripts/provision-review-account.mjs` on the production host instead.
   It only ever touches the two designated review accounts, never deletes, and
   is safe to re-run:

   ```bash
   HOOPTRACK_REVIEW_CONFIRM=yes node scripts/provision-review-account.mjs
   ```

   It creates a coach and a player, puts the player on the coach's roster, adds
   one workout so the reviewer does not land on empty screens, and prints the
   block to paste into App Store Connect → App Review Information. Override
   `REVIEW_COACH_EMAIL`, `REVIEW_PLAYER_EMAIL`, and `REVIEW_PASSWORD` to change
   the defaults. Verify with the `curl` it prints before submitting.
3. **App Store Connect records.** Both bundle IDs must be registered in the
   Developer portal and have app records created with screenshots, description,
   keywords, support URL, privacy policy URL, and the privacy questionnaire
   completed. Upload succeeds without these; *submission* does not.
4. **Screenshots.** Required per device size Apple currently accepts. The
   Playwright tooling in `scripts/capture-real-store-screenshots.mjs` renders
   web surfaces, not the iOS apps — device-sized captures still need to come
   from the simulator or a real device.

## Troubleshooting

- `No signing certificate "iOS Distribution" found` — open Xcode → Settings →
  Accounts, sign in, and Download Manual Profiles. `-allowProvisioningUpdates`
  (already passed) lets Xcode create what is missing.
- `error: exportArchive: No profiles for 'com.kevinhouston.*' were found` — the
  bundle ID is not registered under Team `DD9G8RP575` yet.
- Upload succeeds but no build appears — processing takes 5–30 minutes. Check
  email for an ITMS rejection notice before re-uploading.
