// ONE look for every site model (Brian, 25 Nov 2026: "all the models should look and feel the same").
// build.mjs applies this to every site: a site file cannot change these colours, layer names or standard view names.
// A site file picks which layers it uses and adds its own objects; it may add an extra material or layer only for
// something no other site has.

/** Colours by what the thing is: [colour, see-through amount (1 = solid)]. */
export const MATERIALS = {
  // ground and drawing
  siteGround: [0xd9d6d0, 0.38], road: [0x6b6661, 0.5], planLine: [0x66727c], planDrainLine: [0x0f8f84],
  // tanks
  tank: [0x0f9aa6, 0.8],         // wastewater treatment / septic tank (teal)
  tankOlder: [0x4f86c6, 0.7],    // a treatment tank that was there before the newer work, where a site shows both (blue)
  grease: [0xc0892b, 0.75],      // grease trap (amber)
  oilTrap: [0x7c5cc4, 0.7],      // oil trap / oil-water separator at an outfall (purple)
  tankOld: [0x8d9399, 0.45],     // tank or pipe out of use (grey)
  cover: [0x2f3a44],             // lids and gratings at ground level
  // pipes
  sewerRaw: [0xb4531a],          // wastewater before treatment (brown)
  sewerTreated: [0x2f6fde],      // treated water (blue)
  drain: [0x7b8794],             // site drain (grey)
  manhole: [0x9aa5b1, 0.55],
  airLine: [0xe0b100], airPump: [0x3aa655],
  pvcAbove: [0x3ea9e6],          // small PVC pipe lying above ground, shown light blue like the real pipe (Brian, 26 Nov 2026)
  fixture: [0xb3bcc6, 0.9],      // sinks and other fixtures above ground (stainless grey)
  waterTank: [0x58b7e6, 0.5],    // clean-water storage tank and its pumps (light blue): not wastewater, shown because it is in the way of digging
  // proposed works (options, not built): one pink for every site so a proposal never looks like something that is there
  proposedPipe: [0xd9468f], proposedTank: [0xd9468f, 0.55],
  // structure and context
  slab: [0xb7b1a8, 0.9], pile: [0x8c857b],
  fuel: [0xf2a51a, 0.6], building: [0xc4ccd4, 0.22], roof: [0xdfe5ea, 0.3], column: [0x9aa5b1],
  fuelSump: [0x2f6e4f, 0.85],    // fibreglass tank sump (manhole chamber) on top of a fuel tank, under its 1 m lid
  fuelPipe: [0xd9860b],          // underground fuel pipes (fill, vent and dispensing lines), darker than the fuel tanks
  islands: [0x8f98a1, 0.9],      // pump islands and dispensers
  // surroundings outside the station (layer "surroundings", can be switched off): paler, so the station stays in front
  surroundGround: [0xe3e6dc, 0.55], surroundBuilding: [0xd3d8de, 0.3], surroundLine: [0xa3acb4],
  hedge: [0x4f8a3c, 0.6],       // hedges and rows of shrubs
  // kerbs, walkways and parking (layer "paving"): raised walkways, painted kerbs, parking-bay paint
  walkway: [0xcfc6b8, 0.85],     // raised walkway / footpath slab
  pad: [0xcfc6b8, 0.35],         // large raised pad over tanks (tank farm): see-through so the tanks under it show
  kerbYellow: [0xe0b100],        // kerb painted yellow and black
  kerbRed: [0xc8432f],           // kerb painted red and white
  kerbPlain: [0x9c968c],         // plain concrete kerb
  bayLine: [0xf4f2ec],           // white parking-bay lines
  bayEV: [0x2f7fd1, 0.85],       // blue painted EV bay
  grass: [0x6f9a4a, 0.75],       // grass and planting beds
  deck: [0x5a4636, 0.9],          // raised timber deck
  planterTub: [0xeeeeea],        // small white concrete planter tub
  signPanel: [0xc8432f, 0.95],   // the head of a tall pole sign (plain panels, no logo)
  signDark: [0x2b3138],          // dark sign panels and round signs
  kiosk: [0xc0392b, 0.85],       // red steel container shop / car-wash booth
  kioskWhite: [0xf2f2ee, 0.9],   // white kiosk or booth
  screen: [0xf4f4f0, 0.6],
  glassGreen: [0x2e8b57, 0.6],   // green-tinted shop glazing (coffee shop front)       // white slatted screen wall (e.g. round water tanks)
  // water sampling (layer "sampling"): red = G2.1 (oil side), blue = G2.2 (wastewater side), as in the Caltex deck (SPP Sites R1)
  sampleG21: [0xd7263d],         // G2.1 (a new sampling sump that is not in the model yet)
  sampleG22: [0x1f6fe0],         // G2.2
  sampleAnchor: [0x1f6fe0, 0],   // invisible marker that carries a sampling point's label and data
  sampleOWS: [0xff66cc, 0.85],   // pink triangle = place for a new OWS or new WWT (final design)
  sampleFlag: [0xf08c00],        // orange flag = something to fix in the final design (e.g. waters mixing)
};

