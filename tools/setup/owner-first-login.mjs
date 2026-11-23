// Brian's one-time setup code for his owner login "brian" on calwwt.sppwork.com.
// Run on your own computer, in this repository folder (PowerShell):
//     npx wrangler login                      (only once, if wrangler is not signed in yet)
//     node tools/setup/owner-first-login.mjs
// It makes a new code, saves only its fingerprint in the calwwt-identity database, and shows the code on YOUR screen.
// Then open https://calwwt.sppwork.com/sign-in.html, choose "setup code", paste it and choose your password
// (within 15 minutes). The code works once. Run this again any time you need a new one (e.g. forgotten password).
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const code = randomBytes(32).toString('base64url');
const digest = createHash('sha256').update(code).digest('hex');
const expires = Math.floor(Date.now() / 1000) + 15 * 60;
// The ticket must carry the account's current version (as the Admin page does); it is invalidated if the account changes.
const sql = `INSERT INTO auth_tickets(digest, account_id, version, expires_at, purpose) SELECT '${digest}', id, version, ${expires}, CASE WHEN password_hash IS NULL THEN 'setup' ELSE 'reset' END FROM auth_accounts WHERE id='acct-brian' AND active=1;`;
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
execFileSync(npx, ['wrangler', 'd1', 'execute', 'calwwt-identity', '--remote', '--command', sql], { stdio: 'inherit', shell: process.platform === 'win32' });
console.log('\nSetup code (works once, for 15 minutes):\n\n    ' + code + '\n\nOpen https://calwwt.sppwork.com/sign-in.html -> setup code. Do not send this code to anyone.');
