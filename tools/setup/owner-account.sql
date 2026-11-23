-- calwwt-identity: Brian's owner login "brian" (no password yet: he chooses it with a one-time setup code,
-- tools/setup/owner-setup-code.mjs). The binding names the owner id in production/wrangler.jsonc (LOCAL_AUTH_OWNER_ID).
INSERT INTO auth_accounts(id, username, role, password_hash, created_at) VALUES ('acct-brian', 'brian', 'owner', NULL, CAST(strftime('%s','now') AS INTEGER));
INSERT INTO auth_bindings(account_id, app_id, subject_id) VALUES ('acct-brian', 'portal', 'owner-6fa9e9e2-e9e9-4551-a752-89763be98c27');
