# App Store Submission — HoopTrack Coach & Player

Two iOS apps ship from this repo:

| App    | Scheme             | Bundle ID                            | Push |
| ------ | ------------------ | ------------------------------------ | ---- |
| Coach  | `HooptrackCoach`   | `com.kevinhouston.hooptrackcoach`    | yes  |
| Player | `HooptrackPlayer`  | `com.kevinhouston.hooptrackplayer`   | no   |

Both target iOS 17.0, iPhone only, portrait only, Team `DD9G8RP575`, automatic signing.

Archiving and uploading requires macOS with Xcode. It cannot be done from a
Linux CI container or a cloud agent — those have no `xcodebuild` and no
signing identities.

## One-command release

From the repo on your Mac (external drive is fine — see below):

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
2. **Demo account.** Both apps open on a login screen. Review notes must carry
   working demo credentials for a coach and a player, or the reviewer cannot get
   past `AuthView`. This is the single most common first-submission rejection.
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
