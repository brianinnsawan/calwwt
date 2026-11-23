-- Live meeting pages (Brian, 2 Nov 2026: Meetings "like Microsoft Loop"). The page itself lives in a Durable Object
-- (portal-proposal/src/meeting-room.mjs); a copy is kept here every few seconds for previews, search and backups.
-- part: 'shared' (everyone with the Meetings page) or 'spp' (SPP only). state: the Yjs document (base64; NULL if very
-- large). text: readable plain text. editors_json: who edited since the last version.
CREATE TABLE IF NOT EXISTS meeting_docs(
  meeting_id TEXT NOT NULL, part TEXT NOT NULL CHECK(part IN('shared','spp')),
  state TEXT, text TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, editors_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY(meeting_id, part)
);
-- A version every 10 minutes of editing; never changed or deleted.
CREATE TABLE IF NOT EXISTS meeting_doc_versions(
  id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id TEXT NOT NULL, part TEXT NOT NULL CHECK(part IN('shared','spp')),
  state TEXT, text TEXT NOT NULL DEFAULT '', at TEXT NOT NULL, editors_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS meeting_doc_versions_meeting ON meeting_doc_versions(meeting_id, part, id);
CREATE TRIGGER IF NOT EXISTS meeting_doc_versions_no_update BEFORE UPDATE ON meeting_doc_versions BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS meeting_doc_versions_no_delete BEFORE DELETE ON meeting_doc_versions BEGIN SELECT RAISE(ABORT,'HISTORY_IS_APPEND_ONLY'); END;
