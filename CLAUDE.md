# Caltex 2027 wastewater project site (calwwt.sppwork.com)

The secure project site for the Caltex 2027 wastewater improvement programme at SPP's 8 Caltex sites. Owner: Brian.
Built on 23 Nov 2026 from the calnkt.sppwork.com portal (`brianinnsawan/nti-city-park-portal`: sign-in, 2-step, people,
tasks, files, meetings, backups) plus the calcr.sppwork.com site viewer and editable timeline (`brianinnsawan/calcr`).
Nothing is shared with calnkt: own logins, own databases, own file storage.

## Where things are
- **Code:** GitHub `brianinnsawan/calwwt`. `main` is what is live.
- **Hosting:** Cloudflare Worker `calwwt`, custom domain calwwt.sppwork.com. Cloudflare Workers Builds deploys every merge to
  `main` (deploy command `npx wrangler deploy --config production/wrangler.jsonc`). Entry: `portal-proposal/src/worker.mjs`.
- **Databases (Cloudflare D1):** TASKS_DB `calwwt-tasks` bba26309-c326-4afb-89cb-a95d9c7ca315 (people, tasks, files list,
  meetings, milestones, site timelines), AUTH_DB `calwwt-identity` 887a55ef-9e16-4df4-9673-e9238b21dc56 (logins),
  DB `calwwt-portal` efc8cd7f-493d-440e-ad9d-75bf9ab852bb (owner record only).
- **Storage (R2):** DRAWINGS = `calwwt-files`, BACKUPS = `calwwt-backups`. Live meeting pages: Durable Object MEETING_ROOMS.
- **Scheduled jobs:** `0 19 * * 6` weekly backup; `0 23 * * *` repeating tasks (06:00 Bangkok).
- **First setup** (databases, Brian's owner login, secret): `tools/setup/README.md`.
- **Brian's project folder** (on his PC): `D:\office files new May 22\Phucharoen Construction & Service Co., Ltd\Chevron Hub Site - NFR Projects\2027 Wastewater`
  (folder rules in its `README - Folder Rules.txt`; per-site folders `Sites\<code> <name>\`).

## The 8 sites
0589 Kathu Phuket · 1156 Samut Prakan · 1588 Samut Sakhon (Porto Go) · 1622 Ram Intra · 1642 Phun Phon Phuket ·
1687 Phetchaburi · 1703 King Kaew · 1750 Kaeng Khoi Saraburi. The list lives in `portal-proposal/src/sites.mjs` (SITE_CODES),
`portal-proposal/public/sites/data/sites.json` (names, notes, layouts) and `tasks/schema/0011_site_timelines.sql`.

## Folders
- `portal-proposal/`: the site (`src/` server, `public/` pages, `tests/`).
- `portal-proposal/public/sites/`: the Sites tab. `index.html` + `sites.mjs` = all sites; `site.html` + `site.mjs` = one site
  (and `/sites/programme/`). `layouts.mjs` = wastewater layout viewer, `viewer.mjs` = 3D model (three.js in `vendor/`),
  `gantt.js` = timeline (copied from calcr). Data: `data/sites.json`, starting timelines `data/timelines/<code>.json`.
  Layouts: `layouts/<code>/<name>.pdf` + `.png` (page 1, for quick viewing). 3D models go in `models/<code>.glb` and are named
  in sites.json `"model"`.
- Map on the Sites overview: `public/sites/map.mjs` (Leaflet in `vendor/leaflet/`), pins from `lat`/`lng` in sites.json
  (from Brian's Google My Maps). Backgrounds: OpenStreetMap (Map) and Esri World Imagery (Satellite); those two hosts are allowed
  in the Sites pages' security rules only (`SITES_CSP` in `src/sites.mjs`). Click a pin: Open site page / Zoom to site / Google Maps.
- Server side of Sites: `portal-proposal/src/sites.mjs` (pages + `/api/sites/<code>/timeline`, saved in `site_timelines`).
- `tasks/`: the Tasks app (`src/policy.mjs`, `src/service.mjs`, `src/pages.mjs` = page list and default access, `public/` screens,
  `schema/` database changes). After changing `tasks/public/*`: `cd tasks && node scripts/build-ui-module.mjs`.
- `portal-proposal/files-viewer/`: Office viewers (rebuild: `cd portal-proposal/files-viewer && npm ci && npm run build`).
- `identity-proposal/`: sign-in. `schedule/gate-core.mjs`: Thailand-only site gate. `tools/backup/`: restore helper.
- `tasks/ACCESS-RULES.md`: permissions (from calnkt; page ids kept: 'drawings' = Sites, models & drawings; 'timeline' = timelines
  and milestones; 'safety' / 'scurve_*' have no pages on calwwt).

## Adding a layout or model for a site
1. Find the drawing in Brian's folder (`Sites\<code> ...\03 Drawings`). Files more than 7 folders deep cannot be copied by
   Claude directly: copy them to `Sites\<code> ...\03 Drawings\_Working\calwwt\` first (allowed by his folder rules).
2. Put the PDF in `portal-proposal/public/sites/layouts/<code>/<code>-<what>.pdf`, make the page image
   (`pdftoppm -r <dpi> -png -singlefile`, long side about 4000 px, then `convert ... -colors 64 PNG8:`), and add it to
   `layouts` in `data/sites.json` (en, th, source). A test checks every listed PDF and PNG exists.

## How to ship a change
1. Branch from `origin/main` (`claude/<short-name>`). Never force-push.
2. Run the tests: `node --test portal-proposal/tests/*.test.mjs tasks/tests/*.test.mjs identity-proposal/tests/*.test.mjs`
3. Push, open a pull request, merge it (Brian has authorized merging), then wait for "Workers Builds: calwwt" on the merge commit.
4. Tell Brian in plain language what changed and that it is live.

## Rules
- Changes to the production databases need Brian's explicit OK in the conversation first.
- Never show the word "subcontractor" (English or Thai); a test enforces this. Say "site team".
- Never paste or ask for passwords, keys or tokens. Brian's own setup code comes from `tools/setup/owner-first-login.mjs`, run by him.
- No email or LINE notifications from the site.
- The live people list is in the database (Admin page). Starting list (23 Nov 2026): SPP Brian, Ming, Keng, Praew, Boss;
  Caltex Thada (PM, "P.Ex"), Oat, Bas. `tasks/src/roster.mjs` is NTI test data only.
- D1 takes at most 100 values in one query: never bind a list that grows with the data.
- Never send INTERNAL pricing (Brian's `01 BOQ & Pricing\INTERNAL - Do Not Send`) to the site where Caltex can see it.
- Thai wording was written by Claude and needs a native-speaker review.
- Brian is not a programmer: explain in plain words, lead with what changed for the people using the site.

## Open items (23 Nov 2026)
- Layouts still missing: 1642 Phun Phon and 1156 Samut Prakan (Brian asked Thada), 1750 Saraburi (not needed yet).
- No 3D models yet for any site.
- Site notes and starting timelines in `data/sites.json` / `data/timelines/` were written from Brian's site-visit notes; dates to confirm.
