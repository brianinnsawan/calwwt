# 3D site models (calwwt.sppwork.com, "3D model" tab)

One model per site: `portal-proposal/public/sites/models/<code>.glb`, named in `public/sites/data/sites.json` as `"model": "<code>.glb"`.
The page that shows it is `public/sites/viewer.mjs` (layers, ready-made views, see-through ground, click a thing to read its
size and levels). Everything the viewer shows (names, notes, layers, views, north) is stored inside the `.glb`.

## Change or rebuild a model
```
cd tools/models
npm ci            # first time only (three.js 0.170 + delaunator; not used by the website itself)
node build.mjs 0589
```
Then run the site tests and ship as usual (CLAUDE.md, "How to ship a change").

- `<code>/site.mjs`: what is on the site. Positions are the drawing's own x, y in metres; levels are metres from the
  drawing's datum. Each thing has an English and Thai name, notes, and a source: `drawn` (from the drawings),
  `part` (position from the drawings, size or depth assumed) or `context` (above ground, for orientation only).
  Say honestly which one applies: people plan digging from this.
- `<code>/plan-lines.json`: the as-built plan linework drawn on the ground (centimetres from `origin`).
- `build.mjs`: the shapes (box, cylinder, tank profile, pipe through points with invert levels, ground surface from the
  finished levels) and the `.glb` writer.

## Starting a new site
1. Copy the site's as-built DWG to `Sites\<code> ...\03 Drawings\_Working\calwwt\` and bring it here.
2. `cd dwg && npm i @mlightcad/libredwg-web && node dwg-to-json.mjs drawing.dwg drawing.json` then
   `python3 flatten.py drawing.json flat.pkl`. Plot regions of `flat.pkl` with a grid (matplotlib) to read positions;
   level labels are usually MULTILEADER / TEXT entities (look for blocks placed far off the sheet as well).
3. Write `<code>/site.mjs` (copy 0589), make `<code>/plan-lines.json` from the flattened lines, build, and compare the
   "Plan" view with the drawing before shipping.
A site with only PDF drawings can still be done: read positions off the PDF at its scale; mark more things `part`.

## 0589 Kathu (first version, 25 Nov 2026)
Sources: `Spp Caltex Kathu Septic As Built Combined.dwg` (plan, manhole levels, new tanks and pipes),
`Elevations on lift day.xlsx` (tank in / out levels), `Section Tank actual april 4.pdf` and
`Tank air pumps and elevations.pdf` (tank size, depth, base and piles).
Not yet used: site photos, 360 videos and Street View (building heights and what is on the surface are assumed).
Known gaps: sizes and depths of WTT-1, WTT-2, WTT-4, the two Biotech tanks, the grease traps and the old tank; pipe
routes for KFC and the middle building; which drain runs are pipe and which are channel; fuel tank depths.

## 1750 Saraburi (first version, 25 Nov 2026)
Sources (Brian's folder `Chevron Hub Site - NTI Saraburi CPF 2022\01. Drawings\As Built Saraburi`, SPP as-built set, Dec 2022):
`1.Layout\DWG\SN` wastewater layout DWG = LAY-SN-02 (positions, the level at every sump and tank connection; the DWG holds
two copies of the plan side by side, the right-hand one is the wastewater plan), COM-07 (tank and grease trap details),
COM-02 (3-chamber oil trap), COM-05 (sump standard), LAY-ST-03 (forecourt levels, read off the sheet).
What is in it: the three lying treatment tanks (DLFN-15Q Star Park, DTNC-15Q toilets, DLFN-12Q shops) with their base
slabs, 14 grease traps, the 6" pipe behind the shops, tank inlets and outlets, every site drain run with its sumps and
levels, both oil traps at the highway, fuel tank outlines, buildings and canopy.
Known gaps: air pumps (LAY-EE-09) not placed; tank depth is worked out from the inlet level and COM-07, not surveyed;
drain pipe size per run (drawn 0.40 m); the round tank at the office is not named on the layout; interior plumbing of
Star Park, toilets and shops is only in the plan linework; the layout shows the Star Park drain line along the west
edge of the DLFN-15Q tank (kept as drawn, flagged in the tank's notes); no site photos used.
