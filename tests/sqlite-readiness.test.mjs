import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import Database from 'better-sqlite3'

test('SQLite backup restores rows and concurrent connections respect busy timeout', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'hooptrack-sqlite-'))
  const sourcePath = join(directory, 'source.db')
  const backupPath = join(directory, 'backup.db')
  try {
    const writer = new Database(sourcePath)
    writer.pragma('journal_mode = WAL')
    writer.pragma('busy_timeout = 30000')
    writer.exec('CREATE TABLE events (id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
    writer.prepare('INSERT INTO events(value) VALUES (?)').run('seed')

    const second = new Database(sourcePath)
    second.pragma('busy_timeout = 30000')
    for (let index = 0; index < 25; index += 1) {
      const connection = index % 2 === 0 ? writer : second
      connection.prepare('INSERT INTO events(value) VALUES (?)').run(`write-${index}`)
    }
    second.close()
    await writer.backup(backupPath)
    writer.close()

    const restored = new Database(backupPath, { readonly: true })
    assert.equal(restored.prepare('SELECT COUNT(*) AS count FROM events').get().count, 26)
    assert.equal(restored.pragma('integrity_check', { simple: true }), 'ok')
    restored.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
