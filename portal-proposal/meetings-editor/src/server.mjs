// Worker side of the live meeting pages: the Yjs pieces the meeting room (../src/meeting-room.mjs) needs.
// Bundled to ../src/vendor/yjs-server.mjs (committed, like the other vendor bundles) so deploys need no npm install.
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
export { Y, encoding, decoding, syncProtocol };

const BLOCK = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'blockquote', 'codeBlock', 'tableRow', 'horizontalRule']);
/** Readable plain text of a meeting page (for previews, search and backups). */
export function pageText(doc) {
  const out = [];
  const walk = (node, depth, prefix) => {
    if (node instanceof Y.XmlText) { out.push(node.toString().replace(/<[^>]+>/g, '')); return; }
    const name = node.nodeName;
    let pre = '';
    if (name === 'listItem') pre = `${'  '.repeat(depth)}${prefix === 'ordered' ? '1. ' : '• '}`;
    if (name === 'taskItem') pre = `${'  '.repeat(depth)}${node.getAttribute('checked') ? '☑ ' : '☐ '}`;
    if (name === 'heading') pre = '# ';
    if (BLOCK.has(name) && out.length && !out[out.length - 1].endsWith('\n')) out.push('\n');
    out.push(pre);
    const childDepth = name === 'bulletList' || name === 'orderedList' || name === 'taskList' ? depth + (node.parent?.nodeName?.endsWith('Item') ? 1 : 0) : depth;
    const kind = name === 'orderedList' ? 'ordered' : name === 'bulletList' ? 'bullet' : prefix;
    for (const child of node.toArray()) walk(child, childDepth, kind);
    if (name === 'tableCell' || name === 'tableHeader') out.push(' | ');
  };
  for (const child of doc.getXmlFragment('default').toArray()) walk(child, 0, 'bullet');
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
