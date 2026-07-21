import { readFile, writeFile } from 'node:fs/promises'

const checklistPath = 'docs/APP_STORE_EXECUTION_CHECKLIST.md'
const outputPath = 'docs/APP_STORE_EVIDENCE_INDEX.md'
const checkOnly = process.argv.includes('--check')
const checklist = await readFile(checklistPath, 'utf8')

const proven = new Map([
  ['HT-0003', 'Checklist, runbook, workflow gate, and submission packet require separate code, TestFlight, deployment, submission, and release approvals.'],
  ['HT-0006', '`docs/APP_STORE_EVIDENCE_INDEX.md` is generated and validated against all unique checklist IDs.'],
  ['HT-0010', 'Tracked-file secret scan passes; `.env*` remains ignored except the placeholder template.'],
  ['HT-0101', '`docs/KCLOUD_ACCESS_REPORT.md` records repo, origin, branch, environment mismatch, status, and candidate context.'],
  ['HT-0102', '`git fetch origin main --dry-run` succeeded on 2026-07-21.'],
  ['HT-0103', 'A GitHub push dry-run to a new branch succeeded without creating it.'],
  ['HT-0104', '`docs/NATIVE_CI_EVIDENCE.md` records macOS, Xcode, Swift, and installed simulator runtimes from the passing native workflow.'],
  ['HT-0105', 'Node v20.20.2/npm 11.4.2 were recorded and compared with required Node 22/npm 10; CI uses Node 22.'],
  ['HT-0106', 'GitHub, npm, Apple guidelines, support, and privacy HTTPS checks all returned 200.'],
  ['HT-0107', 'Approved Contabo bootstrap passed authenticated temporary `/tmp` create/read/delete only.'],
  ['HT-0108', 'Contabo bootstrap confirmed `/opt/apps` exists without writing there.'],
  ['HT-0109', 'The missing Local Mac bridge and exact unavailable mount are recorded in `docs/KCLOUD_ACCESS_REPORT.md`.'],
  ['HT-0111', 'Root `AGENTS.md` was read before scoped changes; no deeper applicable instruction file exists outside dependencies.'],
  ['HT-0123', '`.env.example` contains names and non-secret placeholders only.'],
  ['HT-0124', '`docs/APP_STORE_ARCHITECTURE.md` contains component, trust-boundary, deployment, and invitation-flow diagrams.'],
  ['HT-0126', '`npm ci` completed from `package-lock.json`.'],
  ['HT-0127', '`npm run lint` passes.'],
  ['HT-0128', '`npm run typecheck` passes.'],
  ['HT-0129', '`npm run build` passes and emits 59 static pages plus dynamic routes.'],
  ['HT-0132', 'Coach Debug simulator build and test passed in GitHub native run 29871603666.'],
  ['HT-0133', 'Player Debug simulator build and test passed in GitHub native run 29871603666.'],
  ['HT-0136', '`HooptrackCoachTests` passed; the retained Coach `.xcresult` is identified in `docs/NATIVE_CI_EVIDENCE.md`.'],
  ['HT-0137', '`HooptrackPlayerTests` passed; the retained Player `.xcresult` is identified in `docs/NATIVE_CI_EVIDENCE.md`.'],
  ['HT-0138', '`HooptrackCoachUITests` passed; the retained Coach `.xcresult` is identified in `docs/NATIVE_CI_EVIDENCE.md`.'],
  ['HT-0139', '`HooptrackPlayerUITests` passed; the retained Player `.xcresult` is identified in `docs/NATIVE_CI_EVIDENCE.md`.'],
  ['HT-0140', '`docs/NATIVE_CI_EVIDENCE.md` classifies App Intents metadata output and Player launch-time variability without hiding them.'],
  ['HT-0216', 'Player registration and standalone dashboard routes do not require a Coach membership.'],
  ['HT-0311', 'Coach entitlements and declared capabilities were source-audited. Final archive reconciliation remains HT-0317.'],
  ['HT-0312', 'Player APNs entitlement and Release/Debug environments are configured in the project.'],
  ['HT-0431', 'Coach exposes in-app deletion with password reauthentication and explicit confirmation.'],
  ['HT-0432', 'Player exposes in-app deletion with password reauthentication and explicit confirmation.'],
  ['HT-0507', 'Unknown-email invitation returns the same accepted/non-enumerating shape.'],
  ['HT-0508', 'Invitation creation and role isolation are exercised by the live-route integration test.'],
  ['HT-0509', 'Duplicate pending invitation behavior is enforced server-side.'],
  ['HT-0513', 'Invitation expiry is stored, surfaced, and enforced with HTTP 410.'],
  ['HT-0514', 'Coach can revoke only its own pending invitation.'],
  ['HT-0515', 'Player can accept only an invitation addressed to that Player.'],
  ['HT-0516', 'Player decline is implemented by the same recipient-bound state transition.'],
  ['HT-0518', 'Atomic capacity-race test proves one winner for one remaining slot.'],
  ['HT-0521', 'Accepted invitation replay returns conflict and creates no second membership.'],
  ['HT-0524', 'Player leave-team deletes only the caller membership; authorization ends immediately.'],
  ['HT-0525', 'Coach removal is ownership-scoped and post-removal messaging is denied immediately.'],
  ['HT-0527', 'Coach deletion cleanup is integration-tested while independent Player accounts survive.'],
  ['HT-0529', 'Negative integration checks cover guessed invite, membership, contact, message, and view-as boundaries; remaining resource classes stay NOT RUN.'],
  ['HT-0801', '`docs/APP_STORE_ARCHITECTURE.md` and authorization matrix identify user, Coach, outsider, and trust-boundary threats.'],
  ['HT-0802', 'Threat surfaces are recorded across invitations, objects, deletion, push, and operations.'],
  ['HT-0812', '`npm run audit:all` passes mandatory code, dependency, cycle, license-inventory, vulnerability, and secret checks.'],
  ['HT-0901', 'Mandatory npm clean-install/audit/verify CI gates are defined without permissive failure handling.'],
  ['HT-0902', 'Independent Coach macOS CI build/unit/UI job passed and retained `.xcresult` evidence.'],
  ['HT-0903', 'Independent Player macOS CI build/unit/UI job passed and retained `.xcresult` evidence.'],
  ['HT-0906', 'Live-route test covers create, expiry, revoke, accept, replay, wrong recipient, and capacity race states.'],
])

