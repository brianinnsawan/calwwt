-- Project trackers from "Caltex_Nti_Nkt_Construction_Change_Tracking_rev02_2026-10-30.xlsx" (Brian, 1 Nov 2026):
--   milestones       = sheet "Timeline" (Project Timeline Tracking): Design D1-6, Permission P1-12, Registration R1-6,
--                      Construction key milestones C1-12, with plan / actual / remarks. Shown at Schedule -> Milestones.
--   drawing_changes  = sheet "Design Change" (On-Site Design Change Tracking), empty in rev02. Drawings -> Drawing changes.
-- plan / actual: a date (YYYY-MM-DD), '-' (not applicable, as written in the sheet) or empty. Every change is logged.
CREATE TABLE IF NOT EXISTS milestones(
  id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 12),
  grp TEXT NOT NULL CHECK(grp IN('design','permission','registration','construction')),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
  plan TEXT CHECK(plan IS NULL OR plan='-' OR plan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  actual TEXT CHECK(actual IS NULL OR actual='-' OR actual GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  remarks TEXT CHECK(remarks IS NULL OR length(remarks) <= 400),
  sort INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS milestone_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, by_id TEXT NOT NULL, milestone_id TEXT NOT NULL,
  action TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TRIGGER IF NOT EXISTS milestone_log_no_update BEFORE UPDATE ON milestone_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS milestone_log_no_delete BEFORE DELETE ON milestone_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TABLE IF NOT EXISTS drawing_changes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL CHECK(length(item) BETWEEN 1 AND 200),
  description TEXT CHECK(description IS NULL OR length(description) <= 2000),
  drawing_no TEXT CHECK(drawing_no IS NULL OR length(drawing_no) <= 200),
  requester TEXT CHECK(requester IS NULL OR length(requester) <= 120),
  factor TEXT CHECK(factor IS NULL OR factor IN('A','C','E','I','R','U')),
  date TEXT CHECK(date IS NULL OR date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  deleted INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drawing_change_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, by_id TEXT NOT NULL, change_id INTEGER NOT NULL,
  action TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TRIGGER IF NOT EXISTS drawing_change_log_no_update BEFORE UPDATE ON drawing_change_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS drawing_change_log_no_delete BEFORE DELETE ON drawing_change_log BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
INSERT OR IGNORE INTO milestones(id, grp, name, plan, actual, remarks, sort, updated_by, updated_at) VALUES
  ('D1', 'design', 'Project Kick-Off', '2026-09-29', NULL, NULL, 1, 'brian', '2026-10-30T00:00:00.000Z'),
  ('D2', 'design', 'Site Survey', '2026-10-13', NULL, NULL, 2, 'brian', '2026-10-30T00:00:00.000Z'),
  ('D3', 'design', 'Drawing Review - 1', '2026-10-27', NULL, NULL, 3, 'brian', '2026-10-30T00:00:00.000Z'),
  ('D4', 'design', 'Drawing Review - 2', '2026-11-04', NULL, NULL, 4, 'brian', '2026-10-30T00:00:00.000Z'),
  ('D5', 'design', 'Drawing Review - 3', '2026-11-11', NULL, NULL, 5, 'brian', '2026-10-30T00:00:00.000Z'),
  ('D6', 'design', 'Package Completion', '2026-11-13', NULL, NULL, 6, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P1', 'permission', 'Const. Permit Submission - 1', NULL, NULL, 'ยื่น 39 ทวิ - date TBC', 7, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P2', 'permission', 'Const. Permit Submission - 2', '-', '-', NULL, 8, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P3', 'permission', 'Construction Permission - 1', '2026-11-06', NULL, 'อ.1', 9, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P4', 'permission', 'Construction Permission - 2', '-', '-', NULL, 10, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P5', 'permission', 'DOEB Submission', '2026-11-06', NULL, NULL, 11, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P6', 'permission', 'DOEB Permission', '2027-01-22', NULL, 'ธพ.น.2', 12, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P7', 'permission', 'Land Fill Submission', NULL, NULL, 'N/A', 13, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P8', 'permission', 'Land Fill Permission', NULL, NULL, 'N/A', 14, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P9', 'permission', 'Ingress/Egress Submission', '2027-02-05', NULL, NULL, 15, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P10', 'permission', 'Ingress/Egress Permission', '2027-02-01', NULL, 'Entrance & exit', 16, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P11', 'permission', 'Public Discharge Submission', '2027-02-05', NULL, NULL, 17, 'brian', '2026-10-30T00:00:00.000Z'),
  ('P12', 'permission', 'Public Discharge Permission', '2027-02-01', NULL, 'Piping', 18, 'brian', '2026-10-30T00:00:00.000Z'),
  ('R1', 'registration', 'Electric Meter', '2026-12-27', NULL, 'PEA', 19, 'brian', '2026-10-30T00:00:00.000Z'),
  ('R2', 'registration', 'Supply Water Meter', '2026-12-28', NULL, NULL, 20, 'brian', '2026-10-30T00:00:00.000Z'),
  ('R3', 'registration', 'Address Registration - 1', '2026-12-25', NULL, 'House registration', 21, 'brian', '2026-10-30T00:00:00.000Z'),
  ('R4', 'registration', 'Address Registration - 2', '-', '-', NULL, 22, 'brian', '2026-10-30T00:00:00.000Z'),
  ('R5', 'registration', 'Building Inspection', '2027-01-29', NULL, 'อ.5', 23, 'brian', '2026-10-30T00:00:00.000Z'),
  ('R6', 'registration', 'Fuel Trade M.11', '2027-01-25', NULL, 'มาตรา 11', 24, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C1', 'construction', 'Land Fill Work', '2026-10-17', NULL, 'Fill & compaction 17 Oct-8 Nov', 25, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C2', 'construction', 'Commencement Work', '2026-11-10', NULL, 'Pile locations verified', 26, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C3', 'construction', 'Construction Start', '2026-11-10', NULL, 'Pile driving 10-13 Nov', 27, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C4', 'construction', 'Tank Installation', '2026-11-25', NULL, 'Tank lift + water fill', 28, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C5', 'construction', 'Fuel System PSSR', '2027-02-02', NULL, 'After ม.11', 29, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C6', 'construction', 'High Rise Sign Lifting', '2027-02-01', NULL, 'HWS 20 m lift', 30, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C7', 'construction', 'Interim Inspection', '2026-12-17', NULL, 'Fuel system', 31, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C8', 'construction', 'Final Inspection', '2027-01-08', NULL, 'M&E', 32, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C9', 'construction', 'Hand Over - 1', '2027-02-02', NULL, 'Soft handover 2-9 Feb', 33, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C10', 'construction', 'Hand Over - 2', '2027-02-10', NULL, 'Handover to retailer', 34, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C11', 'construction', '1st Load', '2027-02-11', NULL, NULL, 35, 'brian', '2026-10-30T00:00:00.000Z'),
  ('C12', 'construction', 'As-Built Drawing', '2027-03-09', NULL, NULL, 36, 'brian', '2026-10-30T00:00:00.000Z');
