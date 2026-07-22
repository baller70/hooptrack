import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export const DB_PATH = resolveDbPath(process.env.HOOPTRACK_DB)

declare global {
   
  var __db: Database.Database | undefined
}

function getDb(): Database.Database {
  if (!global.__db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    global.__db = new Database(DB_PATH)
    global.__db.pragma('busy_timeout = 30000')
    global.__db.pragma('foreign_keys = ON')
    runMigrations(global.__db)
    try {
      global.__db.pragma('journal_mode = WAL')
    } catch (error) {
      if ((error as { code?: string }).code !== 'SQLITE_BUSY') throw error
    }
  }
  return global.__db
}

function resolveDbPath(configuredPath: string | undefined) {
  if (configuredPath && configuredPath.trim()) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath)
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'hooptrack.db')
}

function runMigrations(db: Database.Database) {
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)`)
    const current = (db.prepare('SELECT MAX(version) as v FROM _migrations').get() as { v: number | null })?.v ?? 0

    if (current < 1) {
      db.exec(SCHEMA_V1)
      db.prepare('INSERT INTO _migrations VALUES (?)').run(1)
    }
    if (current < 2) {
      migrateV2(db)
      recordMigration(db, 2)
    }
    if (current < 3) {
      migrateV3(db)
      recordMigration(db, 3)
    }
    if (current < 4) {
      migrateV4(db)
      recordMigration(db, 4)
    }
    if (current < 5) {
      migrateV5(db)
      recordMigration(db, 5)
    }
    if (current < 6) {
      migrateV6(db)
      recordMigration(db, 6)
    }
    if (current < 7) {
      db.exec(SCHEMA_V7)
      recordMigration(db, 7)
    }
    if (current < 8) {
      migrateV8(db)
      recordMigration(db, 8)
    }
    if (current < 9) {
      migrateV9(db)
      recordMigration(db, 9)
    }
    if (current < 10) {
      migrateV10(db)
      recordMigration(db, 10)
    }
    if (current < 11) {
      migrateV11(db)
      recordMigration(db, 11)
    }
    if (current < 12) {
      migrateV12(db)
      recordMigration(db, 12)
    }
    if (current < 13) {
      safeAddColumn(db, 'users', 'ai_model', "TEXT DEFAULT 'Codex CLI'")
      recordMigration(db, 13)
    }
    if (current < 14) {
      safeAddColumn(db, 'users', 'ai_credentials', 'TEXT')
      recordMigration(db, 14)
    }
    if (current < 15) {
      safeAddColumn(db, 'schedule', 'start_time', 'TEXT')
      safeAddColumn(db, 'schedule', 'end_time', 'TEXT')
      recordMigration(db, 15)
    }
    if (current < 16) {
      db.exec(SCHEMA_V16)
      recordMigration(db, 16)
    }
    if (current < 17) {
      db.exec(SCHEMA_V17)
      recordMigration(db, 17)
    }
    if (current < 18) {
      db.exec(SCHEMA_V18)
      recordMigration(db, 18)
    }
    db.exec('COMMIT')
  } catch (error) {
    if (db.inTransaction) db.exec('ROLLBACK')
    throw error
  }
}

function safeAddColumn(db: Database.Database, table: string, column: string, definition: string) {
  const tableName = quoteIdentifier(table)
  const columnName = quoteIdentifier(column)
  const cols = tableColumns(db, table)
  if (cols.some(c => c.name === column)) return
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (!message.includes('duplicate column name')) throw err
  }
}

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQLite identifier: ${identifier}`)
  }
  return `"${identifier}"`
}

type TableColumn = { name: string; notnull: number }

function tableExists(db: Database.Database, table: string) {
  const row = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(table)
  return !!row
}

function tableColumns(db: Database.Database, table: string): TableColumn[] {
  return db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as TableColumn[]
}

function columnExpression(columns: TableColumn[], column: string, fallbackSql: string) {
  return columns.some(c => c.name === column) ? quoteIdentifier(column) : fallbackSql
}

function recordMigration(db: Database.Database, version: number) {
  db.prepare('INSERT OR IGNORE INTO _migrations VALUES (?)').run(version)
}

function migrateV2(db: Database.Database) {
  safeAddColumn(db, 'player_moves', 'clip_start', 'INTEGER')
  safeAddColumn(db, 'player_moves', 'clip_end', 'INTEGER')
  safeAddColumn(db, 'player_moves', 'video_type', "TEXT NOT NULL DEFAULT 'youtube'")
  safeAddColumn(db, 'player_moves', 'video_path', 'TEXT')
}

