// KP3 one-way sign-in to calcr.sppwork.com (src/calcr-link.mjs, Brian 27 Nov 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mintTicket, checkTicket, routeCalcrVerify, calcrLinkResponse, CALCR_SITES } from '../src/calcr-link.mjs';

const env = { AUTH_RATE_KEY: 'k'.repeat(40) };
const verify = (t, e = env) => routeCalcrVerify(new Request('https://calwwt.sppwork.com/api/calcr-link/verify', { method: 'POST', body: JSON.stringify({ t }) }), e);

test('calcr link: only KP3 has one', () => { assert.deepEqual(Object.keys(CALCR_SITES), ['8888']); });

test('calcr link: a fresh ticket is good; expired, changed, other-key or other-site tickets are not', async () => {
  const t = await mintTicket(env, '8888');
  assert.deepEqual(await checkTicket(env, t), { site: '8888' });
  assert.equal((await verify(t)).status, 200);
  assert.equal(await checkTicket(env, t, Date.now() + 121000), null, 'expired after 2 minutes');
  assert.equal(await checkTicket({ AUTH_RATE_KEY: 'x'.repeat(40) }, t), null, 'another key');
  const parts = t.split('.');
  assert.equal(await checkTicket(env, [parts[0], '1750', parts[2], parts[3]].join('.')), null, 'another site');
  assert.equal(await checkTicket(env, [String(Number(parts[0]) + 1), ...parts.slice(1)].join('.')), null, 'changed expiry');
  assert.equal((await verify('nonsense')).status, 403);
  assert.equal((await routeCalcrVerify(new Request('https://calwwt.sppwork.com/api/calcr-link/verify'), env)).status, 405);
  assert.equal(await routeCalcrVerify(new Request('https://calwwt.sppwork.com/api/other'), env), null);
  assert.equal(await mintTicket({}, '8888'), null, 'no key, no ticket');
});

test('calcr link: the site page link sends the browser to calcr /sso with a ticket and the language', async () => {
  const res = await calcrLinkResponse(env, '8888', { person: 'brian' }, new URL('https://calwwt.sppwork.com/api/sites/8888/calcr-link?lang=en'));
  assert.equal(res.status, 302);
  const to = new URL(res.headers.get('location'));
  assert.equal(to.origin + to.pathname, 'https://calcr.sppwork.com/sso');
  assert.equal(to.searchParams.get('lang'), 'en'); assert.equal(to.searchParams.get('embed'), '1');
  assert.deepEqual(await checkTicket(env, to.searchParams.get('t')), { site: '8888' });
});
