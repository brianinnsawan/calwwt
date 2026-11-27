-- 8888 Caltex Chiang Rai KP3 (Brian, 27 Nov 2026): added as a site so it works like the 8 programme sites (Files folders,
-- task area, its own timeline). 8888 stands in until Caltex gives the site code. Safe to run again.
-- 1) site_timelines accepts '8888': SQLite cannot change a CHECK rule, so the table is copied into a new one with the wider
--    rule (every saved row is kept, in the same order) and the two append-only rules are put back.
CREATE TABLE IF NOT EXISTS site_timelines_v2(
  site TEXT NOT NULL CHECK(site IN('0589','1156','1588','1622','1642','1687','1703','1750','8888','all')),
  ver INTEGER NOT NULL,
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  saved_at TEXT NOT NULL,
  by_id TEXT NOT NULL,
  by_name TEXT NOT NULL,
  PRIMARY KEY(site, ver)
);
INSERT OR IGNORE INTO site_timelines_v2(site, ver, data_json, saved_at, by_id, by_name)
  SELECT site, ver, data_json, saved_at, by_id, by_name FROM site_timelines;
DROP TABLE site_timelines;
ALTER TABLE site_timelines_v2 RENAME TO site_timelines;
CREATE TRIGGER IF NOT EXISTS site_timelines_no_update BEFORE UPDATE ON site_timelines BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS site_timelines_no_delete BEFORE DELETE ON site_timelines BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
-- 2) Its folder in Files with the same four sub-folders as every site (0012_site_subfolders.sql).
INSERT OR IGNORE INTO file_folders(id, parent_id, name, caltex_rule, created_by, created_at) VALUES
  ('sites', NULL, 'สถานี · Sites', '', 'brian', '2026-11-23T00:00:00.000Z'),
  ('site-8888', 'sites', '8888 Chiang Rai KP3', '', 'brian', '2026-11-27T00:00:00.000Z'),
  ('site-8888-drawings', 'site-8888', 'แบบ · Drawings', '', 'brian', '2026-11-27T00:00:00.000Z'),
  ('site-8888-photos', 'site-8888', 'รูปและวิดีโอ · Photos & video', '', 'brian', '2026-11-27T00:00:00.000Z'),
  ('site-8888-lab', 'site-8888', 'ผลแล็บ · Lab results', '', 'brian', '2026-11-27T00:00:00.000Z'),
  ('site-8888-reports', 'site-8888', 'รายงานและบันทึก · Reports & notes', '', 'brian', '2026-11-27T00:00:00.000Z');
-- 3) Task area, after the 8 sites.
INSERT OR IGNORE INTO areas(id, name, position) VALUES ('s8888', '8888 Chiang Rai (KP3)', 10);
