-- Project files (calnkt.sppwork.com/files): folders and files kept in private storage (R2 bucket bound as DRAWINGS,
-- keys under files/). SPP people see every file; partners only files shared with them (caltex_from date, Bangkok).
-- Also allows the new 'files' page on the Admin page.
CREATE TABLE IF NOT EXISTS file_folders(
  id TEXT PRIMARY KEY, parent_id TEXT REFERENCES file_folders(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  caltex_rule TEXT NOT NULL DEFAULT '' CHECK(caltex_rule IN('', 'weekly')),
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS files(
  id TEXT PRIMARY KEY, folder_id TEXT NOT NULL REFERENCES file_folders(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 200), size INTEGER NOT NULL, type TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL, caltex_from TEXT,
  uploaded_by TEXT NOT NULL, uploaded_at TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0, deleted_by TEXT, deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS files_folder ON files(folder_id, deleted);
CREATE TABLE IF NOT EXISTS file_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, by_id TEXT NOT NULL, action TEXT NOT NULL,
  file_id TEXT, folder_id TEXT, data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TRIGGER IF NOT EXISTS file_log_no_update BEFORE UPDATE ON file_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS file_log_no_delete BEFORE DELETE ON file_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
INSERT OR IGNORE INTO file_folders(id, parent_id, name, caltex_rule, created_by, created_at) VALUES
  ('safety', NULL, 'ความปลอดภัย · Safety', '', 'brian', '2026-11-01T15:00:00.000Z'),
  ('safety-weekly', 'safety', 'การประชุมความปลอดภัยประจำสัปดาห์ · Weekly safety meetings', 'weekly', 'brian', '2026-11-01T15:00:00.000Z'),
  ('engineering', NULL, 'วิศวกรรม · Engineering', '', 'brian', '2026-11-01T15:00:00.000Z');
-- page_access: allow the 'files' page (SQLite cannot change a CHECK, so the table is rebuilt; rows are kept).
CREATE TABLE page_access_0005(
  subject TEXT NOT NULL CHECK(subject LIKE 'group:%' OR subject LIKE 'person:%'),
  page TEXT NOT NULL CHECK(page IN('drawings','safety','timeline','scurve_station','scurve_caltex','tasks','files')),
  level TEXT NOT NULL CHECK(level IN('none','view','edit')),
  updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(subject, page)
);
INSERT INTO page_access_0005 SELECT subject, page, level, updated_by, updated_at FROM page_access;
DROP TABLE page_access;
ALTER TABLE page_access_0005 RENAME TO page_access;
