// One canonical form for every request path (audit F01, 2 Nov 2026).
// The asset store decodes %-escapes (including %2F) before looking a file up, so page-access checks must look at the
// same decoded path. Each segment is decoded and re-encoded the one standard way; anything that cannot be a plain path
// (encoded "/" or "\", NUL, "." or ".." segments, empty segments such as "//") is refused.
const KEEP = { '%40': '@', '%3A': ':', '%2C': ',', '%2B': '+', '%3D': '=', '%26': '&', '%24': '$', '%3B': ';' };
const encodeSegment = (s) => encodeURIComponent(s).replace(/%(40|3A|2C|2B|3D|26|24|3B)/gi, (m) => KEEP[m.toUpperCase()]);
/** Returns the canonical pathname, or null when the path must be refused. */
export function canonicalPath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  const parts = pathname.split('/');
  const out = [''];
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    if (seg === '') { if (i === parts.length - 1) { out.push(''); continue; } return null; }
    let decoded;
    try { decoded = decodeURIComponent(seg); } catch { return null; }
    if (/[/\\\0]/.test(decoded) || decoded === '.' || decoded === '..') return null;
    out.push(encodeSegment(decoded));
  }
  return out.join('/') || '/';
}
