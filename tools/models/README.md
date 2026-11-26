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
If the DWG will not convert here, ask Brian to open it in Civil 3D and Save As AutoCAD 2018 DXF; then
`python3 dxf/dxf-flatten.py drawing.dxf flat.pkl x0 y0 x1 y1` (needs `pip install ezdxf`) and
`python3 dxf/dxf-plan-lines.py flat.pkl <code>/plan-lines.json ox oy x0 y0 x1 y1 "note"` (used for 1642).

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

## 1156 Samut Prakan (rough first version, 26 Nov 2026, NO DRAWINGS)
There are no drawings of this site. Outlines come from the Esri World Imagery satellite image (zoom 19, 0.29 m a pixel),
turned 35.5° so the road runs along x, read on a 1 m grid (`1156/plan-lines.json` is that tracing, not a drawing); north
125.5°. What is where comes from Brian's notes of 26 Nov 2026 and stills of Aqua's 360° sampling video, plus the Caltex
deck slides 27-28 (G2.1 / G2.2 sampling points). In the model: the KFC grease trap (one tank, 4 lids) under the lane
behind KFC and the treatment tank (5 lids; Brian is not sure whether it is two tanks, 2 + 3 lids) under the lane behind KFC
after (west of) the grease trap (Brian's markup, 26 Nov 2026); the garbage building at the west end of KFC is about 2.5 m tall;
the KFC pump room behind the rolling door about midway along KFC, the KFC pump sump at the back-west corner
and its blue PVC pumped line along the west wall into the U-drain; the toilets' solids tank behind the building and the
aeration tank on the east side; the Mini Big C tank behind the exit-side oil trap between the east wall and the 12 m
pole signs; three fuel tanks lying parallel to the road between the toilets and the office, one with two compartments
(four products; Brian, 26 Nov 2026); 3-chamber oil traps at both outlets to the road; open concrete U-drains (channels,
not pipes; Brian, 26 Nov 2026) round the site; KFC, toilets, garbage room, office / Mini Big C, coffee shop, canopy, EV chargers, air pump; road and the elevated
structure in "surroundings". Every size, depth, level and pipe route is assumed. Notes use the source kinds `aerial`
and `aerialContext` (style.mjs) instead of drawn / part / context. Replace with real positions if Caltex sends drawings.

## 1622 Ram Intra (first version, 25 Nov 2026, from PDFs)
Sources: layout `A-07` and details `A-14` to `A-17` ("FOR AS-BUILD", 2020): positions, pipe sizes, 1:200 slopes, ground
levels, tank model (Biotech BO-6000), road pit size and levels.
Assumed: every drain pipe and manhole depth (0.40 m cover at the start, falling 1:200), grease trap sizes, wastewater pipe
levels. North is taken as up the sheet from the road labels (Lak Si left, Min Buri right); the small north symbol on the
sheet reads the other way, so confirm against the map. The layout shows no canopy, pump islands or fuel tanks.
KFC drive-through (added 26 Nov 2026): KFC's M&E design sheets `SN-01` / `SN-02` (THE QSR OF ASIA / EEE Engineering,
Feb 2020) and the Biotech drawing, found in Brian's 2020 email and filed in `Sites\1622 Ram Intra\03 Drawings\CAD\KFC 2020 (from email)`
(also on the Sites page as layouts). SN-01 was fitted to the model by the station drain manholes it shows (W7, W9 to W13 land within
about 0.1 m at about 29.5 px/m on the 240 dpi render): model X = 39.70 + (px - 855)/29.5, Y = 62.34 - (py - 128)/29.5. Items:
Biotech BC-K-15-D2.5 treatment tank (Ø2.50 x 7.40 m, 4 lids, pile cap 3.10 x 7.40 m), two BG-R-3000 grease traps, round BS-3000
for the KFC toilets, kitchen under-sink trap, SCB-50 blower and two water tanks in the KFC pump room, outlet sump KFC-1 and the
pipe north into W9 (as on site, Brian 26 Nov 2026 from the sampling video; SN-01 draws it south to W10), and the KFC building outline. All tagged 'part' (design, not as-built); pipe levels and tank depth assumed.

