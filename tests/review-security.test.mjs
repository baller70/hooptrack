import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import Database from 'better-sqlite3'

const scriptPath = join(process.cwd(), 'scripts', 'provision-review-account.mjs')

function createReviewDb() {
  const directory = mkdtempSync(join(tmpdir(), 'hooptrack-review-'))
  const dbPath = join(directory, 'hooptrack.db')
  const db = new Database(dbPath)
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      position_abbr TEXT,
      jersey_number INTEGER,
      position TEXT,
      grade_level TEXT,
      school TEXT
    );
    CREATE TABLE coach_groups (
      id INTEGER PRIMARY KEY,
      coach_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      group_type TEXT NOT NULL,
      player_limit INTEGER,
      description TEXT
    );
    CREATE TABLE coach_group_members (
      group_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      added_by INTEGER NOT NULL,
      UNIQUE(group_id, player_id)
    );
    CREATE TABLE workouts (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_by INTEGER NOT NULL
    );
    CREATE TABLE drills (
      id INTEGER PRIMARY KEY,
      workout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      duration_seconds INTEGER,
      drill_order INTEGER
    );
  `)
  db.close()
  return { directory, dbPath }
}

function runProvisioner(env) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
}

test('review account provisioning requires caller-supplied credentials', () => {
  const { directory, dbPath } = createReviewDb()
  try {
    const result = runProvisioner({
      HOOPTRACK_REVIEW_CONFIRM: 'yes',
      HOOPTRACK_DB_PATH: dbPath,
      REVIEW_PASSWORD: '',
    })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /REVIEW_PASSWORD/)
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /AppReview2026/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('review account provisioning output never prints review passwords', () => {
  const { directory, dbPath } = createReviewDb()
  try {
    const password = 'temporary-review-password-123'
    const result = runProvisioner({
      HOOPTRACK_REVIEW_CONFIRM: 'yes',
      HOOPTRACK_DB_PATH: dbPath,
      REVIEW_PASSWORD: password,
    })

    assert.equal(result.status, 0, result.stderr)
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(password))
    assert.match(result.stdout, /Password: set in the secure App Store Connect review account field/)
    assert.doesNotMatch(result.stdout, /curl -X POST/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