function migrateV3(db: Database.Database) {
  safeAddColumn(db, 'schedule', 'item_type', "TEXT NOT NULL DEFAULT 'workout'")
  safeAddColumn(db, 'schedule', 'item_id', 'INTEGER')
  safeAddColumn(db, 'schedule', 'title', 'TEXT')
  safeAddColumn(db, 'schedule', 'notes', 'TEXT')
}

function migrateV4(db: Database.Database) {
  safeAddColumn(db, 'drills', 'timer_mode', "TEXT NOT NULL DEFAULT 'timed'")
  safeAddColumn(db, 'drills', 'target_reps', 'INTEGER')
  safeAddColumn(db, 'drills', 'rest_seconds', 'INTEGER NOT NULL DEFAULT 0')
  safeAddColumn(db, 'workouts', 'timer_mode', 'TEXT')
  safeAddColumn(db, 'workouts', 'duration_seconds', 'INTEGER')
  safeAddColumn(db, 'player_moves', 'timer_mode', "TEXT NOT NULL DEFAULT 'stopwatch'")
  safeAddColumn(db, 'player_moves', 'duration_seconds', 'INTEGER')
  safeAddColumn(db, 'player_moves', 'target_reps', 'INTEGER')
  safeAddColumn(db, 'quizzes', 'timer_mode', "TEXT NOT NULL DEFAULT 'stopwatch'")
  safeAddColumn(db, 'quizzes', 'duration_seconds', 'INTEGER')
  safeAddColumn(db, 'quizzes', 'position', 'TEXT')
  safeAddColumn(db, 'quizzes', 'game_situation', 'TEXT')
  safeAddColumn(db, 'recordings', 'rep_count', 'INTEGER')
}

function migrateV5(db: Database.Database) {
  safeAddColumn(db, 'player_moves', 'default_playback_rate', 'REAL NOT NULL DEFAULT 1.0')
}

