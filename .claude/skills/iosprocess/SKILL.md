---
name: iosprocess
description: Ship an iOS app from an Xcode project through code signing, App Store Connect upload, TestFlight and App Review, or install it directly onto a physical iPhone. Use when asked to submit, release, archive, upload, notarize, TestFlight, or "put the app on my phone", and when debugging a signing, provisioning, upload or review-submission failure. Covers the App Store Connect API, self-hosted Mac runners, and the failure modes that cost the most time.
---

# Shipping an iOS app

A procedure that has taken two apps from a git push to App Review with no
manual step, plus the failures that had to be solved to get there. Every trap
below cost at least one failed run, and several cost hours.

## Before anything: do not claim a credential is missing

Signing keys, API keys and paired devices are usually already configured. The
most expensive failure mode is not a broken build — it is confidently telling
the user that access does not exist when it does, and making them prove
otherwise.

Check, with evidence, before asserting absence:

- The **exact variable names** the project uses, not names you guessed. Read
  the setup scripts and docs first.
- The **explicit paths** a credential helper checks — then check those paths.
- Whether a *helper script already exists* that finds it. It usually does.

Two real wrong conclusions to avoid repeating: checking one binary on `$PATH`
plus two guessed variable names and declaring there was no server access (an
HTTP exec bridge was configured all along), and running `xcodebuild
-showdestinations -project /dev/null` — which errors and lists nothing — then
reporting that as proof no iPhone was attached.

## Per-app parameters

Collect these once; everything else follows.

| Parameter | Where to find it |
| --- | --- |
| Scheme and `.xcodeproj` | `xcodebuild -list` |
| Bundle ID | `PRODUCT_BUNDLE_IDENTIFIER` in build settings |
| Team ID | Apple Developer → Membership, or `DEVELOPMENT_TEAM` |
| App ID (numeric) | App Store Connect API, by bundle ID |
| Marketing / build number | `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION` |

## Authentication: the App Store Connect API key

Use an API key, never an Apple ID password — no 2FA prompt, works headless.

A key almost certainly already exists on the Mac. Look for `AuthKey_*.p8` in
`~/.appstoreconnect/private_keys/`, in the project's own credential helper, or
in a sibling project's. **Ask the user only after checking those.**

Signing the JWT, where three details are each fatal if wrong:

```js
import crypto from 'node:crypto'   // NOT jose — a Mac runner may have no npm
const header  = { alg: 'ES256', kid: keyId, typ: 'JWT' }
const payload = { iss: issuerId, iat, exp: iat + 15 * 60, aud: 'appstoreconnect-v1' }
crypto.sign('sha256', Buffer.from(signingInput), {
  key: fs.readFileSync(keyPath, 'utf8'),
  dsaEncoding: 'ieee-p1363',       // 64-byte r‖s. DER is rejected by Apple.
})
```

Depending on `jose` once killed a job *after* the first app had uploaded, when
`npm install` failed on a runner with no npm — so the second app never built.
Prefer `node:crypto`, and make each app's pipeline independent so one failure
cannot strand another.

**Never search the filesystem for a key.** A credential helper that ran `find
-maxdepth 6` over external drives spent 89 minutes inside the first `find`
before a 90-minute job timeout killed it, one line into its output. Check an
explicit path list. If the key moves, add a path.

## Code signing

The single most common failure is `errSecInternalComponent` at the `CodeSign`
step, after the app has fully compiled. It means codesign could not unlock the
keychain holding the private key — normal for a launchd/CI process with no GUI
session.

Two independent fixes, both usually needed:

**1. Archive unsigned, sign at export.** Xcode signs an archive with a
*development* identity and only re-signs for distribution at export. If no
distribution identity is visible, skip signing at archive time:

```bash
xcodebuild archive ... CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= CODE_SIGN_ENTITLEMENTS=
xcodebuild -exportArchive -allowProvisioningUpdates \
  -authenticationKeyPath ... -authenticationKeyID ... -authenticationKeyIssuerID ...
```

**2. Build inside a throwaway unlocked keychain.** And understand the
distinction that wastes a whole debugging round:

- `security default-keychain -d user -s` controls where **new** keys are
  written. `-allowProvisioningUpdates` puts a freshly minted certificate's
  private key in the *default* keychain — if that is a locked login keychain,
  the certificate is unusable the moment it exists.
