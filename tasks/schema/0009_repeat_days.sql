-- Repeating tasks on chosen days (Brian, 5 Nov 2026: "remind us every Monday"; daily on the days a person picks).
-- repeat_days: the ISO weekdays the task repeats on, as digits in order ('1' = Monday … '7' = Sunday), e.g. '1' (every
-- Monday) or '123456' (Monday to Saturday); '' = does not repeat. series_id: the first task of a repeating series; every
-- copy carries it, and the newest copy holds the series' current settings. Each chosen morning at 06:00 Bangkok the
-- site makes that day's copy (and a bell reminder), even if the last one is still open (portal-proposal/src/repeats.mjs).
-- Additive only: existing rows keep their values; weekly tasks made before this repeat on the weekday of their due date.
ALTER TABLE tasks ADD COLUMN repeat_days TEXT NOT NULL DEFAULT '' CHECK(repeat_days = '' OR (length(repeat_days) <= 7 AND repeat_days NOT GLOB '*[^1-7]*'));
ALTER TABLE tasks ADD COLUMN series_id TEXT;
UPDATE tasks SET series_id = id,
  repeat_days = CAST((CAST(strftime('%w', COALESCE(due_date, start_date, substr(created_at, 1, 10))) AS INTEGER) + 6) % 7 + 1 AS TEXT)
  WHERE repeat = 'weekly' AND repeat_days = '';
CREATE INDEX IF NOT EXISTS tasks_series ON tasks(series_id);
