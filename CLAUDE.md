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

**Plus 8888 Chiang Rai (KP3)** (Brian, 27 Nov 2026): a separate 2026 Caltex job added as a 9th site so it works like the others
(site page, Files folder with the 4 sub-folders, CAD workspace, task area, own timeline; `tasks/schema/0013_kp3_site.sql`,
applied to calwwt-tasks on 27 Nov 2026 with Brian's OK). **8888 is a stand-in**: change it everywhere (SITE_CODES, files.mjs
BUILT_IN_FOLDERS, sites.json, timelines/8888.json, the site_timelines CHECK, folder and area ids, CALCR_SITES) when Caltex
gives the real code. Not part of the 8-site programme timeline ("all"). Its 3D model stays on **calcr.sppwork.com**
(repo `brianinnsawan/calcr`, which keeps its own shared password for now): the site page's 3D model tab frames
`/api/sites/8888/calcr-link`, which signs the person in to calcr with a 2-minute ticket signed from AUTH_RATE_KEY;
calcr checks it at `POST /api/calcr-link/verify` through its service binding `CALWWT` (`src/calcr-link.mjs`). One way only:
calcr never links here. Later (Brian): move everyone to calwwt logins, bring the calcr viewer tools (measure, long sections,
septic options, truck paths, levels) into viewer.mjs, then retire the calcr password.

## Folders
- `portal-proposal/`: the site (`src/` server, `public/` pages, `tests/`).
- `portal-proposal/public/sites/`: the Sites tab. `index.html` + `sites.mjs` = all sites; `site.html` + `site.mjs` = one site
  (and `/sites/programme/`). `layouts.mjs` = wastewater layout viewer, `viewer.mjs` = 3D model (three.js in `vendor/`),
  `gantt.js` = timeline (copied from calcr). Data: `data/sites.json`, starting timelines `data/timelines/<code>.json`.
  Layouts: `layouts/<code>/<name>.pdf` + `.png` (page 1, for quick viewing). 3D models go in `models/<code>.glb` and are named
  in sites.json `"model"`. A site page has the tabs 3D model / Layouts / Timeline; the 3D model tab exists only when the site has one and is then the tab that opens first.
- `tools/models/`: makes the 3D models (`node build.mjs <code>` from `<code>/site.mjs`; see its README.md). The model
  carries its own names, notes, layers and views; `viewer.mjs` only shows them.