## 1687 Phetchaburi (first version 25 Nov 2026; whole station and surroundings 26 Nov 2026)
The south-east corner (sales building, office toilet, old tanks, the two new tanks, drains to the public drain) comes from
plan `SN-01` and the pipe slope sheet (2024, stamped FOR CONSTRUCTION). Brian's 2025 look-back deck (`Spp Septic Tank
Phetchaburi Look Back.pptx`) uses SN-01 as its "Layout As Built" and its site photos show the two tanks apart in two grass
areas, as on SN-01 (the January 2025 design and the station plan below show them side by side: not built that way).
The tanks are Premier SS-3A 3,000 L (Ø2.04 x 1.78 m, `SS-3A.pdf`); SN-01 says 2,500 L.
The rest of the station and the surroundings come from two DWGs in Brian's `24 25 Grease and Septic repair\เพชรบุรี Phetchaburi Robinson`:
- `Layout As Built งานถังบำบัด 3,000 ลิตร (โรบินสันเพชรบุรี).dwg`: the older Caltex station plan (legend items 1 to 45, fuel tanks
  T1 to T4, boundary 3,327 m², drainage block San-001, fuel pipe blocks Line-pile, north symbol 191.7°). No levels.
- `01 Robinson Petchburi_Laou4.dwg`: the Robinson Phetchaburi site plan (1:1000) with the station; levels +0.80 forecourt,
  ±0.00 Phetkasem Road.
Both sit on the SN-01 coordinates by a plain shift (no turn or scale): model = C - (204.75, 327.51), C = D - (4428.93, 2648.12),
checked on the old tanks, ten manholes and seven survey marks. `1687/make-lines.py` writes the station linework into
`plan-lines.json` (after the SN-01 lines) and the Robinson linework into `surroundings.json`.
Added: full boundary, canopy, pump islands, the four fuel tanks with their manholes, fill point, vent stack and fill, vent and
dispensing pipes, all station drains (open channels, 0.30 m pipes, sumps MH-11 to MH-35, numbered by the model), the
under-sink grease trap (item 15a) and its pipe to old tank 1, the 8,000 L tank (item 31; place confirmed by Brian 26 Nov 2026: lying capsule with 3 lids along the wall, size assumed),
the office building and the separate toilet building (open gap between, no roof), the garbage room between the toilets and the hedge and the pump room north-west of the toilets (places marked by Brian 26 Nov 2026, sizes estimated). Layer "surroundings" (shared in style.mjs, can be switched off): Phetkasem Road at -0.80, the
Robinson ground, the mall, the drive-through building, POP, car service and car wash as blocks, and the site plan linework.
From Brian's 2026 site video and photos (26 Nov 2026): the air pump enclosure and power socket box of the 8,000 L tank, the
~2 m hedge along the back (east) boundary planted on top of the drains MH-1 and MH-11 to MH-13 (layer buildings, `hedge`), and
the McDonald's pole sign next door (about 20 m, pipe about 0.86 m, plain panel head, no logo; layer surroundings). Places estimated.
Assumed: every depth outside the corner (pipes 1:200 from the existing drains, channels 0.25 m, fuel pipes 0.45 to 0.65 m,
fuel tank tops 1.0 m), canopy and building heights, dispensers, Robinson ground flat at ±0.00 and all its heights.

## 1703 King Kaew (first version, 25 Nov 2026, from PDFs)
Sources: `LAY-ME-02` (SPP as-built, Nov 2021: positions, pipe routes and the written "inv" levels) and `GN-SEP-01` (oil
trap size and depth).
Assumed: the ground. The layout has no ground levels; from the trap detail the whole site is taken flat at -0.85. Also
tank depths, round tank sizes, manhole floors, drain size. Nine manholes have no written level (interpolated and flagged).
To check on site: at SP-T-20,000 the inlet (-1.75) is lower than the outlet (-1.65); the north-east corner manhole says
-1.40 where the written falls give about -1.66. No north arrow.

## 1642 Phun Phon (first version, 26 Nov 2026, from DWG saved as DXF)
Sources: `A-104` (site plan with the treatment tank and clean-water tank positions, 1:200, drawn in metres) and `A-103`
(water supply: 20,000 L water tank, Grundfos CMB5-46PT pump, HDPE 1"). `6-9` is a Bio-San catalogue sheet only.
Brian saved the DWGs as DXF into `Sites\1642 Phun Phon Phuket\03 Drawings\_Working\calwwt\cad\`; read with `dxf/`.
From Brian (26 Nov 2026): the clean-water tank is under the disabled parking bay (A-104 block on layer "Tank", two lids,
outline about 2.7 x 4.0 m); the tank under the walkway behind the toilets (block "mc-12a_pl", layer FIBERGLASS TANK, three
lids) is the septic tank; the sales building is two storeys, the office one storey; Aqua sampled both oil traps
(entrance side and exit side) at the outlet pipe. The A-103 legend symbol for the water tank looks like the septic tank
block: go by Brian.
Also in it: the strapped tank in the front lawn (three MH-600 lids, +0.40; not named, taken as the shops' treatment tank
after the four round tanks in the east planter), two round Bio-San-style tanks at the office, every grated manhole and
drain run, the three outlet pits at the road (two are the sampled oil traps; the east-corner one is drawn the same way,
to confirm), four fuel tanks (the middle two have two lids), buildings, canopy and islands.
Assumed: every pipe level and size (no levels on any sheet: drains 0.30 m, 0.40 m cover at the start, 1:200; tank pipes
0.3 m under the tank top), tank depths, round tank sizes, building heights. North from the A-104 arrow (314.6).

1156 drive-through exit (Brian, 26 Nov 2026): KFC east wall at x -4.0, toilets x 3.9 to 11.8; KFC sidewalk 3 rows of 40 cm
tiles + 15 cm kerb, lane 4.0 m, toilet walkway 6 rows + 15 cm kerb; red pick-up booth with its window, flat roof over the
lane and PICK UP HERE sign, bollards; toilets drawn with walls, open front, red slatted screens, sink counters, red roof edge.
View "Drive-through exit: pick-up window and toilets". One garbage room only, by the toilets. Drive-through entry (Brian's
stills): 2.0 m height limiter, kerbed island, order point with roof on the west side of KFC (the box first drawn there and
called a garbage building); PAY HERE booth with roof and sign behind KFC after the pump room, AC condensers before it.
Views "Drive-through entry" and "Behind KFC: pump room and pay window".

## Kerbs, walkways and parking (shared layer "paving", from 26 Nov 2026)
`style.mjs` has a layer "Kerbs, walkways and parking" and materials walkway, kerbYellow, kerbRed, kerbPlain, bayLine, bayEV,
grass. First used at 1156 Samut Prakan, estimated from Brian's video stills and photo (no drawings): walkway along the KFC
front and its drive-through side, the curved kerb at the drive-through entry, walkways at the toilets, office / Mini Big C
and coffee shop, the coffee-shop planter, the pole-sign island (red-and-white kerb), the bays along the west wall (air pump,
two blue EV bays, six car bays) and the public footpath in "surroundings". Other sites can use the same layer.

## Tank documents found (26 Nov 2026)
Brian asked for more information on the tanks at every site from email and SharePoint. Filed in each site's
`03 Drawings\Tank documents` folder in the NFR Projects library, and added to the site pages as layouts (no prices):
- 1588 Porto Go: Biotech spec pack approved Aug 2019 (BG-600 grease trap, BO-1000, BO-4000, BO-6000, BO-R-7500 lying tank;
  FX-10-D1.5 water tank struck out), water storage tank spec, Chevron design change list (Jul 2019). The models are in the
  1588 tank notes; BG-600 suggests SN-103's "6.00 m³" grease trap label is a slip for 0.60 m³.
- 1703 King Kaew: KFC as-built sheets KFC-ME-03/04/05 and TOI-ME-01 (2021). Installed models: DOS LITETITE DLFS-15Q(N)
  (the layout's SP-T-15,000 L), 2× DOS SGT-07/BK-5000L grease traps, DOS OK ST-24/BK-1600L for the KFC toilet.
- 1750 Saraburi: Five Star grease trap replaced 2025 with a Premier GT-1600 (Ø1.60 × 1.40 m, two lids, on a slab and 5 piles;
  drawings from `NFR Projects\24 25 Grease and Septic repair\Saraburi Kaeng Khoi`), and DOS's 2022 diagram (a proposal).
- Nothing new found for 0589, 1156, 1622, 1642, 1687.