/** Layers, in the order they are listed in the viewer. A site uses the ones it needs. */
export const LAYERS = [
  { id: 'tanks', en: 'Treatment tanks and grease traps', th: 'ถังบำบัดและถังดักไขมัน' },
  { id: 'sewer', en: 'Wastewater pipes', th: 'ท่อน้ำเสีย' },
  { id: 'drains', en: 'Site drains, manholes and oil traps', th: 'ท่อระบายน้ำ บ่อพัก และบ่อดักน้ำมัน' },
  { id: 'air', en: 'Air pumps and air lines', th: 'ปั๊มลมและท่อลม' },
  { id: 'base', en: 'Tank base slabs and piles', th: 'ฐานถังและเสาเข็ม' },
  { id: 'water', en: 'Clean-water tank and pumps', th: 'ถังเก็บน้ำดีและปั๊มน้ำ' },
  { id: 'sampling', en: 'Water sampling points', th: 'จุดเก็บตัวอย่างน้ำ' },
  { id: 'proposed', en: 'Proposed works (option, not built)', th: 'งานที่เสนอ (ทางเลือก ยังไม่ได้ก่อสร้าง)' },
  { id: 'old', en: 'Tanks and pipes out of use', th: 'ถังและท่อที่เลิกใช้' },
  { id: 'fuel', en: 'Fuel tanks', th: 'ถังน้ำมันใต้ดิน' },
  { id: 'buildings', en: 'Buildings and canopy', th: 'อาคารและหลังคาคลุมหัวจ่าย' },
  { id: 'paving', en: 'Kerbs, walkways and parking', th: 'ขอบคันหิน ทางเดิน และที่จอดรถ' },
  { id: 'surroundings', en: 'Surroundings (outside the station)', th: 'พื้นที่รอบสถานี (นอกแนวเขต)' },
  { id: 'plan', en: 'Drawing on the ground', th: 'แบบบนพื้น' },
  { id: 'ground', en: 'Ground surface', th: 'ผิวพื้น' },
];

/** Standard views. Every site has site, plan and under (and samples, added by build.mjs when the site has sampling.json, after plan), and fuel when it has fuel tanks, and area when it shows its surroundings, in this order: site, plan, close-ups..., fuel, area, under. */
export const VIEWS = {
  site: { en: 'Whole site', th: 'ทั้งสถานี' },
  plan: { en: 'Plan', th: 'ผัง' },
  samples: { en: 'Sampling points', th: 'จุดเก็บตัวอย่าง' },
  fuel: { en: 'Fuel tanks', th: 'ถังน้ำมัน' },
  area: { en: 'Station and surroundings', th: 'สถานีและพื้นที่รอบ' },
  under: { en: 'From below ground', th: 'มองจากใต้ดิน' },
};

/** The last line of every object's notes: where its numbers come from. */
export const SRC = {
  drawn: { en: 'Position and levels are from the drawings.', th: 'ตำแหน่งและระดับมาจากแบบ' },
  part: { en: 'Position is from the drawings. Size or depth is assumed or from a standard detail.', th: 'ตำแหน่งมาจากแบบ ขนาดหรือความลึกเป็นค่าสมมติหรือมาจากแบบมาตรฐาน' },
  context: { en: 'Outline is from the drawings. Height is assumed, for context only.', th: 'แนวมาจากแบบ ความสูงเป็นค่าสมมติ ใช้ดูประกอบเท่านั้น' },
  // a site with no drawings at all (1156 Samut Prakan): placed from the satellite image and Brian's site video
  aerial: { en: 'No as-built layout of this station: position is from the satellite image and Brian\'s site video; size and depth are assumed.', th: 'ไม่มีผังตามจริงของสถานีนี้: ตำแหน่งมาจากภาพถ่ายดาวเทียมและวิดีโอหน้างานของ Brian ขนาดและความลึกเป็นค่าสมมติ' },
  // a tank whose type, size and depth come from its own drawing, but whose place is not on any drawing (1156 KFC tanks)
  aerialTank: { en: 'Type, size and depth are from the tank drawing; position is from the satellite image, Brian\'s markup and site video (no site layout).', th: 'รุ่น ขนาด และความลึกมาจากแบบถัง ตำแหน่งมาจากภาพถ่ายดาวเทียม ภาพที่ Brian ระบุ และวิดีโอหน้างาน (ไม่มีผังบริเวณ)' },
  aerialContext: { en: 'Outline is from the satellite image; height is judged from Brian\'s site video, for context only.', th: 'แนวมาจากภาพถ่ายดาวเทียม ความสูงประมาณจากวิดีโอหน้างานของ Brian ใช้ดูประกอบเท่านั้น' },
};
/** Underground fuel tanks, the same on every site (Brian, 25 Nov 2026): a lying 30,000 litre capsule tank with slightly
 *  rounded ends, placed where the drawing shows it. 2.3 m across and 7.5 m long is the outline on the Kathu and Saraburi
 *  as-built drawings. The depth is not on the wastewater drawings: the top is shown `cover` below ground. */
