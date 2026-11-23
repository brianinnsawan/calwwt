// Live meeting pages (Meetings tab, Brian 2 Nov 2026: "like Microsoft Loop"). One Durable Object per meeting part
// ("<meetingId>:shared" and "<meetingId>:spp"). It holds the page as a Yjs document, merges everyone's typing, sends it
// to everyone else on the page, saves every change in its own storage, and every few seconds copies the page to TASKS_DB
// (meeting_docs; a version in meeting_doc_versions every 10 minutes of editing) for previews, search and backups.
// Who may open which part, and who may type, is decided by the Worker before the connection reaches here
// (src/meetings.mjs, liveRoom). People who may only look can never change the page: their edits are dropped here.
import { Y, encoding, decoding, syncProtocol, pageText } from './vendor/yjs-server.mjs';

const MSG_SYNC = 0, MSG_AWARENESS = 1;
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const dayLabel = (iso, th) => { const [y, m, d] = iso.split('-').map(Number); return th ? `${d} ${MONTHS_TH[m - 1]} ${y + 543}` : `${d} ${MONTHS_EN[m - 1]} ${y}`; };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
/**
 * Carry open actions forward (Brian, 3 Nov 2026): from last week's page (its saved Yjs state), the checkbox lines that are
 * not ticked, as they were (with their task / request tags), under a heading naming that meeting. Returns a Yjs update
 * for an empty page, or null when nothing is open.
 */
/** Lines to add at the end of a page (Chief, 5 Nov 2026): headings, paragraphs, bullets and ☐ action lines. Bullets and
 *  action lines that follow each other go in one list. Plain text only. */
export function blocksToElements(blocks) {
  const out = [];
  let list = null, listType = null;
  const para = (text) => { const p = new Y.XmlElement('paragraph'); if (text) p.insert(0, [new Y.XmlText(text)]); return p; };
  for (const b of blocks) {
    if (b.type === 'bullet' || b.type === 'todo') {
      const kind = b.type === 'bullet' ? 'bulletList' : 'taskList';
      if (listType !== kind) { list = new Y.XmlElement(kind); out.push(list); listType = kind; }
      const item = new Y.XmlElement(b.type === 'bullet' ? 'listItem' : 'taskItem');
      if (b.type === 'todo') item.setAttribute('checked', false);
      item.insert(0, [para(b.text)]);
      list.insert(list.length, [item]);
      continue;
    }
    list = null; listType = null;
    if (b.type === 'heading') { const h = new Y.XmlElement('heading'); h.setAttribute('level', 3); h.insert(0, [new Y.XmlText(b.text)]); out.push(h); }
    else out.push(para(b.text));
  }
  return out;
}
export function carryForward(stateB64, prevDate) {
  const prev = new Y.Doc();
  try { Y.applyUpdate(prev, unb64(stateB64)); } catch { return null; }
  const textOf = (n) => (n instanceof Y.XmlText ? n.toString().replace(/<[^>]+>/g, '') : n.toArray().map(textOf).join(''));
  const open = [];
  const walk = (node) => {
    for (const child of node.toArray()) {
      if (!(child instanceof Y.XmlElement)) continue;
      if (child.nodeName === 'taskItem') {
        const ticked = child.getAttribute('checked') === true || child.getAttribute('checked') === 'true';
        if (!ticked) { if (textOf(child).trim()) open.push(child.clone()); continue; }
      }
      walk(child); // a ticked line can still hold open lines under it
    }
  };
  walk(prev.getXmlFragment('default'));
  if (!open.length) return null;
  const doc = new Y.Doc(), frag = doc.getXmlFragment('default');
  const heading = new Y.XmlElement('heading'); heading.setAttribute('level', 3);
  heading.insert(0, [new Y.XmlText(`งานค้างจากการประชุมวันที่ ${dayLabel(prevDate, true)} · Open actions carried from the meeting on ${dayLabel(prevDate, false)}`)]);
  const list = new Y.XmlElement('taskList'); list.insert(0, open);
  frag.insert(0, [heading, list, new Y.XmlElement('paragraph')]);
  return Y.encodeStateAsUpdate(doc);
}
const CHUNK = 900 * 1024;          // Durable Object storage values stay below 2 MB
const COMPACT_AFTER = 300;         // stored updates before they are merged into one
const FLUSH_MS = 5000, VERSION_MS = 10 * 60 * 1000, RECONNECT_MS = 60 * 60 * 1000;
// Size limits (audit, 2 Nov 2026): one message, one cursor/presence message, and the whole page as stored here.
const MAX_MESSAGE = 2 * 1024 * 1024, MAX_AWARENESS = 16 * 1024, MAX_PAGE_BYTES = 8 * 1024 * 1024;
const MASKED_NAME = 'SPP project staff';
// The copy in TASKS_DB must stay below D1's 2 MB row limit: state (base64) and text are each capped.
const MAX_DB_STATE = 1024 * 1024, MAX_DB_TEXT = 300 * 1024;
/** Cut text to at most max bytes of UTF-8 (whole characters). */
const capBytes = (text, max) => { const enc = new TextEncoder().encode(text); return enc.length <= max ? text : new TextDecoder().decode(enc.subarray(0, max)).replace(/\uFFFD$/, '') + '…'; };
const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

