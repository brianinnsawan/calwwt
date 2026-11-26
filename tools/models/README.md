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
- `style.mjs`: ONE look for every site (colours by what a thing is, layer names and order, standard view names, the
  source sentence at the end of every note, naming rules). build.mjs applies it; a site file cannot change it.
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
The underground 25,000 L clean-water tank and the booster pump set (block "cold water system" in the same DWG) are in
the layer "Clean-water tank and pumps": a lying capsule tank 2.50 x 5.40 m on a 6.40 x 3.50 m base, as drawn; the depth
is not on the drawing (top shown 0.6 m below ground).
Fuel tanks (every site): `fuelTank()` in build.mjs draws a 30,000 L capsule tank where the drawing shows the tank;
depth is assumed (top 1.0 m below ground). Long lying tanks are capsules (`capsuleGeo`), never boxes.
Not yet used: site photos, 360 videos and Street View (building heights and what is on the surface are assumed).
Added 26 Nov 2026 from Brian's site photo and markup (not on the drawing unless said):
- the two 3-chamber oil traps at the east outlet, two separate traps in an L, almost touching (outlines from the DWG block
  "Z$W@#6334"; the road-side one is set 0.26 m west so there is a 10 cm gap). The west and middle outlet traps use the same
  block. Depth assumed 0.5 m below the inlet.
- WTT-4 as a lying capsule tank with two lids, 1.25 x 2.5 m (about 3,000 L, size to confirm).
- the shop sink against the east boundary wall (modelled like the photo: bowl, two wire shelves, dish rack, tap), its small
  (10 to 20 L) grease trap, the 2" PVC pipe lying on the ground the whole way along the wall and the mart front, and the
  sump on the west side of WTT-4. Positions from the markup; sizes and the sump depth assumed.
- the existing drain along the road edge: sumps F1 to F6 (not numbered on the drawing), flowing west to the existing
  3-chamber oil trap at the middle outlet. Levels from the two written pit bottoms (+0.288 at F4, +0.208 at F2).
- narrow-mouth gutters (O-gutters) where the front drain crosses the two driveways (kerbs on the drawing: west 332.2 to
  342.5, east 367.3 to 376.7): the drain pipe with a neck up to a 5 cm slot in a concrete strip. Not detailed on the drawing.
- the sink pipe is shown light blue (`pvcAbove` in style.mjs), like the real 2" PVC.
- PROPOSED OPTION (layer "Proposed works (option, not built)", pink; Brian, 26 Nov 2026): new 6" PVC from the two BO-2600
  tanks behind the middle building along the north boundary, picking up the KFC tank outlet (WTT-1) near N4 and WTT-2, down
  the west side of KFC in the soil, along the front of the parking to a new 20,000 L tank (Ø2.40 x 5.00 m capsule) in the
  parking in front of KFC, then to the west oil trap. Levels: 0.50 below the concrete at the start, KFC outlet 0.65 below
  the concrete at N4 (+0.17), then 1:200. Result: the pipe arrives at the oil trap at -0.19, 0.19 m below the trap's
  outlet (±0.00), and it crosses two existing drains at about the same level (+0.13 near N4, +0.07 south of KFC).
  The model carries a long section of it (`section()` in build.mjs, `scene.userData.sections`); the viewer's
  "Long section" button draws it like calcr's drainage sections.
- the front site drain now runs from manhole E7 along the front channel into the road-side oil trap (as drawn), instead
  of a straight line to the east trap.
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

## 1588 Samut Sakhon (first version, 25 Nov 2026, from PDFs)
Sources: `LAY-SN-101` (SPP as-built, 13/09/2019: drains, manholes, pipe sizes, 1:200 slopes, buildings, four fuel tank
outlines, and four tank outlines with no names) and `SN-103` (2019 design sheet for submission: the named tanks and the
wastewater pipes). `SN-101` (design) only for flow direction.
The two sheets do not agree: the as-built shows one lying tank in front of building A where the design has two upright
tanks. Both are in the model, the as-built outlines in their own layer. No sheet has any level: the ground is flat at
±0.00 and every depth is assumed. No north arrow.

## 1622 Ram Intra (first version, 25 Nov 2026, from PDFs)
Sources: layout `A-07` and details `A-14` to `A-17` ("FOR AS-BUILD", 2020): positions, pipe sizes, 1:200 slopes, ground
levels, tank model (Biotech BO-6000), road pit size and levels.
Assumed: every drain pipe and manhole depth (0.40 m cover at the start, falling 1:200), grease trap sizes, wastewater pipe
levels. North is taken as up the sheet from the road labels (Lak Si left, Min Buri right); the small north symbol on the
sheet reads the other way, so confirm against the map. The layout shows no canopy, pump islands or fuel tanks.

## 1687 Phetchaburi (first version, 25 Nov 2026, from PDFs)
Sources: plan `SN-01` and the pipe slope sheet (2024, stamped FOR CONSTRUCTION, so design, not as-built). They cover one
corner of the station only: shop building, office toilet, two existing tanks, grease trap, the two new 2,500 L tanks,
manholes, the 3-compartment trap and the public drain connection.
Assumed: existing tank depths, all site drain levels and sizes, manhole and trap depths, flat ground. The sheet is plotted
at about 1:114, not the 1:100 written on it (the model follows its scale bar). The plan says 2,500 L, the slope sheet
title says 3,000 L. No north arrow.

## 1703 King Kaew (first version, 25 Nov 2026, from PDFs)
Sources: `LAY-ME-02` (SPP as-built, Nov 2021: positions, pipe routes and the written "inv" levels) and `GN-SEP-01` (oil
trap size and depth).
Assumed: the ground. The layout has no ground levels; from the trap detail the whole site is taken flat at -0.85. Also
tank depths, round tank sizes, manhole floors, drain size. Nine manholes have no written level (interpolated and flagged).
To check on site: at SP-T-20,000 the inlet (-1.75) is lower than the outlet (-1.65); the north-east corner manhole says
-1.40 where the written falls give about -1.66. No north arrow.
