// Builds the CAD workspace (Drawings -> CAD workspace, /cad-workspace/) from parts already in this repository:
//   1. public/cad-workspace/engine/cad-engine.js: the open-source CAD engine (mlightcad cad-viewer + LibreDWG reader)
//      from the Files CAD viewer bundle (public/files/cad/assets/index-*.js, see import-files-cad.mjs). Only that
//      bundle's small page script at the end is cut off and replaced by an export line, so the workspace page
//      (public/cad-workspace/workspace.mjs, readable source) can drive the same engine. The LibreDWG worker, its
//      WebAssembly file and the CAD fonts are not copied: the worker serves /cad-workspace/workers/* and
//      /cad-workspace/cad-data/* from /files/cad/ (src/cad-workspace.mjs).
//   2. (calnkt only) the project's catalog of DWG sheets. calwwt has none: its drawings are the DWG / DXF files in Files.
// Usage: node portal-proposal/scripts/build-cad-workspace.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const here = path.dirname(new URL(import.meta.url).pathname);
const portal = path.resolve(here, '..');
const once = (text, needle) => { assert.equal(text.split(needle).length - 1, 1, `Expected exactly one ${needle.slice(0, 80)}`); return text.indexOf(needle); };

// 1. Engine
const assets = path.join(portal, 'public/files/cad/assets');
const [bundle] = fs.readdirSync(assets).filter((f) => f.endsWith('.js'));
const js = fs.readFileSync(path.join(assets, bundle), 'utf8');
// The page script starts with the Thai keyboard table (it was written for the CAD sheet page, not part of the library).
const tail = once(js, 'const XIe=`1234567890-=qwertyuiop');
const library = js.slice(0, tail);
// Names the workspace needs (sysVars: drawing settings such as ORTHOMODE and MODELBKCOLOR; appSettings: the object snap
// modes, osnapModes, a bit mask in AutoCAD's OSMODE order), checked so a different bundle cannot be built by mistake.
for (const needle of ['const HIe=Object.freeze(Object.defineProperty({__proto__:null,ACAP_DEFAULT_DOCS_BASE_URL', '$Ie=(function(r){GIe(e,r);function e(t)', 'function Or(){return W5.instance}', 'var YM=(function(){function r(){this.events={registered', '(no||(no={}))', 'var Je=(r=>(r[r.Read=0]="Read"', 'var wt=(function(){function r(){this.registry=new Map,this.cache=new Map,this.events={sysVarChanged:new Pt}', 'G7._storageKey=V7;let $n=G7;']) once(library, needle);
// Line markup that keeps going (Brian, 3 Nov 2026), as AutoCAD's LINE / PLINE: each click adds a segment from the last
// point until Enter or Esc; U takes the last segment back, C closes to the first point (after two segments). Each segment
// is stored as an ordinary line markup, so saving, loading, erasing and undo work as before. The last point is passed as the
// base point, so Ortho (F8), Polar (F10) and the dynamic length / angle work from it, as in AutoCAD.
const LINE_ONE_SEGMENT = 'class LX extends rl{async execute(e){await this.withMarkupInput(e,async()=>{const t=Yn(),n=new Se(E.t("jig.markup.line.firstPoint")),i=await e.view.editor.getPoint(n);if(i.status!==H.OK)return;const o=i.value,a=new Se(E.t("jig.markup.line.secondPoint"));a.useBasePoint=!0,a.jig=new $Te(e.view,o,t,"Line");const s=await e.view.editor.getPoint(a);if(s.status!==H.OK)return;const l=s.value,c={...es("line",e.view,e),type:"line",style:{color:wh(t),lineWeight:Zr},geometry:{type:"line",start:{x:o.x,y:o.y},end:{x:l.x,y:l.y}}};ts(e.view,c)})}}';
const LINE_CONTINUOUS = 'class LX extends rl{async execute(e){await this.withMarkupInput(e,async()=>{const t=Yn(),n=new Se(E.t("jig.markup.line.firstPoint")),i=await e.view.editor.getPoint(n);if(i.status!==H.OK)return;'
  + 'const calnktFirst=i.value,calnktPts=[calnktFirst],calnktMade=[];'
  + 'const calnktAdd=(o,l)=>{const c={...es("line",e.view,e),type:"line",style:{color:wh(t),lineWeight:Zr},geometry:{type:"line",start:{x:o.x,y:o.y},end:{x:l.x,y:l.y}}};ts(e.view,c),calnktMade.push(c.id)};'
  + 'for(;;){const o=calnktPts[calnktPts.length-1],k=calnktMade.length,a=new Se(k===0?E.t("jig.markup.line.secondPoint"):"Specify next point or");'
  + 'a.useBasePoint=!0,a.basePoint=o,a.allowNone=!0;if(k>0)a.keywords.add("Undo(U)","Undo","Undo");if(k>1)a.keywords.add("Close(C)","Close","Close");'
  + 'a.jig=new $Te(e.view,o,t,"Line");const s=await e.view.editor.getPoint(a);'
  + 'if(s.status===H.Keyword){const w=s.stringResult??"";if(w==="Undo"&&k>0){nl().unpublish(e.view,calnktMade.pop()),calnktPts.pop();continue}if(w==="Close"&&k>1){calnktAdd(o,calnktFirst);return}continue}'
  + 'if(s.status!==H.OK)return;calnktAdd(o,s.value),calnktPts.push(s.value)}})}}';
once(library, LINE_ONE_SEGMENT);
for (const needle of ['function nl(){', 'function ts(r,e){', 'var H=(r=>(r[r.Cancel=-5002]="Cancel"']) once(library, needle);
const patched = library.replace(LINE_ONE_SEGMENT, () => LINE_CONTINUOUS);
const engine = '/* CAD engine for calwwt.sppwork.com/cad-workspace/: mlightcad cad-viewer (MIT) and the LibreDWG reader (GPL-3.0),\n'
  + `   taken from /files/cad/assets/${bundle} by portal-proposal/scripts/build-cad-workspace.mjs. Do not edit by hand.\n`
  + '   One change: the line markup continues click after click (see LINE_CONTINUOUS in the build script). */\n'
  + patched +'\nexport{HIe as cad,$Ie as DwgConverter,YM as Converters,no as FileType,Je as OpenMode,Or as hostServices,wt as sysVars,$n as appSettings};\n';
const outDir = path.join(portal, 'public/cad-workspace/engine');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'cad-engine.js'), engine);

// 2. No catalog on calwwt: the drawings are the DWG / DXF files in Files (src/cad-catalog.mjs is an empty list).
console.log(`CAD workspace engine (${(engine.length / 1e6).toFixed(1)} MB) written.`);
