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
  waterTank: [0x58b7e6, 0.5],    // clean-water storage tank and its pumps (light blue): not wastewater, shown because it is in the way of digging
  // structure and context
  slab: [0xb7b1a8, 0.9], pile: [0x8c857b],
  fuel: [0xf2a51a, 0.18], building: [0xc4ccd4, 0.22], roof: [0xdfe5ea, 0.3], column: [0x9aa5b1],
};

/** Layers, in the order they are listed in the viewer. A site uses the ones it needs. */
export const LAYERS = [
  { id: 'tanks', en: 'Treatment tanks and grease traps', th: 'ถังบำบัดและถังดักไขมัน' },
  { id: 'sewer', en: 'Wastewater pipes', th: 'ท่อน้ำเสีย' },
  { id: 'drains', en: 'Site drains, manholes and oil traps', th: 'ท่อระบายน้ำ บ่อพัก และบ่อดักน้ำมัน' },
  { id: 'air', en: 'Air pumps and air lines', th: 'ปั๊มลมและท่อลม' },
  { id: 'base', en: 'Tank base slabs and piles', th: 'ฐานถังและเสาเข็ม' },
  { id: 'water', en: 'Clean-water tank and pumps', th: 'ถังเก็บน้ำดีและปั๊มน้ำ' },
  { id: 'old', en: 'Tanks and pipes out of use', th: 'ถังและท่อที่เลิกใช้' },
  { id: 'fuel', en: 'Fuel tank area', th: 'บริเวณถังน้ำมันใต้ดิน' },
  { id: 'buildings', en: 'Buildings and canopy', th: 'อาคารและหลังคาคลุมหัวจ่าย' },
  { id: 'plan', en: 'Drawing on the ground', th: 'แบบบนพื้น' },
  { id: 'ground', en: 'Ground surface', th: 'ผิวพื้น' },
];

/** Standard views. Every site has site, plan and under, in this order: site, plan, close-ups..., under. */
export const VIEWS = {
  site: { en: 'Whole site', th: 'ทั้งสถานี' },
  plan: { en: 'Plan', th: 'ผัง' },
  under: { en: 'From below ground', th: 'มองจากใต้ดิน' },
};

/** The last line of every object's notes: where its numbers come from. */
export const SRC = {
  drawn: { en: 'Position and levels are from the drawings.', th: 'ตำแหน่งและระดับมาจากแบบ' },
  part: { en: 'Position is from the drawings. Size or depth is assumed or from a standard detail.', th: 'ตำแหน่งมาจากแบบ ขนาดหรือความลึกเป็นค่าสมมติหรือมาจากแบบมาตรฐาน' },
  context: { en: 'Outline is from the drawings. Height is assumed, for context only.', th: 'แนวมาจากแบบ ความสูงเป็นค่าสมมติ ใช้ดูประกอบเท่านั้น' },
};
/** notes(en lines, th lines, 'drawn' | 'part' | 'context') -> the info object for add(). */
export const notes = (en, th, kind) => ({ en: [...en, SRC[kind].en], th: [...th, SRC[kind].th] });

// Naming, so the same thing reads the same on every site:
//   manholes and sumps:  "Manhole <id>" / "บ่อพัก <id>", with lvl = the level as written, e.g. "-0.84" (no "IN", no "inv")
//   treatment tanks:     tag = the tank's model or name on the drawing ("DLFN-15Q", "Tank 1", "WTT-1")
//   grease traps:        tag "Grease traps" on the first of a row; oil traps: tag "Oil trap (west outfall)"
//   treated-water pipes: tag "Treated water out"
//   buildings:           tag = the name on the drawing ("KFC", "Toilets", "Shops 1", "Canopy")
//   notes:               first what it is and its size, then levels, then anything to check on site, then the source line
