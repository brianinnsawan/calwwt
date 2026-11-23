-- Page access (none / view / edit) per group or person. No row = the built-in default (src/pages.mjs).
-- subject is 'group:<spp|team|caltex|ks|owner>' or 'person:<id>'.
CREATE TABLE IF NOT EXISTS page_access(
  subject TEXT NOT NULL CHECK(subject LIKE 'group:%' OR subject LIKE 'person:%'),
  page TEXT NOT NULL CHECK(page IN('drawings','safety','timeline','scurve_station','scurve_caltex','tasks')),
  level TEXT NOT NULL CHECK(level IN('none','view','edit')),
  updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(subject, page)
);
-- Every change is kept. level NULL = a person exception was removed (back to the group setting).
CREATE TABLE IF NOT EXISTS page_access_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, page TEXT NOT NULL, level TEXT,
  changed_by TEXT NOT NULL, changed_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS page_access_log_no_update BEFORE UPDATE ON page_access_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS page_access_log_no_delete BEFORE DELETE ON page_access_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
