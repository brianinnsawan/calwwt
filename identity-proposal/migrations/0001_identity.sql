-- LOCAL CANDIDATE ONLY. No real principals, credentials, tokens or grants seeded.
PRAGMA foreign_keys=ON;
CREATE TABLE auth_accounts (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 contact_email TEXT, role TEXT NOT NULL CHECK(role IN ('owner','reader')),
 password_hash TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 version INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
 CHECK(length(username) BETWEEN 3 AND 40)
);
-- Bindings must be separately reviewed existing immutable application IDs.
-- Contact email is never an authorization key and does not link identities.
CREATE TABLE auth_bindings (
 account_id TEXT NOT NULL REFERENCES auth_accounts(id), app_id TEXT NOT NULL CHECK(app_id IN('portal','scurve')),
 subject_id TEXT NOT NULL, PRIMARY KEY(account_id,app_id), UNIQUE(app_id,subject_id)
);
CREATE TABLE auth_tickets (
 digest TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 version INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER,
 purpose TEXT NOT NULL CHECK(purpose IN('setup','reset'))
);
CREATE TABLE auth_sessions (
 digest TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 app_id TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, idle_expires_at INTEGER NOT NULL
);
CREATE INDEX auth_sessions_account ON auth_sessions(account_id);
CREATE TABLE auth_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE auth_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, target_id TEXT, event TEXT NOT NULL, at INTEGER NOT NULL);
-- Atomic ticket redemption: credential/version changes and session invalidation
-- execute inside this statement's transaction, including concurrent requests.
CREATE TABLE auth_redemptions (ticket_digest TEXT PRIMARY KEY, password_hash TEXT NOT NULL, redeemed_at INTEGER NOT NULL);
CREATE TRIGGER auth_redeem BEFORE INSERT ON auth_redemptions BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM auth_tickets t JOIN auth_accounts a ON a.id=t.account_id
  WHERE t.digest=NEW.ticket_digest AND t.used_at IS NULL AND t.expires_at>NEW.redeemed_at
  AND a.active=1 AND a.version=t.version
 ) THEN RAISE(ABORT,'invalid_ticket') END;
 UPDATE auth_accounts SET password_hash=NEW.password_hash,version=version+1
 WHERE id=(SELECT account_id FROM auth_tickets WHERE digest=NEW.ticket_digest);
 DELETE FROM auth_sessions WHERE account_id=(SELECT account_id FROM auth_tickets WHERE digest=NEW.ticket_digest);
 UPDATE auth_tickets SET used_at=NEW.redeemed_at WHERE account_id=(SELECT account_id FROM auth_tickets WHERE digest=NEW.ticket_digest);
END;
CREATE TRIGGER auth_redemption_cleanup AFTER INSERT ON auth_redemptions BEGIN
 DELETE FROM auth_redemptions WHERE ticket_digest=NEW.ticket_digest;
END;