// Awareness messages (who is here, where their cursor is) are passed on as they are; the client ids in them are
// remembered per connection so a closed tab's cursor disappears at once.
function awarenessClients(bytes) {
  const d = decoding.createDecoder(bytes), out = [];
  for (let n = decoding.readVarUint(d); n > 0; n--) { const id = decoding.readVarUint(d), clock = decoding.readVarUint(d); decoding.readVarString(d); out.push([id, clock]); }
  return out;
}
// Round 2: names in presence messages come from the server (who the connection belongs to), not from the browser, and a
// person hidden from a company shows as "SPP project staff" to that company (as everywhere else on the site).
// Site audit (10 Nov 2026): the cursor colour is passed on only when it is a plain colour (#RRGGBB) and nothing else of
// `user` is passed on at all. The other browsers put the colour into a style, so any other text there could restyle
// their page (cover it, for example); a look-only connection could send it too.
function awarenessWithName(bytes, name) {
  const d = decoding.createDecoder(bytes), out = encoding.createEncoder(), n = decoding.readVarUint(d);
  encoding.writeVarUint(out, n);
  for (let i = 0; i < n; i++) {
    const id = decoding.readVarUint(d), clock = decoding.readVarUint(d); let state = decoding.readVarString(d);
    try { const st = JSON.parse(state); if (st && typeof st === 'object') { const u = st.user && typeof st.user === 'object' ? st.user : {}; st.user = { name: String(name).slice(0, 60), color: /^#[0-9a-fA-F]{6}$/.test(u.color) ? u.color : '#5B6676' }; state = JSON.stringify(st); } } catch { state = 'null'; }
    encoding.writeVarUint(out, id); encoding.writeVarUint(out, clock); encoding.writeVarString(out, state);
  }
  return encoding.toUint8Array(out);
}
function awarenessRemoval(clients) {
  const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_AWARENESS);
  const inner = encoding.createEncoder(); encoding.writeVarUint(inner, clients.length);
  for (const [id, clock] of clients) { encoding.writeVarUint(inner, id); encoding.writeVarUint(inner, clock + 1); encoding.writeVarString(inner, 'null'); }
  encoding.writeVarUint8Array(e, encoding.toUint8Array(inner));
  return encoding.toUint8Array(e);
}

export class MeetingRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.doc = null;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS updates(id INTEGER PRIMARY KEY AUTOINCREMENT, grp INTEGER NOT NULL, data BLOB NOT NULL)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    });
  }
  meta(k, v) {
    if (v === undefined) return [...this.ctx.storage.sql.exec('SELECT v FROM meta WHERE k=?', k)][0]?.v ?? null;
    this.ctx.storage.sql.exec('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', k, String(v));
  }
  storedBytes() { return Number([...this.ctx.storage.sql.exec('SELECT COALESCE(SUM(length(data)), 0) AS n FROM updates')][0].n); }
  store(update) {
    const grp = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    for (let i = 0; i < update.length || i === 0; i += CHUNK) this.ctx.storage.sql.exec('INSERT INTO updates(grp, data) VALUES(?, ?)', grp, update.subarray(i, i + CHUNK));
  }
  loadDoc() {
    if (this.doc) return this.doc;
    const doc = new Y.Doc(), groups = new Map();
    for (const row of this.ctx.storage.sql.exec('SELECT grp, data FROM updates ORDER BY id')) {
      if (!groups.has(row.grp)) groups.set(row.grp, []);
      groups.get(row.grp).push(new Uint8Array(row.data));
    }
    for (const parts of groups.values()) {
      const len = parts.reduce((n, p) => n + p.length, 0), all = new Uint8Array(len); let o = 0;
      for (const p of parts) { all.set(p, o); o += p.length; }
      Y.applyUpdate(doc, all, 'storage');
    }
    doc.on('update', (update, origin) => {
      if (origin === 'storage') return;
      this.touched = true;
      this.store(update);
      const count = [...this.ctx.storage.sql.exec('SELECT COUNT(DISTINCT grp) AS n FROM updates')][0].n;
      if (count > COMPACT_AFTER) {
        const state = Y.encodeStateAsUpdate(doc);
        this.ctx.storage.transactionSync(() => { this.ctx.storage.sql.exec('DELETE FROM updates'); this.store(state); });
      }
      const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_SYNC); syncProtocol.writeUpdate(e, update);
      this.broadcast(encoding.toUint8Array(e), origin);
    });
    this.doc = doc;
    return doc;
  }
  // Audit (2 Nov 2026): a connection that only listens is also renewed hourly, so a sign-out or a lowered page level
  // stops what it receives (the browser reconnects through the Worker, which checks access again).
  broadcast(bytes, except) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      const att = ws.deserializeAttachment();
      if (!att || Date.now() - att.at > RECONNECT_MS) { try { ws.close(4000, 'reconnect'); } catch { /* closed */ } continue; }
      try { ws.send(bytes); } catch { /* closed */ }
    }
  }

  async fetch(request) {
    // Access changed somewhere on the site (Brian, 3 Nov 2026; src/meetings.mjs reconnectMeetingRooms): every connection
    // reconnects at once through the Worker, which checks access again, instead of at the hourly renewal. Only the
    // Worker can reach a room (Durable Object binding), so this needs no further check.
    if (request.headers.get('x-calnkt-reconnect') === '1') {
      let n = 0;
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(4000, 'access changed'); n += 1; } catch { /* closed */ } }
      return new Response(String(n));
    }
    // Lines added by the Worker for Chief (src/agent.mjs checks who may; only the Worker can reach a room).
    if (request.headers.get('x-calnkt-append') === '1') {
      const room = request.headers.get('x-calnkt-room');
      if (!/^[A-Za-z0-9-]{1,60}:(shared|spp)$/.test(room || '')) return new Response('Bad room.', { status: 400 });
      const { blocks, by } = await request.json();
      this.meta('room', room);
      await this.seedWeekly(room);
      const doc = this.loadDoc();
      if (this.storedBytes() > MAX_PAGE_BYTES - 256 * 1024) return new Response(JSON.stringify({ error: 'The page is full.' }), { status: 413 });
      const els = blocksToElements(blocks);
      doc.transact(() => { const f = doc.getXmlFragment('default'); f.insert(f.length, els); }, 'agent');
      await this.changed(String(by || 'agent'));
      return new Response(JSON.stringify({ ok: true, added: blocks.length }), { headers: { 'Content-Type': 'application/json' } });
    }
    if (request.headers.get('upgrade') !== 'websocket') return new Response('Expected a WebSocket.', { status: 426 });
    const room = request.headers.get('x-calnkt-room'), user = JSON.parse(request.headers.get('x-calnkt-user') || '{}');
    if (!/^[A-Za-z0-9-]{1,60}:(shared|spp)$/.test(room || '') || !user.id) return new Response('Bad room.', { status: 400 });
    this.meta('room', room);
    await this.seedWeekly(room);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const hide = {};
    for (const [label, ids] of Object.entries(user.hide && typeof user.hide === 'object' ? user.hide : {})) if (Array.isArray(ids)) hide[String(label).slice(0, 40)] = ids.map(String).slice(0, 200);
    server.serializeAttachment({ id: user.id, edit: !!user.edit, at: Date.now(), clients: [], name: String(user.name || '').slice(0, 60), hide });
    const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_SYNC); syncProtocol.writeSyncStep1(e, this.loadDoc());
    server.send(encoding.toUint8Array(e));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message === 'string') return;
    const att = ws.deserializeAttachment() || {};
    // Round 2: a change too large to take is refused out loud (the page tells the writer), never dropped silently.
    if (message.byteLength > MAX_MESSAGE) { if (att.edit) ws.close(4414, 'too large'); return; }
    // Every hour the browser reconnects through the Worker, so a changed page level or a sign-out takes effect.
    if (Date.now() - att.at > RECONNECT_MS) { ws.close(4000, 'reconnect'); return; }
    const bytes = new Uint8Array(message), d = decoding.createDecoder(bytes);
    let type;
    try { type = decoding.readVarUint(d); } catch { return; }
    if (type === MSG_SYNC) {
      // Audit (2 Nov 2026): the kind is read from the same position the Yjs reader uses, so a padded number cannot make a
      // change look like a harmless "send me the page" request. Look-only people only ever get the page sent to them.
      const doc = this.loadDoc(), reply = encoding.createEncoder(); encoding.writeVarUint(reply, MSG_SYNC);
      const at = d.pos; let kind;
      try { kind = decoding.readVarUint(d); } catch { return; }
      if (!att.edit) {
        if (kind !== syncProtocol.messageYjsSyncStep1) return; // look-only: changes are dropped
        try { syncProtocol.readSyncStep1(d, reply, doc); } catch { ws.close(1003, 'bad message'); return; }
        ws.send(encoding.toUint8Array(reply));
        return;
      }
      const pending = (doc.store.pendingStructs?.update?.length || 0) + (doc.store.pendingDs?.length || 0); // held-back changes count too
      if (pending > MAX_MESSAGE) { doc.store.pendingStructs = null; ws.close(4414, 'too large'); return; }
      if (kind !== syncProtocol.messageYjsSyncStep1 && this.storedBytes() + pending + bytes.length > MAX_PAGE_BYTES) {
        ws.close(4413, 'page full'); return; // the page is already very large: no more changes are taken
      }
      d.pos = at;
      this.touched = false;
      try { syncProtocol.readSyncMessage(d, reply, doc, ws); } catch { ws.close(1003, 'bad message'); return; }
      // Round 3: with one server, a browser's changes never depend on changes the server lacks. If some are held back
      // anyway, drop them and make that browser reconnect, which sends everything again in the right order.
      if (doc.store.pendingStructs || doc.store.pendingDs) { doc.store.pendingStructs = null; doc.store.pendingDs = null; ws.close(4000, 'resync'); }
      if (encoding.length(reply) > 1) ws.send(encoding.toUint8Array(reply));
      if (this.touched) await this.changed(att.id);
    } else if (type === MSG_AWARENESS) {
      if (bytes.length > MAX_AWARENESS) return;
      try {
        const inner = decoding.readVarUint8Array(d), seen = awarenessClients(inner);
        const known = new Map(att.clients); for (const [id, clock] of seen) known.set(id, clock);
        att.clients = [...known].slice(-8); ws.serializeAttachment(att);
        const frame = (name) => { const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_AWARENESS); encoding.writeVarUint8Array(e, awarenessWithName(inner, name)); return encoding.toUint8Array(e); };
        // Round 3: masked per receiving person (each connection carries the people it may not see, and their labels).
        const frames = new Map();
        const frameFor = (label) => { if (!frames.has(label)) frames.set(label, frame(label)); return frames.get(label); };
        for (const other of this.ctx.getWebSockets()) {
          if (other === ws) continue;
          const oa = other.deserializeAttachment();
          if (!oa || Date.now() - oa.at > RECONNECT_MS) { try { other.close(4000, 'reconnect'); } catch { /* closed */ } continue; }
          const hiddenAs = Object.entries(oa.hide || {}).find(([, ids]) => ids.includes(att.id))?.[0];
          try { other.send(frameFor(hiddenAs || att.name || MASKED_NAME)); } catch { /* closed */ }
        }
      } catch { /* ignore a bad awareness message */ }
    }
  }
  async webSocketClose(ws) { this.left(ws); }
  async webSocketError(ws) { this.left(ws); }
  left(ws) {
    const att = ws.deserializeAttachment();
    if (att?.clients?.length) this.broadcast(awarenessRemoval(att.clients), ws);
  }

  // A new weekly page starts with last week's open actions (once; only when the page is still empty).
  async seedWeekly(room) {
    const m = /^weekly-(\d{4}-\d{2}-\d{2}):(shared|spp)$/.exec(room);
    if (!m || this.meta('seeded') || !this.env?.TASKS_DB) return;
    this.meta('seeded', '1');
    if (Number([...this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM updates')][0].n) > 0) return;
    let row = null;
    try {
      row = await this.env.TASKS_DB.prepare(`SELECT m.date, d.state FROM meeting_docs d JOIN meetings m ON m.id = d.meeting_id
        WHERE m.series = 'spp-caltex-weekly' AND m.deleted = 0 AND m.date < ? AND d.part = ? AND d.state IS NOT NULL ORDER BY m.date DESC LIMIT 1`).bind(m[1], m[2]).first();
    } catch { return; }
    const update = row && carryForward(row.state, row.date);
    if (!update || Number([...this.ctx.storage.sql.exec('SELECT COUNT(*) AS n FROM updates')][0].n) > 0) return;
    Y.applyUpdate(this.loadDoc(), update, 'carry-forward');
    this.meta('dirty', '1');
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + FLUSH_MS);
  }

  // Someone typed: remember who, and copy the page to TASKS_DB a few seconds later (one write per burst of typing).
  async changed(personId) {
    const editors = new Set(JSON.parse(this.meta('editors') || '[]')); editors.add(personId);
    this.meta('editors', JSON.stringify([...editors]));
    this.meta('dirty', '1');
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + FLUSH_MS);
  }
  async alarm() {
    if (this.meta('dirty') !== '1' || !this.env.TASKS_DB) return;
    const [meetingId, part] = String(this.meta('room')).split(':');
    const doc = this.loadDoc(), state = Y.encodeStateAsUpdate(doc), text = capBytes(pageText(doc), MAX_DB_TEXT);
    const at = new Date().toISOString(), editors = JSON.parse(this.meta('editors') || '[]');
    const stateB64 = state.length * 4 / 3 < MAX_DB_STATE ? b64(state) : null; // a very large page stays in the room only
    const db = this.env.TASKS_DB, stmts = [
      db.prepare(`INSERT INTO meeting_docs(meeting_id, part, state, text, updated_at, editors_json) VALUES(?,?,?,?,?,?)
        ON CONFLICT(meeting_id, part) DO UPDATE SET state=excluded.state, text=excluded.text, updated_at=excluded.updated_at, editors_json=excluded.editors_json`)
        .bind(meetingId, part, stateB64, text, at, JSON.stringify(editors)),
    ];
    const lastVersion = Number(this.meta('versionAt') || 0);
    if (Date.now() - lastVersion > VERSION_MS) {
      stmts.push(db.prepare('INSERT INTO meeting_doc_versions(meeting_id, part, state, text, at, editors_json) VALUES(?,?,?,?,?,?)').bind(meetingId, part, stateB64, text, at, JSON.stringify(editors)));
      this.meta('versionAt', Date.now()); this.meta('editors', '[]');
    }
    try { await db.batch(stmts); this.meta('dirty', '0'); }
    catch (e) { console.error('meeting page save', meetingId, part, e?.message); await this.ctx.storage.setAlarm(Date.now() + 30000); }
  }
}
