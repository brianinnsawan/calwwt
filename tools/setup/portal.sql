-- calwwt-portal: the owner record the sign-in checks (src/local-auth.mjs). Nothing else is kept here.
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT);
INSERT OR IGNORE INTO users(id, email, created_at) VALUES ('owner-6fa9e9e2-e9e9-4551-a752-89763be98c27', 'owner@calwwt.sppwork.com', '2026-11-23T00:00:00.000Z');
