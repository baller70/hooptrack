import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const deploy = await readFile('.github/workflows/build-and-deploy.yml', 'utf8')
const audit = await readFile('.github/workflows/audit.yml', 'utf8')
const mobile = await readFile('.github/workflows/mobile-readiness.yml', 'utf8')
const localDeploy = await readFile('deploy.sh', 'utf8')

assert.doesNotMatch(deploy, /^\s*push:/m, 'Production deployment must never trigger automatically on push')
assert.match(deploy, /workflow_dispatch:/, 'Production deployment must be manually dispatched')
assert.match(deploy, /confirm_release.*RELEASE_APPROVED|RELEASE_APPROVED.*confirm_release/s, 'Deployment must require an explicit approval phrase')
assert.match(deploy, /environment: production/, 'Deployment must use the protected production environment')
assert.doesNotMatch(deploy, /scp .*\.env|\.env\.production\.local/, 'Production secrets must not be copied into the CI workspace')
assert.match(deploy, /npm ci/, 'Deployment must install from the npm lockfile')
assert.doesNotMatch(deploy, /pnpm|pnpm-lock/, 'Deployment must not use an unapproved second package-manager lockfile')

assert.match(audit, /npm ci/, 'Audit CI must use the repository lockfile')
assert.match(audit, /npm run audit:all/, 'Audit CI must run the complete audit gate')
assert.match(audit, /npm run verify/, 'Audit CI must run the complete verification gate')
assert.doesNotMatch(audit, /continue-on-error:\s*true|\|\|\s*true/, 'Mandatory audit checks must not be advisory')

assert.match(localDeploy, /Direct local deployment is disabled/, 'Legacy local deployment entry point must remain disabled')
assert.doesNotMatch(localDeploy, /(^|\s)(ssh|rsync|pm2)\s/m, 'Disabled local wrapper must perform no production command')

assert.match(mobile, /runs-on: macos-15/, 'Native readiness must run on macOS')
assert.match(mobile, /HooptrackCoach\.xcresult/, 'Coach native evidence must be captured')
assert.match(mobile, /HooptrackPlayer\.xcresult/, 'Player native evidence must be captured')

console.log('release workflow policy: PASS')
