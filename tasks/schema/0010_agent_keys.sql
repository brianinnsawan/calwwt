-- Chief, Brian's AI assistant (Brian, 5 Nov 2026). Not a person on the site: it acts as the person who made its key,
-- with a short list of task actions only (portal-proposal/src/agent.mjs). Only a SHA-256 of each key is stored; the key
-- is shown once. Keys expire (90 days) and can be revoked. Everything done with a key is stamped "via" in the events.
CREATE TABLE IF NOT EXISTS agent_keys(
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 40),
  key_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, last_used_at TEXT
);
-- Requests per key per 15 minutes (a simple brake).
CREATE TABLE IF NOT EXISTS agent_hits(key_id TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY(key_id, win));
