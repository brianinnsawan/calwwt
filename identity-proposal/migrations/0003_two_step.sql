-- Audit N04 (Brian, 2 Nov 2026): 2-step sign-in (authenticator app) for admins, and a password re-check before admin changes.
-- secret: the authenticator secret, encrypted (portal-proposal/src/identity/totp.mjs). enabled_at NULL = set-up started, not finished.
-- last_step: the newest code time-step used, so a code cannot be used twice. recovery_json: hashes of unused recovery codes.
CREATE TABLE IF NOT EXISTS auth_totp (
 account_id TEXT PRIMARY KEY REFERENCES auth_accounts(id), secret TEXT NOT NULL, enabled_at INTEGER,
 last_step INTEGER NOT NULL DEFAULT 0, recovery_json TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL
);
-- two_step: this sign-in used the 6-digit code. confirmed_at: the last time the person re-entered their password on it.
ALTER TABLE auth_sessions ADD COLUMN two_step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auth_sessions ADD COLUMN confirmed_at INTEGER;
