// SPDX-License-Identifier: GPL-3.0-only
// Identity headers and recovery cookies are accepted only after JWT verification.
export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const normalizeEmail = value => String(value || '').trim().toLowerCase();
export const allowedEmails = env => new Set(String(env.ALLOWED_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean));
export async function hash(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('base64');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
export async function verifyAccessJWT(token, env, fetcher = fetch, now = Date.now() / 1000) {
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '') || !env.ACCESS_AUD) {
    throw new HttpError(503, 'Private access setup is not complete.');
  }
  if (!token || token.length > 16384) throw new HttpError(401, 'Sign in with your approved email.');
  let stage = 'parse';
  try {
    const [header64, payload64, signature64, extra] = token.split('.');
    if (extra !== undefined || !signature64) throw new Error('parts');
    const header = JSON.parse(new TextDecoder().decode(decode(header64)));
    const claims = JSON.parse(new TextDecoder().decode(decode(payload64)));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit) throw new Error('algorithm');
    stage = 'signing_keys_fetch';
    // Workers accepts manual/follow; reject non-2xx below without following redirects.
    const response = await fetcher(`${env.ACCESS_ISSUER}/cdn-cgi/access/certs`, {redirect:'manual', signal: AbortSignal.timeout(5000)});
    stage = 'signing_keys_response';
    if (!response.ok) throw new Error('keys');
    const jwks = await response.json();
    stage = 'signing_key_select';
    const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig'));
    if (!jwk) throw new Error('key');
    stage = 'signing_key_import';
    const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['verify']);
    stage = 'signature';
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(signature64), new TextEncoder().encode(`${header64}.${payload64}`))) throw new Error('signature');
    stage = 'claims';
    if (claims.iss !== env.ACCESS_ISSUER || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD)) throw new Error('issuer/audience');
    if (!Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now + 30 || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30))) throw new Error('time');
    if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string' || claims.type !== 'app') throw new Error('identity');
    const email = normalizeEmail(claims.email);
    if (!allowedEmails(env).has(email)) throw new HttpError(403, 'This email is not approved for this application.');
    return {id: await hash(new TextEncoder().encode(`${claims.iss}\0${claims.sub}`)), email};
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // Fixed stage names only: never record JWTs, claims, email or error contents.
    console.warn(JSON.stringify({event:'access_verification_failed',stage}));
    throw new HttpError(401, 'Your sign-in could not be verified. Sign in again.');
  }
}
export async function authenticate(request, env) {
  if (new URL(request.url).origin !== env.APP_ORIGIN) throw new HttpError(403, 'This hostname is not enabled.');
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');
  if(assertion)return verifyAccessJWT(assertion, env);
  // Access on /owner-recovery/* establishes its existing host cookie. Outside
  // that edge-protected path, verify it cryptographically and admit ONLY the
  // reviewed immutable owner subject, never an email/header-only identity.
  if(env.OWNER_RECOVERY_COOKIE_ENABLED==='true'&&env.LOCAL_AUTH_OWNER_ID){
    const entries=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('CF_Authorization='));
    if(entries.length===1){
      const actor=await verifyAccessJWT(entries[0].slice('CF_Authorization='.length),env);
      if(actor.id!==env.LOCAL_AUTH_OWNER_ID)throw new HttpError(403,'Owner recovery only.');
      return actor;
    }
  }
  throw new HttpError(401,'Sign in with your project username or owner recovery.');
}
