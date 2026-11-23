-- calwwt.sppwork.com (23 Nov 2026): the timeline (Gantt) of each Caltex site and of the whole programme ('all').
-- Every save is a new row (the newest row is the current timeline); rows are never changed or removed.
CREATE TABLE IF NOT EXISTS site_timelines(
  site TEXT NOT NULL CHECK(site IN('0589','1156','1588','1622','1642','1687','1703','1750','all')),
  ver INTEGER NOT NULL,
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  saved_at TEXT NOT NULL,
  by_id TEXT NOT NULL,
  by_name TEXT NOT NULL,
  PRIMARY KEY(site, ver)
);
CREATE TRIGGER IF NOT EXISTS site_timelines_no_update BEFORE UPDATE ON site_timelines BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS site_timelines_no_delete BEFORE DELETE ON site_timelines BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
