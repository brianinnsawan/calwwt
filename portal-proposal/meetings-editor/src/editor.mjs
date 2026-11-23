// Live meeting page editor (Meetings tab). Bundled to /meetings/vendor/editor.mjs; no outside requests.
// One Yjs document per meeting part (shared, SPP-only), kept in sync through a WebSocket to the site's own
// Durable Object (src/meeting-room.mjs). Everyone's changes merge; nobody needs to refresh.
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

const MSG_SYNC = 0, MSG_AWARENESS = 1;

/** A small WebSocket provider (the y-websocket message format), with reconnect. */
class Provider {
  constructor(url, doc, { onStatus = () => {}, readOnly = false } = {}) {
    Object.assign(this, { url, doc, onStatus, readOnly, ws: null, synced: false, closed: false, tries: 0 });
    this.awareness = new awarenessProtocol.Awareness(doc);
    this.onUpdate = (update, origin) => {
      if (origin === this || this.readOnly) return;
      const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_SYNC); syncProtocol.writeUpdate(e, update); this.send(encoding.toUint8Array(e));
    };
    this.onAwareness = ({ added, updated, removed }) => {
      const changed = added.concat(updated, removed);
      const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_AWARENESS);
      encoding.writeVarUint8Array(e, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed)); this.send(encoding.toUint8Array(e));
    };
    doc.on('update', this.onUpdate);
    this.awareness.on('update', this.onAwareness);
    this.unload = () => awarenessProtocol.removeAwarenessStates(this.awareness, [doc.clientID], 'window unload');
    window.addEventListener('pagehide', this.unload);
    this.connect();
  }
  send(bytes) { if (this.ws?.readyState === 1) this.ws.send(bytes); }
  connect() {
    if (this.closed) return;
    this.onStatus('connecting');
    const ws = this.ws = new WebSocket(this.url); ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      this.tries = 0;
      const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_SYNC); syncProtocol.writeSyncStep1(e, this.doc); this.send(encoding.toUint8Array(e));
      if (this.awareness.getLocalState() !== null) {
        const a = encoding.createEncoder(); encoding.writeVarUint(a, MSG_AWARENESS);
        encoding.writeVarUint8Array(a, awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])); this.send(encoding.toUint8Array(a));
      }
    };
    ws.onmessage = (ev) => {
      const d = decoding.createDecoder(new Uint8Array(ev.data)), type = decoding.readVarUint(d);
      if (type === MSG_SYNC) {
        const e = encoding.createEncoder(); encoding.writeVarUint(e, MSG_SYNC);
        const kind = syncProtocol.readSyncMessage(d, e, this.doc, this);
        if (encoding.length(e) > 1 && !(this.readOnly && kind === syncProtocol.messageYjsSyncStep1)) this.send(encoding.toUint8Array(e));
        if (kind === syncProtocol.messageYjsSyncStep2 && !this.synced) { this.synced = true; this.onStatus('connected'); }
      } else if (type === MSG_AWARENESS) awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(d), this);
    };
    ws.onclose = (ev) => {
      this.synced = false;
      awarenessProtocol.removeAwarenessStates(this.awareness, [...this.awareness.getStates().keys()].filter((c) => c !== this.doc.clientID), this);
      if (this.closed) return;
      if (ev.code === 4401 || ev.code === 4403) { this.onStatus('denied'); return; }
      if (ev.code === 4413) { this.onStatus('full'); return; } // the page reached its size limit
      if (ev.code === 4414) { this.onStatus('toobig'); return; } // one change (e.g. a huge paste) was too large
      this.onStatus('offline');
      const wait = Math.min(15000, 500 * 2 ** this.tries++);
      setTimeout(() => this.connect(), wait);
    };
  }
  destroy() {
    this.closed = true; this.unload(); window.removeEventListener('pagehide', this.unload);
    this.doc.off('update', this.onUpdate); this.awareness.off('update', this.onAwareness); this.ws?.close();
  }
}

// Task lines remember the Task made from them (shown as a small "CP-012" tag after the line).
const MeetingTaskItem = TaskItem.extend({
  addAttributes() {
    return { ...this.parent?.(), taskId: { default: null, parseHTML: (el) => el.getAttribute('data-task-id'), renderHTML: (a) => (a.taskId ? { 'data-task-id': a.taskId } : {}) } };
  },
});
// Tab / Shift+Tab indent and outdent list lines (Loop-style), instead of leaving the page.
const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    const go = (dir) => () => {
      const e = this.editor;
      for (const item of ['taskItem', 'listItem']) if (e.isActive(item)) return dir > 0 ? e.commands.sinkListItem(item) : e.commands.liftListItem(item);
      return dir > 0 ? e.commands.insertContent('\t') : true;
    };
    return { Tab: go(1), 'Shift-Tab': go(-1) };
  },
});

/**
 * Start a live editor. Returns { editor, provider, doc, destroy }.
 * opts: element, url (wss://…/api/meetings/<id>/live?part=…), user { name, color }, editable, placeholder, onStatus, onChange
 */
export function createMeetingEditor({ element, url, user, editable = true, placeholder = '', onStatus, onChange }) {
  const doc = new Y.Doc();
  const provider = new Provider(url, doc, { onStatus, readOnly: !editable });
  const editor = new Editor({
    element, editable,
    extensions: [
      StarterKit.configure({ undoRedo: false, link: { openOnClick: true, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } }),
      TaskList, MeetingTaskItem.configure({ nested: true }), Highlight, TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder }), TabIndent,
      Collaboration.configure({ document: doc }),
      CollaborationCaret.configure({ provider, user }),
    ],
    onUpdate: () => onChange?.(),
    onSelectionUpdate: () => onChange?.(),
  });
  return { editor, provider, doc, destroy() { editor.destroy(); provider.destroy(); doc.destroy(); } };
}
export { Y };
