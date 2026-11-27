// One-way sign-in from calwwt.sppwork.com to calcr.sppwork.com (Brian, 27 Nov 2026).
// Caltex Chiang Rai KP3 (site 8888 until Caltex gives the code) keeps its 3D model on calcr.sppwork.com, which still has its own
// shared password for the people who use it today. Someone signed in here who may open Sites gets into calcr without that
// password: the KP3 site page's 3D model tab loads /api/sites/8888/calcr-link, which sends the browser to
// calcr.sppwork.com/sso with a short-lived signed ticket. calcr asks this site whether the ticket is good (POST
// /api/calcr-link/verify, through its service binding "CALWWT") and then lets the browser in. calcr never links back here,
// so its password does not open calwwt.
// The ticket: "<expiry ms>.<site>.<random>.<signature>", signed with a key made from the AUTH_RATE_KEY secret (no new secret
// to set). It lasts 2 minutes and names nobody, so nothing personal goes to calcr.

export const CALCR_SITES = { '8888': 'https://calcr.sppwork.com' };
const LIFE_MS = 120000;
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function key(env) {
  if (!env.AUTH_RATE_KEY) return null;
  return crypto.subtle.importKey('raw', enc.encode('calcr-link-v1|' + env.AUTH_RATE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sign(env, body) { const k = await key(env); return k ? b64u(await crypto.subtle.sign('HMAC', k, enc.encode(body))) : null; }
function same(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

export async function mintTicket(env, site, now = Date.now()) {
  const nonce = b64u(crypto.getRandomValues(new Uint8Array(12)));
  const body = `${now + LIFE_MS}.${site}.${nonce}`, sig = await sign(env, body);
  return sig ? `${body}.${sig}` : null;
}

export async function checkTicket(env, t, now = Date.now()) {
  if (typeof t !== 'string' || t.length > 200) return null;
  const m = t.match(/^(\d{13})\.(\d{4})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43})$/);
  if (!m || !CALCR_SITES[m[2]]) return null;
  const exp = Number(m[1]);
  if (exp < now || exp > now + LIFE_MS + 5000) return null;
  const sig = await sign(env, `${m[1]}.${m[2]}.${m[3]}`);
  return sig && same(sig, m[4]) ? { site: m[2] } : null;
}

/** GET /api/sites/<code>/calcr-link (signed-in, may open Sites): off to calcr with a ticket. */
export async function calcrLinkResponse(env, site, access, url) {
  const t = await mintTicket(env, site);
  if (!t) return new Response('Not available.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'th';
  const to = new URL('/sso', CALCR_SITES[site]);
  to.searchParams.set('t', t); to.searchParams.set('embed', '1'); to.searchParams.set('lang', lang);
  return new Response(null, { status: 302, headers: { Location: to.href, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

/** POST /api/calcr-link/verify {t}: asked by calcr's Worker. Answers before sign-in (calcr has no calwwt session). */
export async function routeCalcrVerify(request, env) {
  if (new URL(request.url).pathname !== '/api/calcr-link/verify') return null;
  const json = (b, status = 200) => Response.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json({ ok: false }, 405);
  let body = null; try { const text = await request.text(); if (text.length <= 1000) body = JSON.parse(text); } catch { /* bad body */ }
  const ok = await checkTicket(env, body?.t);
  return ok ? json({ ok: true, site: ok.site }) : json({ ok: false }, 403);
}