- `security list-keychains -d user -s` controls which **existing** identities
  are visible. Making the throwaway keychain default is *not* enough: automatic
  signing keeps finding the unusable identity in `login.keychain` until that
  keychain leaves the search path entirely.

**Always restore both.** They are per-user settings shared with the user's GUI
session. Leaving a throwaway keychain listed makes macOS prompt a human for a
password that was generated inside the job and discarded — an unanswerable
prompt. Restore in a `trap cleanup EXIT INT TERM`, fall back to
`login.keychain` rather than leaving it pointed at something unopenable, and
keep it to **one** trap: a second `trap ... EXIT` silently replaces the first.

## Upload, then wait, then submit

Uploading is not submitting. `altool` returns as soon as the bytes land, but
Apple processes the build for **5–30 minutes** before the API can see it.
Submitting immediately fails with "build is not in App Store Connect yet".

Poll `processingState` until `VALID`, treating `PROCESSING` as retry and any
other state as a fast failure. Budget ~30 minutes.

## TestFlight

Internal testing needs **no beta review** — installable minutes after
processing finishes. Find or create an internal group, attach the build, invite
testers.

When a build "disappears from my phone", check these four in order:

| Field | Meaning |
| --- | --- |
| `expired` | Expired builds vanish from TestFlight but stay valid for the App Store |
| `usesNonExemptEncryption` | Missing export compliance uploads fine, then refuses to install |
| `processingState` | Not `VALID` yet means nothing can be handed out |
| tester `state` | `INVITED` = sent, not accepted. `ACCEPTED` = linked. `INSTALLED` = on a device |

A tester stuck at `INVITED` is the usual answer to "I don't see it".

## Installing directly onto a physical iPhone

Unrelated to review status, and **not** the store path — an app-store-signed
IPA cannot be installed on a device directly. Build Debug with a *development*
identity and hand the result to `devicectl`:

```bash
xcodebuild build -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS,id=$UDID" -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM"
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
```

`devicectl list devices --json-output` finds the device. Its `tunnelState`
describes a *network tunnel*, not installability — a USB-attached phone can
report `disconnected` and install fine. Warn, then let `devicectl` decide;
refusing on state alone has already skipped installs that would have worked.

Requires: developer mode on, phone unlocked, Trust tapped.

## Things only a human can do

The API cannot create these. If any is missing, stop and say so precisely —
do not report a pipeline failure for a missing prerequisite:

- The app record itself (bundle ID registration, name, primary language)
- Paid/free agreements and tax forms
- Privacy nutrition labels, and the privacy policy and support URLs
- Age rating questionnaire
- Screenshots at the required sizes
- Export compliance answers, if not declared in `Info.plist`

## Review demo accounts

If the app has a login, App Review needs working credentials, and wrong or
missing ones are the most common first-submission rejection.

- One account **per role** if roles route to different experiences. A single
  login cannot cover two apps when emails are unique per account.
- Store the password with Apple *and* in the app's database, and keep them in
  sync. Setting one without the other silently breaks review sign-in.
- Verify by actually signing in — expect HTTP 200, not a redirect to `/login`.

When searching a database for these accounts, **match the real string**. A
search for `LIKE '%appreview%'` will not match `app-review+...`; that mistake
led to the conclusion that the accounts did not exist, followed by overwriting
a password Apple already held.

## Driving a self-hosted Mac runner from elsewhere

Xcode does not run on Linux, and there is no workaround: Wine is Windows-only,
Darling does not support Xcode, and virtualizing macOS needs Apple hardware.
Swift compiles on Linux, but without the iOS SDK, the asset-catalog compiler,
or code signing you cannot produce a signed IPA.

So drive a Mac. A branch-name broker works well — push a branch whose name
encodes the job:

```
release/<repo>-<app>-<build>[--on--<ref>]
status/<repo>
testflight/<repo>-<build>
devices/**
```

**Trap:** with a `--on--<ref>` convention, everything after `--on--` is the ref
to check out. Appending a retry suffix to the branch name changes which ref is
cloned and the clone fails. Vary the part *before* the separator.

## Verify, then report

- Confirm the version's `appStoreState` — `WAITING_FOR_REVIEW` is queued,
  `IN_REVIEW` is being looked at, `REJECTED`/`DEVELOPER_REJECTED` need action.
- Report what you actually observed, quoting the state. "Submitted" is not the
  same as "Apple confirms it is in review."
