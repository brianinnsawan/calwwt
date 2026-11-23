calwwt.sppwork.com - first setup
=================================

DONE by Claude on 23 Nov 2026 (Cloudflare):
  - D1 databases calwwt-identity, calwwt-tasks, calwwt-portal; R2 buckets calwwt-files, calwwt-backups.
  - Databases loaded: identity-proposal/migrations/* + owner-account.sql  -> calwwt-identity
                      tasks/schema/0001..0011 + calwwt-start.sql + link-owner.sql -> calwwt-tasks
                      portal.sql -> calwwt-portal
    (people: Brian, Ming, Keng, Praew, Boss / Caltex Thada, Oat, Bas; task areas = the 8 sites; site file folders; milestones)

BRIAN does once (about 10 minutes):
  1. GitHub: the code is in brianinnsawan/calwwt.
  2. Cloudflare dashboard -> Workers & Pages -> Create -> Import a repository -> brianinnsawan/calwwt
       Project name:    calwwt
       Build command:   (empty)
       Deploy command:  npx wrangler deploy --config production/wrangler.jsonc
     The first build creates the Worker "calwwt".
     Then Worker calwwt -> Settings -> Domains & Routes -> Add -> Custom domain -> calwwt.sppwork.com
  3. Worker calwwt -> Settings -> Variables and Secrets -> add Secret
       AUTH_RATE_KEY = any random text, 32+ characters (keep it; do not reuse calnkt's)
     then Deployments -> Retry / redeploy once.
  4. R2 -> calwwt-backups -> Settings -> Bucket lock: 90 days (same as calnkt).
  5. Your own login: in this repository folder on your computer (PowerShell)
       npx wrangler login
       node tools/setup/owner-first-login.mjs
     It shows a one-time code on your screen. Open https://calwwt.sppwork.com/sign-in.html -> "setup code",
     choose username brian and your new password. Then Account -> set up 2-step (needed for Admin changes).
  6. Admin page -> People & logins: make logins for Ming, Keng, Praew, Boss, Thada, Oat, Bas (each gets a setup code).

Starting a fresh copy again (only if the databases were ever lost): create new databases, run the same files in the
same order (npx wrangler d1 execute <db> --remote --file <file>), put the new ids in production/wrangler.jsonc.
See also docs/RESTORE.md.
