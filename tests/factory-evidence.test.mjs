import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const requiredEvidenceFiles = [
  '.factory/runs/ISSUE-00012/review-evidence.json',
  '.factory/runs/ISSUE-00012/preflight.json',
]

test('ISSUE-00012 factory evidence artifacts are mergeable', () => {
  const ignoredArtifacts = requiredEvidenceFiles.filter((artifact) => {
    const result = spawnSync('git', ['check-ignore', '-q', artifact], { encoding: 'utf8' })
    return result.status === 0
  })

  assert.deepEqual(
    ignoredArtifacts,
    [],
    'ISSUE-00012 review evidence and preflight artifacts must not be ignored by git.',
  )
})
