// A small streaming ZIP writer (no compression), used for the Admin "Download backup" zip.
// Files are written one after another, so large backups never have to fit in memory. Each entry's checksum
// and size go in a data descriptor after its bytes (general-purpose flag bit 3); names are UTF-8 (bit 11).
// Limits: below 4 GB in total and 65,535 entries (no ZIP64), which is far above this project's size.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes, crc = 0) {
  let c = ~crc >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function dosTime(d0) {
  const d = new Date(d0.getTime() + 7 * 3600 * 1000); // Bangkok time, as people see it on their computers
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const date = ((Math.max(1980, d.getUTCFullYear()) - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
}
function header(size) { const b = new Uint8Array(size); return [b, new DataView(b.buffer)]; }

/**
 * entries: an async iterable of { name, date?, data } where data is a Uint8Array, a string, or a function that
 * returns a Promise of a ReadableStream / Uint8Array (opened only when that entry is written).
 * Returns a ReadableStream of the zip file.
 */
export function zipStream(entries) {
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const out = writable.getWriter();
  (async () => {
    const central = []; let offset = 0;
    const put = async (bytes) => { await out.write(bytes); offset += bytes.length; };
    try {
      for await (const e of entries) {
        const name = enc.encode(e.name), { time, date } = dosTime(e.date || new Date()), start = offset;
        const [lh, lv] = header(30);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0808, true); lv.setUint16(8, 0, true);
        lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint16(26, name.length, true);
        await put(lh); await put(name);
        let crc = 0, size = 0;
        const chunk = async (bytes) => { if (!bytes.length) return; crc = crc32(bytes, crc); size += bytes.length; await put(bytes); };
        let data = typeof e.data === 'function' ? await e.data() : e.data;
        if (typeof data === 'string') data = enc.encode(data);
        if (data instanceof Uint8Array) await chunk(data);
        else if (data) { const r = data.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; await chunk(value instanceof Uint8Array ? value : new Uint8Array(value)); } }
        const [dd, dv] = header(16);
        dv.setUint32(0, 0x08074b50, true); dv.setUint32(4, crc, true); dv.setUint32(8, size, true); dv.setUint32(12, size, true);
        await put(dd);
        central.push({ name, time, date, crc, size, start });
      }
      const cdStart = offset;
      for (const c of central) {
        const [ch, cv] = header(46);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0808, true);
        cv.setUint16(12, c.time, true); cv.setUint16(14, c.date, true); cv.setUint32(16, c.crc, true);
        cv.setUint32(20, c.size, true); cv.setUint32(24, c.size, true); cv.setUint16(28, c.name.length, true); cv.setUint32(42, c.start, true);
        await put(ch); await put(c.name);
      }
      const [eh, ev] = header(22);
      ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true);
      ev.setUint32(12, offset - cdStart, true); ev.setUint32(16, cdStart, true);
      await put(eh);
      await out.close();
    } catch (err) { await out.abort(err).catch(() => {}); }
  })();
  return readable;
}