function migrateV6(db: Database.Database) {
  if (tableExists(db, 'notifications')) {
    const columns = tableColumns(db, 'notifications')
    db.exec(`
DROP TABLE IF EXISTS notifications_new;
CREATE TABLE notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  scheduled_for TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  link_url TEXT,
  actor_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO notifications_new (id, player_id, message, type, scheduled_for, sent, read_at, link_url, actor_id, created_at)
  SELECT
    ${columnExpression(columns, 'id', 'NULL')},
    ${columnExpression(columns, 'player_id', '0')},
    ${columnExpression(columns, 'message', "''")},
    ${columnExpression(columns, 'type', "'system'")},
    ${columnExpression(columns, 'scheduled_for', "datetime('now')")},
    ${columnExpression(columns, 'sent', '0')},
    ${columnExpression(columns, 'read_at', 'NULL')},
    ${columnExpression(columns, 'link_url', 'NULL')},
    ${columnExpression(columns, 'actor_id', 'NULL')},
    ${columnExpression(columns, 'created_at', columnExpression(columns, 'scheduled_for', "datetime('now')"))}
  FROM notifications;
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;
`)
  } else {
    db.exec(`
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  scheduled_for TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  link_url TEXT,
  actor_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)
  }

  db.exec(`
CREATE INDEX IF NOT EXISTS idx_notifications_player_unread ON notifications(player_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_player_created ON notifications(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
`)
}

function migrateV8(db: Database.Database) {
  if (!tableExists(db, 'messages')) {
    db.exec(`
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  context_type TEXT,
  context_id INTEGER,
  context_title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
`)
  } else {
    const columns = tableColumns(db, 'messages')
    const recipientColumn = columns.find(c => c.name === 'recipient_id')
    if (recipientColumn?.notnull) {
      db.exec(`
DROP TABLE IF EXISTS messages_new;
CREATE TABLE messages_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  context_type TEXT,
  context_id INTEGER,
  context_title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
INSERT INTO messages_new (id, sender_id, recipient_id, body, context_type, context_id, context_title, created_at, read_at)
  SELECT
    ${columnExpression(columns, 'id', 'NULL')},
    ${columnExpression(columns, 'sender_id', '0')},
    ${columnExpression(columns, 'recipient_id', 'NULL')},
    ${columnExpression(columns, 'body', "''")},
    ${columnExpression(columns, 'context_type', 'NULL')},
    ${columnExpression(columns, 'context_id', 'NULL')},
    ${columnExpression(columns, 'context_title', 'NULL')},
    ${columnExpression(columns, 'created_at', "datetime('now')")},
    ${columnExpression(columns, 'read_at', 'NULL')}
  FROM messages;
DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;
`)
    }
  }

  db.exec(`
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(context_type, context_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_dm ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, read_at);
`)
}

function migrateV9(db: Database.Database) {
  safeAddColumn(db, 'recordings', 'video_path', 'TEXT')
  safeAddColumn(db, 'recordings', 'video_size_bytes', 'INTEGER')
  safeAddColumn(db, 'recordings', 'video_mime', 'TEXT')
}

function migrateV10(db: Database.Database) {
  safeAddColumn(db, 'recordings', 'clip_start', 'INTEGER')
  safeAddColumn(db, 'recordings', 'clip_end', 'INTEGER')
}

function migrateV11(db: Database.Database) {
  safeAddColumn(db, 'recordings', 'title', 'TEXT')
  safeAddColumn(db, 'recordings', 'parent_recording_id', 'INTEGER REFERENCES recordings(id)')
  db.exec(`
CREATE INDEX IF NOT EXISTS idx_recordings_parent ON recordings(parent_recording_id);
CREATE INDEX IF NOT EXISTS idx_recordings_video_path ON recordings(video_path);
`)
}

function migrateV12(db: Database.Database) {
  safeAddColumn(db, 'messages', 'attachment_type', 'TEXT')
  safeAddColumn(db, 'messages', 'attachment_path', 'TEXT')
  safeAddColumn(db, 'messages', 'attachment_mime', 'TEXT')
  safeAddColumn(db, 'messages', 'attachment_size_bytes', 'INTEGER')
  safeAddColumn(db, 'messages', 'attachment_duration_seconds', 'INTEGER')
  safeAddColumn(db, 'messages', 'attachment_filename', 'TEXT')
}

const SCHEMA_V18 = `
CREATE TABLE IF NOT EXISTS apns_device_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  bundle_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(device_token, environment, bundle_id)
);
CREATE INDEX IF NOT EXISTS idx_apns_tokens_user ON apns_device_tokens(user_id);
`

const SCHEMA_V16 = `
CREATE TABLE IF NOT EXISTS coach_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK(group_type IN ('team','training_session')),
  player_limit INTEGER CHECK(player_limit IS NULL OR player_limit > 0),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_coach_groups_coach ON coach_groups(coach_id, archived_at, created_at DESC);

CREATE TABLE IF NOT EXISTS coach_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES coach_groups(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by INTEGER NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_coach_group_members_player ON coach_group_members(player_id);
CREATE INDEX IF NOT EXISTS idx_coach_group_members_group ON coach_group_members(group_id);

CREATE TABLE IF NOT EXISTS coach_group_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES coach_groups(id) ON DELETE CASCADE,
  coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_coach_group_invites_player_status ON coach_group_invites(player_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_group_invites_group_status ON coach_group_invites(group_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_group_invites_pending_unique
  ON coach_group_invites(group_id, player_id)
  WHERE status = 'pending';
`

const SCHEMA_V17 = `
CREATE TABLE IF NOT EXISTS blocked_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(blocker_id != blocked_id),
  UNIQUE(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocked_users_pair ON blocked_users(blocker_id, blocked_id);

CREATE TABLE IF NOT EXISTS content_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK(reason IN ('harassment','hate','threat','sexual','spam','other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_once
  ON content_reports(reporter_id, message_id)
  WHERE message_id IS NOT NULL;
`

const SCHEMA_V7 = `
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  context_type TEXT,
  context_id INTEGER,
  context_title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, read_at);
`

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('trainer','player')),
  ai_model TEXT DEFAULT 'Codex CLI',
  ai_credentials TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  drill_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES users(id),
  drill_id INTEGER NOT NULL REFERENCES drills(id),
  duration_seconds INTEGER NOT NULL,
  blob_key TEXT NOT NULL UNIQUE,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS player_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  assigned_to_player_id INTEGER REFERENCES users(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES users(id),
  workout_id INTEGER REFERENCES workouts(id),
  scheduled_date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('reminder','inspirational')),
  scheduled_for TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('multiple_choice','video_based','mixed')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  video_url TEXT,
  options TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  player_id INTEGER NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL,
  answers TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drills_workout ON drills(workout_id);
CREATE INDEX IF NOT EXISTS idx_recordings_player ON recordings(player_id);
CREATE INDEX IF NOT EXISTS idx_recordings_drill ON recordings(drill_id);
CREATE INDEX IF NOT EXISTS idx_schedule_player_date ON schedule(player_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id, sent);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_player ON quiz_attempts(player_id);
`

export const db = getDb()

export function parseJSON<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
