-- Audit N02 (Brian, 2 Nov 2026): the sign-in and account history cannot be changed, and cannot be deleted,
-- except sign-in / wrong-password records once they are older than 90 days (Brian: keep sign-ins 90 days;
-- the weekly job in portal-proposal/src/backup.mjs removes them). Account events are kept for the whole project.
-- Note: a person with direct database access in the Cloudflare dashboard could still remove these triggers;
-- they stop the site's own code (or a mistake in it) from rewriting history.
CREATE TRIGGER IF NOT EXISTS auth_audit_no_update BEFORE UPDATE ON auth_audit
BEGIN SELECT RAISE(ABORT, 'HISTORY_IS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS auth_audit_no_delete BEFORE DELETE ON auth_audit
WHEN NOT ((OLD.event LIKE 'login:%' OR OLD.event LIKE 'login\_failed:%' ESCAPE '\') AND OLD.at < CAST(strftime('%s', 'now') AS INTEGER) - 90 * 86400)
BEGIN SELECT RAISE(ABORT, 'HISTORY_IS_APPEND_ONLY'); END;