export const FUEL_TANK = { litres: 30000, dia: 2.3, len: 7.5, dish: 0.28, cover: 1.0 };

/** notes(en lines, th lines, 'drawn' | 'part' | 'context' | 'aerial' | 'aerialTank' | 'aerialContext') -> the info object for add(). */
export const notes = (en, th, kind) => ({ en: [...en, SRC[kind].en], th: [...th, SRC[kind].th] });

// Naming, so the same thing reads the same on every site:
//   manholes and sumps:  "Manhole <id>" / "บ่อพัก <id>", with lvl = the level as written, e.g. "-0.84" (no "IN", no "inv")
//   treatment tanks:     tag = the tank's model or name on the drawing ("DLFN-15Q", "Tank 1", "WTT-1")
//   grease traps:        tag "Grease traps" on the first of a row; oil traps: tag "Oil trap (west outfall)"
//   treated-water pipes: tag "Treated water out"
//   fuel tanks:          always fuelTank(label, x, y, rot) from build.mjs, never a box
//   long lying tanks:    capsuleGeo(...) (slightly rounded ends), never a box or a flat-ended cylinder
//   buildings:           tag = the name on the drawing ("KFC", "Toilets", "Shops 1", "Canopy")
//   notes:               first what it is and its size, then levels, then anything to check on site, then the source line

// ---- water sampling (tools/models/<code>/sampling.json; build.mjs draws the points, viewer.mjs shows the card and the stages)
/** The PCD effluent standard for service stations (mandatory from Sept 2026), as in Brian's "Sampling Counts R2" sheet.
 *  [min, max] in mg/L (pH has no unit); null = no limit on that side. A combined G2.1+G2.2 point is tested for both lists;
 *  where both groups list a parameter (pH, TSS) the stricter limit applies. */
export const SAMPLE_GROUPS = {
  'G2.1': { en: 'Group 2.1: fuel dispensing, oil change or maintenance', th: 'กลุ่ม 2.1: จ่ายน้ำมัน เปลี่ยนน้ำมันเครื่อง หรือซ่อมบำรุง',
    limits: { pH: [5.5, 9.0], COD: [null, 140], TSS: [null, 60], TPH: [null, 5.0] } },
  'G2.2': { en: 'Group 2.2: other services that make wastewater (toilets, kitchens, shops)', th: 'กลุ่ม 2.2: บริการอื่นที่ก่อให้เกิดน้ำเสีย (ห้องน้ำ ครัว ร้านค้า)',
    limits: { pH: [5.5, 9.0], BOD: [null, 40], TSS: [null, 50], TDS: [null, 3000], Sulfide: [null, 1.0], TKN: [null, 40], 'O&G': [null, 15] } },
};
export const PARAM_NAMES = {
  pH: { en: 'pH', th: 'pH' }, COD: { en: 'COD', th: 'COD' }, BOD: { en: 'BOD', th: 'BOD' }, TSS: { en: 'TSS (suspended solids)', th: 'TSS (ของแข็งแขวนลอย)' },
  TDS: { en: 'TDS (dissolved solids)', th: 'TDS (ของแข็งละลายน้ำ)' }, Sulfide: { en: 'Sulfide', th: 'ซัลไฟด์' }, TKN: { en: 'TKN (nitrogen)', th: 'TKN (ไนโตรเจน)' },
  'O&G': { en: 'Oil and grease', th: 'น้ำมันและไขมัน' }, TPH: { en: 'TPH (petroleum hydrocarbons)', th: 'TPH (ปิโตรเลียมไฮโดรคาร์บอน)' },
};
/** The limits a point is checked against: one group, or both for "G2.1+G2.2" (stricter limit where both list it). */
export const limitsFor = (group) => {
  const out = {};
  for (const g of group.split('+')) for (const [k, [lo, hi]] of Object.entries(SAMPLE_GROUPS[g].limits)) {
    const o = out[k];
    out[k] = o ? [lo == null ? o[0] : o[0] == null ? lo : Math.max(o[0], lo), hi == null ? o[1] : o[1] == null ? hi : Math.min(o[1], hi)] : [lo, hi];
  }
  return out;
};
/** The three kinds of marker, with the deck's own words (Caltex WWT Improvement - SPP Sites R1). */
export const SAMPLE_STATUS = {
  existing: { en: 'Existing sampling point', th: 'จุดเก็บตัวอย่างเดิม' },
  new: { en: 'New sampling point', th: 'จุดเก็บตัวอย่างใหม่' },
  construction: { en: 'Construction sampling point (future)', th: 'จุดเก็บตัวอย่างที่จะก่อสร้าง (อนาคต)' },
};
