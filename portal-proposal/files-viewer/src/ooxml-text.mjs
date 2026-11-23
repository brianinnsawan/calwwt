// Shared by the PowerPoint and Word text editors: puts a paragraph's new text back into its existing runs so that the
// formatting of everything that was not changed stays (a bold label stays bold, a red word stays red).
// segs: the paragraph's pieces in order: { text, fixed (a line break or tab: kept or removed, never rewritten), set(text), remove() }.
// Only the part that differs is touched: the text before and after the change keeps its own runs; what was typed goes into
// the run it was typed in (or after). Returns false if nothing changed, or { create: text } when there is no run to hold
// the new text (an empty paragraph, or typing after a final line break): the caller then makes a new run at the end.
// same(text): how the text is compared with what is on screen (e.g. a non-breaking space counts as a space). It must keep
// the length, so that the places found in the compared text are the same places in the file's own text.
export function spread(segs, next, same = (x) => x) {
  const old = segs.map((s) => same(s.text)).join('');
  if (old === next) return false;
  const max = Math.min(old.length, next.length), low = (ch) => ch >= '\uDC00' && ch <= '\uDFFF';
  let pre = 0, suf = 0;
  while (pre < max && old[pre] === next[pre]) pre++;
  if (pre > 0 && pre < old.length && low(old[pre])) pre--; // never cut an emoji or rare character in half
  while (suf < max - pre && old[old.length - 1 - suf] === next[next.length - 1 - suf]) suf++;
  if (suf > 0 && low(old[old.length - suf])) suf--;
  const ins = next.slice(pre, next.length - suf), end = old.length - suf; // old[pre, end) becomes ins
  const spans = []; let pos = 0;
  for (const s of segs) { spans.push([pos, pos + s.text.length]); pos += s.text.length; }
  let owner = segs.findIndex((s, i) => !s.fixed && spans[i][0] < pre && pre <= spans[i][1]);
  if (owner < 0) owner = segs.findIndex((s, i) => !s.fixed && spans[i][0] === pre && (pre < old.length || spans[i][0] === spans[i][1]));
  let create = null;
  if (owner < 0 && ins) { if (pre >= old.length || !segs.some((s) => !s.fixed)) create = ins; else owner = segs.findIndex((s) => !s.fixed); }
  segs.forEach((s, i) => {
    const [a, b] = spans[i], len = b - a, cut = (n) => Math.min(Math.max(n, 0), len);
    if (s.fixed) { if (a >= pre && b <= end) s.remove(); return; }
    const text = s.text.slice(0, cut(pre - a)) + (i === owner ? ins : '') + s.text.slice(cut(end - a));
    if (text === s.text) return;
    if (text === '') s.remove(); else s.set(text);
  });
  return create === null ? true : { create };
}