- Map on the Sites overview: `public/sites/map.mjs` (Leaflet in `vendor/leaflet/`), pins from `lat`/`lng` in sites.json
  (from Brian's Google My Maps). Backgrounds: OpenStreetMap (Map) and Esri World Imagery (Satellite); those two hosts are allowed
  in the Sites pages' security rules only (`SITES_CSP` in `src/sites.mjs`). Click a pin: Open site page / Zoom to site / Google Maps.
- Server side of Sites: `portal-proposal/src/sites.mjs` (pages + `/api/sites/<code>/timeline`, saved in `site_timelines`).
- `portal-proposal/public/cad-workspace/` + `src/cad-workspace.mjs`: Sites -> CAD workspace (copied from calnkt 27 Nov 2026; rules
  in tasks/ACCESS-RULES.md "CAD workspace"). Drawings = DWG / DXF files in Files (no project catalog: `src/cad-catalog.mjs` is
  empty; never list calnkt's NTI sheets). Full CAD program = Open CAD Studio 2026.41 in `full/v2026.41/` (the same files as calnkt). 2026.47 was
  put live and taken back on 27 Nov 2026: the web build only has the WebGL2 path and 2026.47's circle / ellipse shaders
  cannot run on it, so nothing draws (review: docs/cad-program-review-2026.47.md). For a newer release: check it draws in a
  browser first, then `scripts/import-cad-program.mjs` (written for 2026.47: zip SHA-256, tagged-source checks, wasm in parts).
- Files = the one home for documents (Brian, 27 Nov 2026; tasks/ACCESS-RULES.md "Files on calwwt"): SPP and Caltex see
  everything, Caltex uploads, pricing / contract papers refused by name (`pricingName` in src/files.mjs). Each site folder
  has Drawings / Photos & video / Lab results / Reports & notes (tasks/schema/0012_site_subfolders.sql). The site page's
  Drawings tab is `public/sites/sitefiles.mjs` (reads /api/files); the old built-in layouts (sites.json "layouts",
  public/sites/layouts) show until an admin presses "Move into Files" (/api/files/import-site-layouts/<code>); after that,
  add drawings by uploading to Files, not by changing the repository. DWG / DXF everywhere open in the CAD workspace.
  27 Nov 2026: the 29 built-in layouts were moved into Files, and 40 original DWGs (15 paired with their PDF by name),
  the 3 reports sent to Caltex (Reports to Caltex) and Caltex's CORO scope deck (Reference) were copied from SharePoint.
  CAD program saves become new Files next to the original ("<name> – copy <n> (<person>).dwg"); SPP and Caltex see each
  other's CAD notes. Site videos (Brian's 360° YouTube walkthroughs) are sites.json "videos", shown with Photos & video;
  1703 King Kaew added 27 Nov 2026; 1750 Saraburi has none and does not need one (Brian).
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
- 1156 Samut Prakan layouts (27 Nov 2026): 2019 Caltex site plan "Proposed 1" (DWG), KFC sanitary set SN-01 to SN-10 (2019),
  KFC tank as-builts A-101 / A-102 (2020, DWGs plotted here). Still no as-built wastewater layout of the station itself. 1642 Phun Phon has A-104 and A-103 (26 Nov 2026,
  plotted from Brian's CAD files). 1750 Saraburi has LAY-SN-02 and LAY-ST-03
  (from Brian's separate folder `Chevron Hub Site - NTI Saraburi CPF 2022\01. Drawings\As Built Saraburi`, a full SPP as-built set).
- 3D models (first versions, 25 Nov 2026; sources and gaps per site in tools/models/README.md): 0589 Kathu, 1750 Saraburi
  (as-built DWGs), 1588 Samut Sakhon, 1622 Ram Intra, 1687 Phetchaburi, 1703 King Kaew (from the PDF layouts), 1642 Phun
  Phon (26 Nov 2026, from A-104 / A-103 saved as DXF by Brian). 1156 Samut Prakan (26 Nov 2026): rough model with NO
  drawings, from the satellite image, Brian's notes and the sampling video (see tools/models/README.md). calcr.sppwork.com is his reference for what the viewer should grow into (measure tool,
  drainage long sections, find by ID, flow arrows).
- 1687 Phetchaburi (26 Nov 2026) shows the whole station plus its surroundings (Robinson, Phetkasem Road) in the shared layer
  "surroundings" that the viewer can switch off; other sites can use the same layer for their own context.
- All models share one look: `tools/models/style.mjs` (colours, layer names and order, view names, note wording). Brian asked
  for this on 25 Nov 2026; do not give a site its own colours or layer names.
- For the models still to build, from Brian (25 Nov 2026): at 1642 Phun Phon the main sales building is TWO storeys (other
  sites are one storey); the office on the entrance side is one storey. At 0589 Kathu the underground 25,000 L clean-water
  tank in front of the toilets by the firewall is in the model (layer "Clean-water tank and pumps").
- Fuel tanks on every site are 30,000 L capsule tanks (`fuelTank()` in tools/models/build.mjs), placed from the drawings;
  long lying tanks are capsules (`capsuleGeo`), never boxes (Brian, 25 Nov 2026). Depth of the fuel tanks is assumed: the
  Saraburi as-built set has fuel-system tank drawings (Brian's `As Built Saraburi` folder) that should give the real size
  and depth; read them when his computer is connected and update `FUEL_TANK` in style.mjs or the 1750 site file.
- 0589 Kathu, from Brian 26 Nov 2026: two oil traps in an L at the east outlet; the shop sink at the east end of the mart
  drains through a small grease trap and a 2" PVC pipe lying on the ground the whole way to a sump beside WTT-4; WTT-4 has
  two lids (size still to confirm). The existing drain along the road edge (sumps F1 to F6) runs west to a third oil trap at
  the middle outlet; all three outlets have the same 3-chamber trap. The two east traps are separate, almost touching.
  Narrow-mouth gutters (O-gutters) cross both driveways on the front drain. Above-ground PVC is light blue (`pvcAbove`).
- Proposed works go in the shared layer "proposed" (pink, `proposedPipe` / `proposedTank`), never mixed into the as-built
  layers. A model can carry long sections (`section()` in tools/models/build.mjs); the viewer shows a "Long section" button.
  0589 Kathu has one: Brian's KFC option of 26 Nov 2026 (new 6" PVC + 20,000 L tank); at 1:200 it ends 0.19 m below the
  west oil trap's outlet and clashes with two existing drains, so as drawn it does not work by gravity into the oil trap.
- 1622 Ram Intra (26 Nov 2026): the KFC drive-through tanks (Biotech 15,000 L treatment tank, 2 grease traps, BS-3000, pump room)
  are in the model from KFC's 2020 design sheets SN-01 / SN-02, fitted by the station drain manholes; design, not as-built.
  Sheets are 1622 layouts and in Brian's `Sites\1622 Ram Intra\03 Drawings\CAD\KFC 2020 (from email)`.
- Tank documents (26 Nov 2026): found in email / SharePoint and filed in each site's `03 Drawings\Tank documents` (1588, 1703,
  1750), also on the site pages as layouts; details in tools/models/README.md. 1156 (26 Nov 2026, Brian): 3 fuel tanks parallel
  to the road, one with two compartments; 3-chamber oil traps at both outlets; KFC grease trap 1 tank / 4 lids, treatment
  tank 1 tank / 5 lids (maybe 2 + 3) under the lane behind KFC after (west of) the grease trap, pump room midway along KFC; the box
  first drawn at the west end of KFC is the ORDER POINT (roof, menu boards, kerbed walkway), not a garbage building (Brian,
  26 Nov 2026); 2.0 m height limiter at the lane entry; PAY HERE booth behind KFC after the pump room; red DRIVE THRU tower at
  the KFC front-west corner. One garbage room only, by the toilets. Tank farm between the toilets and the office is a raised kerbed pad (material `pad`);
  each fuel tank has a fibreglass tank sump (`fuelSump`) with a 1 m lid, two on the 2-compartment tank.
  Front (Brian's stills and markup): entrance x -22 to -16.6, kerbed centre island x -16.6 to 2.5 (from the footpath to
  y -21.85; price sign turned to face along the road, IN sign), exit x 2.5 to 9; the front drain is a narrow-mouth gutter across
  both driveways and a U-drain with gratings round the island's inner side and ends, to the oil trap at each side. Main Caltex
  and KFC pole signs stay at the exit-side corner (Brian). Coffee shop: raised timber deck (`deck`) under a red awning, white planter tubs (`planterTub`). The drive-through comes out between KFC (east wall x -4) and the toilets (west wall x 3.9):
  KFC sidewalk 1.2 m + 15 cm kerb, lane 4.0 m, toilet walkway 2.4 m + 15 cm kerb (40 cm tiles); pick-up window with roof on the KFC side.
- Kerbs, walkways and parking go in the shared layer "paving" (materials walkway, kerbYellow, kerbRed, kerbPlain, bayLine,
  bayEV, grass in style.mjs); first used at 1156 (estimated from the video, 26 Nov 2026).
- Water sampling and final design (27 Nov 2026): `tools/models/<code>/sampling.json` + `tools/models/sampling.mjs`; viewer stages
  Existing / 2026 sampling / Final design. Brian: never copy the PowerPoint's lines; colour the model's OWN sumps and pipes
  red (G2.1) / blue (G2.2), add only what is needed, and agree each site with him (ask, with a plan picture). 0589 Kathu and
  1622 Ram Intra are done; the other 6 only highlight their sampled sumps so far. Details in tools/models/README.md.
  Proposed works (pink, e.g. the Kathu KFC option) show only in "Final design", never under Existing (Brian, 27 Nov 2026).
  "2026 sampling" = as built, all systems coloured; "Final design" = the same plus numbered changes (C1, C2 ...: new = dashed,
  removed = grey see-through), a change list and "Show the changes only" on the bottom card (Brian, 27 Nov 2026).
- Calmer site page (Brian, 27 Nov 2026): every left-panel section folds and the « button hides the whole panel (remembered per
  browser); the 3D view bar shows only Whole site / Plan / Sampling points + a "More views" list, and folds; the bottom card no
  longer shows the how-to hint, datum, model notes or deck source (still in each .glb) — only the short sampling summary.
  The bottom card never closes: its title bar folds it (no × button; Brian, 27 Nov 2026), remembered per browser.
  The hint, datum, model notes and deck source are back in a closed "About this model" fold at the foot of that card
  (Brian, 27 Nov 2026; he will say what to change in it).
  Brian will say what site notes to add later; do not add notes on his behalf.
- Layers panel and names (Brian, 27 Nov 2026; viewer.mjs): folds "Wastewater and treatment" (layers tanks, sewer, drains, air,
  base, sampling, proposed, old, asbuilt) / "Buildings and site" (the rest) / "Names" / "Display" / "Sampling points". Names tidy
  themselves (switch "Tidy names", on by default): camera more than 2.4 site-widths away = only the site's name; closer, each
  name shows within REACH[prio] site-widths of the camera (sampling 0: always; tanks/drains/proposed 1: 2.4; other wastewater
  2: 1.25; buildings and site 3: 0.6; surroundings 4: 0.5) and overlapping names give way to the more important / nearer one.
  He does not want users to have to switch layers often: keep it automatic.
- Phones (Brian, 27 Nov 2026): ONE site for desktop and phone; the layout changes by screen size and the desktop look must
  not change (checked pixel-for-pixel against the old pages at 1440, 1280 and iPad 1024). Every phone rule sits in a
  narrow-screen block: `@media (max-width: 760px)` (phone upright) or `(max-height: 500px) and (pointer: coarse)` (phone
  sideways; mouse screens never match). Site page on a phone: no page scrolling; short header with the tabs; the rest of the
  left panel is the fold-down "Site info" (`#drawer`, folded at first, remembered as `calwwt.rail.offPhone`, apart from
  the desktop panel); 3D: Views / Layers at the top, stage switch full width at the foot, sampling card folded at first
  (`calwwt.v3.cardPhone`) and opening when something is tapped, the ready-made views step back to fit a tall screen
  (`fit()` in viewer.mjs); Drawings: a PDF shows as a card with the page picture and "Open PDF" (phone browsers do not show
  a PDF inside a page); Timeline stays under the tabs. Sample first (site page); then Sites overview, Files, Tasks,
  Meetings, CAD workspace.
- Buildings (Brian, 28 Nov 2026; sources and fits in tools/models/README.md): 1588 Porto Go and 1703 King Kaew have their
  buildings, canopies, signs, kiosks, car wash and garbage rooms from the architect DWGs + 360 video; 1750 Saraburi has the MDB,
  PEA poles / transformers (EE layout) and the staff container by the office (satellite). Videos: watch page at 2160p, turn the
  360 view; new materials in style.mjs (kiosk, canopyRed, mdb, pole, container ...).
- Site notes and starting timelines in `data/sites.json` / `data/timelines/` were written from Brian's site-visit notes; dates to confirm.
