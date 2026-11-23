// Request bodies with a hard size limit enforced while reading (audit F07): stop as soon as the limit is passed,
// instead of reading everything first and checking afterwards.
import { HttpError } from './auth.mjs';

export async function readBytes(request, max) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > max) throw new HttpError(413, 'Request too large.');
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader(), parts = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => {}); throw new HttpError(413, 'Request too large.'); }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.byteLength; }
  return out;
}
/** A JSON object body of at most `max` bytes (default 64 KiB). */
export async function readJson(request, max = 64 * 1024) {
  const bytes = await readBytes(request, max);
  let b;
  try { b = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Send JSON.'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'Send JSON.');
  return b;
}
