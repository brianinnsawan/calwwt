import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
// The site gate in front of calnkt (src/worker.mjs default export): Thailand only, except /api/agent (Chief, own key).
const origin='https://calnkt.sppwork.com';
const env={APP_ORIGIN:origin,SITE_READY:'true',ASSETS:{fetch:async()=>new Response('asset')}};
const ctx={waitUntil(){}};
function from(country,path,init={}){const r=new Request(origin+path,init);Object.defineProperty(r,'cf',{value:{country,asn:1}});return r;}
const BLOCK='Not available outside Thailand';
test('visitors outside Thailand get the not-available page or a 403',async()=>{
 const page=await worker.fetch(from('US','/',{headers:{accept:'text/html'}}),env,ctx);
 assert.equal(page.status,403);assert.match(await page.text(),/only available in Thailand/);
 for(const path of ['/sign-in.html','/api/me','/api/local-auth/login','/schedule/']){
  const r=await worker.fetch(from('SG',path),env,ctx);assert.equal(r.status,403,path);assert.equal((await r.json()).error,BLOCK,path);
 }
});
test('Thailand visitors reach the portal as before',async()=>{
 for(const path of ['/','/api/me']){const r=await worker.fetch(from('TH',path,{headers:{accept:'text/html'}}),env,ctx);const t=await r.text();assert.equal(t.includes(BLOCK)||t.includes('only available in Thailand'),false,path);}
});
test('Chief (/api/agent) is not blocked abroad; it still needs its own key',async()=>{
 for(const path of ['/api/agent','/api/agent/state']){
  const r=await worker.fetch(from('US',path),env,ctx);const t=await r.text();assert.equal(t.includes(BLOCK),false,path);
 }
 const near=await worker.fetch(from('US','/api/agentx'),env,ctx);assert.equal(near.status,403);
});
