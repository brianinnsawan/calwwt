-- Meetings tab (calnkt.sppwork.com/meetings, Brian 2 Nov 2026): the standing SPP–Caltex weekly meeting (Wednesdays) and
-- one-off meetings. Agenda items with shared notes, action items (one click to a Task), attendees, and SPP-only prep notes
-- that partners never see. Every change is kept in meeting_log.
CREATE TABLE IF NOT EXISTS meetings(
  id TEXT PRIMARY KEY,
  series TEXT CHECK(series IS NULL OR series IN('spp-caltex-weekly')),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
  date TEXT NOT NULL CHECK(date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  time TEXT CHECK(time IS NULL OR length(time) <= 40),
  place TEXT CHECK(place IS NULL OR length(place) <= 160),
  attendees TEXT CHECK(attendees IS NULL OR length(attendees) <= 1000),
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS meetings_date ON meetings(date, deleted);
-- kind: agenda (text = item, notes = discussion), action (text, owner_id, due, task_id, done), spp_note (SPP only).
CREATE TABLE IF NOT EXISTS meeting_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id TEXT NOT NULL REFERENCES meetings(id),
  kind TEXT NOT NULL CHECK(kind IN('agenda','action','spp_note')),
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 2000),
  notes TEXT CHECK(notes IS NULL OR length(notes) <= 8000),
  owner_id TEXT, due TEXT CHECK(due IS NULL OR due GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  task_id TEXT, done INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS meeting_items_meeting ON meeting_items(meeting_id, deleted);
CREATE TABLE IF NOT EXISTS meeting_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, by_id TEXT NOT NULL, meeting_id TEXT NOT NULL, item_id INTEGER,
  action TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TRIGGER IF NOT EXISTS meeting_log_no_update BEFORE UPDATE ON meeting_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS meeting_log_no_delete BEFORE DELETE ON meeting_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
-- page_access: allow the 'meetings' page (SQLite cannot change a CHECK, so the table is rebuilt; rows are kept).
CREATE TABLE page_access_0007(
  subject TEXT NOT NULL CHECK(subject LIKE 'group:%' OR subject LIKE 'person:%'),
  page TEXT NOT NULL CHECK(page IN('drawings','safety','timeline','scurve_station','scurve_caltex','tasks','files','meetings')),
  level TEXT NOT NULL CHECK(level IN('none','view','edit')),
  updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(subject, page)
);
INSERT INTO page_access_0007 SELECT subject, page, level, updated_by, updated_at FROM page_access;
DROP TABLE page_access;
ALTER TABLE page_access_0007 RENAME TO page_access;
-- From the site team, Tle, Jaran (id jaray) and Gift take part in meetings (Brian, 2 Nov 2026).
INSERT OR IGNORE INTO page_access(subject, page, level, updated_by, updated_at) VALUES
  ('person:tle', 'meetings', 'edit', 'brian', '2026-11-02T00:00:00.000Z'),
  ('person:jaray', 'meetings', 'edit', 'brian', '2026-11-02T00:00:00.000Z'),
  ('person:gift', 'meetings', 'edit', 'brian', '2026-11-02T00:00:00.000Z');
INSERT INTO page_access_log(subject, page, level, changed_by, changed_at) VALUES
  ('person:tle', 'meetings', 'edit', 'brian', '2026-11-02T00:00:00.000Z'),
  ('person:jaray', 'meetings', 'edit', 'brian', '2026-11-02T00:00:00.000Z'),
  ('person:gift', 'meetings', 'edit', 'brian', '2026-11-02T00:00:00.000Z');
