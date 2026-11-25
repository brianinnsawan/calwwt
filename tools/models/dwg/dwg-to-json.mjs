// Turns a DWG into JSON (entities, blocks, layers) with LibreDWG:  npm i @mlightcad/libredwg-web && node dwg-to-json.mjs drawing.dwg drawing.json
// Used to read positions, levels and labels out of Brian's as-built drawings when a site model is made (see ../README.md).
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';
import fs from 'node:fs';
const [,, input, output] = process.argv;
const lib = await LibreDwg.create();
const buf = fs.readFileSync(input);
const dwg = lib.dwg_read_data(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Dwg_File_Type.DWG);
const db = lib.convert(dwg);
lib.dwg_free(dwg);
fs.writeFileSync(output, JSON.stringify(db, (k, v) => typeof v === 'bigint' ? v.toString() : v));
console.log(Object.keys(db), 'entities', db.entities?.length);
