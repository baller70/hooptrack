import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)

const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[opusr]_[A-Za-z0-9_]{30,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
]

const findings = []
for (const file of files) {
  if (file === 'scripts/check-secrets.mjs') continue
  if (file === 'package-lock.json' || file === 'pnpm-lock.yaml') continue
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const [name, expression] of rules) {
    if (expression.test(content)) findings.push(`${file}: possible ${name}`)
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'))
  process.exit(1)
}
console.log(`secret scan: PASS (${files.length} tracked files checked)`)
