// 2-step sign-in for admins (audit N04; Brian, 2 Nov 2026): 6-digit codes from an authenticator app
// (RFC 6238: HMAC-SHA1, 30-second steps, 6 digits), plus one-time recovery codes.
// The app secret is stored encrypted (AES-256-GCM, key derived from the AUTH_RATE_KEY secret), so a copy of the
// database or of a backup alone does not reveal it. Changing AUTH_RATE_KEY turns everyone's 2-step off in effect:
// they then need an admin to reset it, or a recovery code.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes) {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
export function fromBase32(text) {
  let bits = 0, value = 0; const out = [];
  for (const ch of String(text).toUpperCase().replace(/[\s=-]/g, '')) {
    const i = ALPHABET.indexOf(ch); if (i < 0) throw new Error('bad base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export function codeAt(secret, step) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', secret).update(msg).digest(), o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
/** The time step the code belongs to (now, or one step either side for clock drift), only if newer than lastStep. */
export function verifyCode(secret, code, nowSeconds, lastStep = 0) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const now = Math.floor(nowSeconds / 30);
  for (const step of [now, now - 1, now + 1]) {
    if (step > lastStep && timingSafeEqual(Buffer.from(codeAt(secret, step)), Buffer.from(String(code)))) return step;
  }
  return null;
}
export const newSecret = () => randomBytes(20);
export const otpauthUri = (secret, account, issuer = 'Caltex WWT 2027') =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${base32(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

const keyFor = (env) => createHash('sha256').update('calnkt two-step v1\0' + String(env.AUTH_RATE_KEY || '')).digest();
export function sealSecret(env, secret) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', keyFor(env), iv);
  const body = Buffer.concat([c.update(secret), c.final(), c.getAuthTag()]);
  return `v1:${iv.toString('base64url')}:${body.toString('base64url')}`;
}
export function openSecret(env, sealed) {
  const [v, iv, body] = String(sealed).split(':');
  if (v !== 'v1') throw new Error('unknown secret format');
  const raw = Buffer.from(body, 'base64url'), d = createDecipheriv('aes-256-gcm', keyFor(env), Buffer.from(iv, 'base64url'));
  d.setAuthTag(raw.subarray(raw.length - 16));
  return Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]);
}

// Recovery codes: 8 per person, each works once, shown only when 2-step is switched on. Only their hashes are kept.
const normal = (code) => String(code).toLowerCase().replace(/[^a-z2-7]/g, '');
export const recoveryDigest = (code) => createHash('sha256').update('calnkt recovery\0' + normal(code)).digest('hex');
export function newRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => base32(randomBytes(8)).toLowerCase().slice(0, 12).replace(/(.{4})(?=.)/g, '$1-'));
}
export const looksLikeRecovery = (code) => normal(code).length === 12;
