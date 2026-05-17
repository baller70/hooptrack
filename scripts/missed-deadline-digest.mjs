#!/usr/bin/env node
// Daily missed-deadline digest. Inserts one notification per trainer per
// player who has past-due, incomplete schedule items.
//
// Run via cron: 0 8 * * * cd /opt/apps/hooptrack && node scripts/missed-deadline-digest.mjs >> /var/log/hooptrack-digest.log 2>&1

import Database from 'better-sqlite3'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DB_PATH = process.env.HOOPTRACK_DB || resolve(__dirname, '..', 'data', 'hooptrack.db')

const db = new Database(DB_PATH, { readonly: false })
db.pragma('journal_mode = WAL')

const today = new Date().toISOString().slice(0, 10)
const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

const players = db.prepare(`
  SELECT u.id, u.name, COUNT(s.id) AS overdue_count
  FROM users u
  JOIN schedule s ON s.player_id = u.id
  WHERE u.role = 'player'
    AND s.completed = 0
    AND s.scheduled_date < ?
    AND s.scheduled_date >= ?
  GROUP BY u.id
  HAVING overdue_count > 0
`).all(today, sevenAgo)

if (players.length === 0) {
  console.log(`[${new Date().toISOString()}] no overdue items`)
  process.exit(0)
}

const trainers = db.prepare("SELECT id FROM users WHERE role = 'trainer'").all()
if (trainers.length === 0) {
  console.log(`[${new Date().toISOString()}] no trainers to notify`)
  process.exit(0)
}

const insert = db.prepare(`
  INSERT INTO notifications (player_id, message, type, scheduled_for, sent, link_url, actor_id, created_at)
  VALUES (?, ?, 'missed_deadlines', ?, 0, ?, ?, ?)
`)

const now = new Date().toISOString()
let notified = 0
for (const t of trainers) {
  for (const p of players) {
    const msg = `${p.name} has ${p.overdue_count} overdue ${p.overdue_count === 1 ? 'item' : 'items'}`
    insert.run(t.id, msg, now, `/dashboard/players/${p.id}`, null, now)
    notified++
  }
}

console.log(`[${new Date().toISOString()}] notified ${trainers.length} trainer(s) about ${players.length} player(s); ${notified} notifications inserted`)
process.exit(0)
