import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'hooptrack.db')

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

function getDb(): Database.Database {
  if (!global.__db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    global.__db = new Database(DB_PATH)
    global.__db.pragma('journal_mode = WAL')
    global.__db.pragma('busy_timeout = 10000')
    global.__db.pragma('foreign_keys = ON')
    runMigrations(global.__db)
  }
  return global.__db
}

function runMigrations(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)`)
  const current = (db.prepare('SELECT MAX(version) as v FROM _migrations').get() as { v: number | null })?.v ?? 0

  if (current < 1) {
    db.exec(SCHEMA_V1)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(1)
  }
  if (current < 2) {
    db.exec(SCHEMA_V2)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(2)
  }
  if (current < 3) {
    db.exec(SCHEMA_V3)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(3)
  }
  if (current < 4) {
    db.exec(SCHEMA_V4)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(4)
  }
  if (current < 5) {
    db.exec(SCHEMA_V5)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(5)
  }
  if (current < 6) {
    db.exec(SCHEMA_V6)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(6)
  }
  if (current < 7) {
    db.exec(SCHEMA_V7)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(7)
  }
  if (current < 8) {
    db.exec(SCHEMA_V8)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(8)
  }
  if (current < 9) {
    db.exec(SCHEMA_V9)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(9)
  }
  if (current < 10) {
    db.exec(SCHEMA_V10)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(10)
  }
  if (current < 11) {
    db.exec(SCHEMA_V11)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(11)
  }
  if (current < 12) {
    db.exec(SCHEMA_V12)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(12)
  }
  if (current < 13) {
    db.exec(SCHEMA_V13)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(13)
  }
  if (current < 14) {
    db.exec(SCHEMA_V14)
    db.prepare('INSERT INTO _migrations VALUES (?)').run(14)
  }
}

const SCHEMA_V14 = `
ALTER TABLE users ADD COLUMN ai_credentials TEXT;
`

const SCHEMA_V13 = `
ALTER TABLE users ADD COLUMN ai_model TEXT DEFAULT 'Claude Code CLI';
`

const SCHEMA_V12 = `
ALTER TABLE messages ADD COLUMN attachment_type TEXT;
ALTER TABLE messages ADD COLUMN attachment_path TEXT;
ALTER TABLE messages ADD COLUMN attachment_mime TEXT;
ALTER TABLE messages ADD COLUMN attachment_size_bytes INTEGER;
ALTER TABLE messages ADD COLUMN attachment_duration_seconds INTEGER;
ALTER TABLE messages ADD COLUMN attachment_filename TEXT;
`

const SCHEMA_V11 = `
ALTER TABLE recordings ADD COLUMN title TEXT;
ALTER TABLE recordings ADD COLUMN parent_recording_id INTEGER REFERENCES recordings(id);
CREATE INDEX IF NOT EXISTS idx_recordings_parent ON recordings(parent_recording_id);
CREATE INDEX IF NOT EXISTS idx_recordings_video_path ON recordings(video_path);
`

const SCHEMA_V10 = `
ALTER TABLE recordings ADD COLUMN clip_start INTEGER;
ALTER TABLE recordings ADD COLUMN clip_end INTEGER;
`

const SCHEMA_V9 = `
ALTER TABLE recordings ADD COLUMN video_path TEXT;
ALTER TABLE recordings ADD COLUMN video_size_bytes INTEGER;
ALTER TABLE recordings ADD COLUMN video_mime TEXT;
`

const SCHEMA_V8 = `
BEGIN;
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
  SELECT id, sender_id, recipient_id, body, context_type, context_id, context_title, created_at, read_at FROM messages;
DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(context_type, context_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_dm ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, read_at);
COMMIT;
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

const SCHEMA_V6 = `
BEGIN;
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
INSERT INTO notifications_new (id, player_id, message, type, scheduled_for, sent, created_at)
  SELECT id, player_id, message, type, scheduled_for, sent, scheduled_for FROM notifications;
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;
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
COMMIT;
`

const SCHEMA_V5 = `
ALTER TABLE player_moves ADD COLUMN default_playback_rate REAL NOT NULL DEFAULT 1.0;
`

const SCHEMA_V4 = `
ALTER TABLE drills ADD COLUMN timer_mode TEXT NOT NULL DEFAULT 'timed';
ALTER TABLE drills ADD COLUMN target_reps INTEGER;
ALTER TABLE drills ADD COLUMN rest_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workouts ADD COLUMN timer_mode TEXT;
ALTER TABLE workouts ADD COLUMN duration_seconds INTEGER;
ALTER TABLE player_moves ADD COLUMN timer_mode TEXT NOT NULL DEFAULT 'stopwatch';
ALTER TABLE player_moves ADD COLUMN duration_seconds INTEGER;
ALTER TABLE player_moves ADD COLUMN target_reps INTEGER;
ALTER TABLE quizzes ADD COLUMN timer_mode TEXT NOT NULL DEFAULT 'stopwatch';
ALTER TABLE quizzes ADD COLUMN duration_seconds INTEGER;
ALTER TABLE quizzes ADD COLUMN position TEXT;
ALTER TABLE quizzes ADD COLUMN game_situation TEXT;
ALTER TABLE recordings ADD COLUMN rep_count INTEGER;
`

const SCHEMA_V3 = `
ALTER TABLE schedule ADD COLUMN item_type TEXT NOT NULL DEFAULT 'workout';
ALTER TABLE schedule ADD COLUMN item_id INTEGER;
ALTER TABLE schedule ADD COLUMN title TEXT;
ALTER TABLE schedule ADD COLUMN notes TEXT;
`

const SCHEMA_V2 = `
ALTER TABLE player_moves ADD COLUMN clip_start INTEGER;
ALTER TABLE player_moves ADD COLUMN clip_end INTEGER;
ALTER TABLE player_moves ADD COLUMN video_type TEXT NOT NULL DEFAULT 'youtube';
ALTER TABLE player_moves ADD COLUMN video_path TEXT;
`

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('trainer','player')),
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