const externallyBlockedPhases = new Set([2, 3, 10, 11, 12])
const manualOrNativePhases = new Set([7])
const phaseBlocker = {
  2: 'Requires named product, safety, business, and qualified legal/privacy decisions.',
  3: 'Requires Apple Developer/App Store Connect access, signing assets, branded origin, Xcode archives, and Organizer validation.',
  10: 'Requires App Store Connect/TestFlight access, approved testers, distributed builds, and human/device execution.',
  11: 'Requires final signed RCs, approved branding/assets/legal answers, App Store Connect access, and submission approval.',
  12: 'Requires Apple approval plus explicit production deployment and release authorization.',
}

let phase = 0
let phaseTitle = ''
const rows = []
for (const line of checklist.split('\n')) {
  const phaseMatch = line.match(/^## Phase (\d+) — (.+)$/)
  if (phaseMatch) {
    phase = Number(phaseMatch[1])
    phaseTitle = phaseMatch[2]
    continue
  }
  const item = line.match(/^- \[ \] \*\*(HT-\d{4})\*\* (.+)$/)
  if (!item) continue
  const [, id, requirement] = item
  if (proven.has(id)) {
    rows.push({ id, phase, phaseTitle, status: 'PASS', requirement, evidence: proven.get(id) })
  } else if (externallyBlockedPhases.has(phase)) {
    rows.push({ id, phase, phaseTitle, status: 'BLOCKED', requirement, evidence: phaseBlocker[phase] })
  } else {
    const reason = manualOrNativePhases.has(phase)
      ? 'NOT RUN — requires macOS/Xcode, simulator or physical-device, accessibility, performance, or representative-user evidence.'
      : 'NOT RUN — no complete item-specific evidence exists yet; partial implementation or adjacent tests are not treated as a pass.'
    rows.push({ id, phase, phaseTitle, status: 'NOT RUN', requirement, evidence: reason })
  }
}

if (rows.length === 0) throw new Error('No checklist IDs parsed')
if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error('Duplicate checklist IDs detected')

const counts = rows.reduce((groups, row) => {
  groups[row.status] = [...(groups[row.status] ?? []), row]
  return groups
}, {})
const count = (status) => counts[status]?.length ?? 0
const lines = [
  '# HoopTrack App Store Evidence Index',
  '',
  '**Generated from:** `docs/APP_STORE_EXECUTION_CHECKLIST.md`',
  '**Rule:** only complete, item-specific evidence is `PASS`. Partial work remains `NOT RUN`; credentials or decisions outside this repository are `BLOCKED`.',
  '',
  `**Totals:** ${rows.length} requirements — PASS ${count('PASS')}, NOT RUN ${count('NOT RUN')}, BLOCKED ${count('BLOCKED')}, FAIL ${count('FAIL')}.`,
  '',
]

for (const phaseNumber of [...new Set(rows.map((row) => row.phase))]) {
  const phaseRows = rows.filter((row) => row.phase === phaseNumber)
  lines.push(`## Phase ${phaseNumber} — ${phaseRows[0].phaseTitle}`, '', '| ID | Status | Requirement | Evidence / blocker |', '| --- | --- | --- | --- |')
  for (const row of phaseRows) {
    const clean = (value) => value.replaceAll('|', '\\|')
    lines.push(`| ${row.id} | **${row.status}** | ${clean(row.requirement)} | ${clean(row.evidence)} |`)
  }
  lines.push('')
}

const generated = `${lines.join('\n').trimEnd()}\n`
if (checkOnly) {
  const existing = await readFile(outputPath, 'utf8').catch(() => '')
  if (existing !== generated) throw new Error(`Evidence index is stale; run node ${process.argv[1]}`)
  console.log(`App Store evidence index: PASS (${rows.length} unique checklist IDs, ${count('PASS')} proven)`)
} else {
  await writeFile(outputPath, generated)
  console.log(`Wrote ${outputPath} (${rows.length} unique checklist IDs)`)
}
