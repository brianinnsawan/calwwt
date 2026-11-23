import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../src/worker.mjs';
import release from '../src/site-release.mjs';
import {HttpError} from '../src/auth.mjs';
const origin='https://brian-cad-version2.brianin-nsawan.workers.dev';
function env(ready='true'){return {APP_ORIGIN:origin,SITE_READY:ready,SITE_VIEWER_EMAILS:'natthasate.k@sppthailand.com',ASSETS:{fetch:async()=>new Response('local asset')}}}
test('no home page: signed-out people go to sign-in, and project pages are checked on the server',async()=>{
 for(const path of ['/','/project-home.html','/sites/','/sites/1156/','/milestones/','/admin']){
  const request=new Request(origin+path,{headers:{accept:'text/html'}});
  const r=await createHandler(async()=>{throw new HttpError(401,'Sign in')})(request,env());
  assert.ok([302,401].includes(r.status),path);
 }
 const outsider=createHandler(async()=>({id:'outsider',email:'outside@example.com'}));
 for(const path of ['/sites/','/sites/1156/','/api/sites/1156/timeline','/admin'])assert.equal((await outsider(new Request(origin+path),env())).status,404,path);
 const home=await outsider(new Request(origin+'/'),env());assert.equal(home.status,302);assert.equal(home.headers.get('location'),'/account.html');
 const owner=createHandler(async()=>({id:'owner',email:release.ownerEmail}));const cfg={...env(),LOCAL_AUTH_OWNER_ID:'owner'};
 const landing=await owner(new Request(origin+'/project-home.html'),cfg);assert.equal(landing.status,302);assert.equal(landing.headers.get('location'),'/sites/');
 const sites=await owner(new Request(origin+'/sites/'),cfg);assert.equal(sites.status,200);assert.match(sites.headers.get('cache-control'),/no-store/);
});
test('portal entry cannot accept record mutations',async()=>{const response=await createHandler(async()=>({id:'owner',email:release.ownerEmail}))(new Request(origin+'/project-home.html',{method:'POST',headers:{origin,'x-cad-request':'1'}}),env());assert.equal(response.status,405)});

import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {passwordHash} from '../src/identity/password.mjs';
function d1(sqlite){return {prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return {meta:{changes:sqlite.prepare(sql).run(...args).changes}}}}}}}}}
test('local username reader sees project files but cannot write; existing verified owner still recovers',async()=>{
 const app=new DatabaseSync(':memory:'),auth=new DatabaseSync(':memory:');app.exec('CREATE TABLE users(id TEXT,email TEXT)');app.prepare('INSERT INTO users VALUES(?,?)').run('owner-id',release.ownerEmail);app.prepare('INSERT INTO users VALUES(?,?)').run('reader-id','Natthasate.k@sppthailand.com');
 for(const m of ['0001_identity.sql','0002_audit_lock.sql','0003_two_step.sql'])auth.exec(readFileSync(new URL('../../identity-proposal/migrations/'+m,import.meta.url),'utf8'));
 const password='portal synthetic phrase 723!';auth.prepare('INSERT INTO auth_accounts(id,username,role,password_hash,created_at) VALUES(?,?,?,?,?)').run('local-reader','ming-test','reader',await passwordHash(password),Math.floor(Date.now()/1000));auth.prepare('INSERT INTO auth_bindings VALUES(?,?,?)').run('local-reader','portal','reader-id');
 const config={...env(),DB:d1(app),AUTH_DB:d1(auth),LOCAL_AUTH_ENABLED:'true',LOCAL_AUTH_OWNER_ID:'owner-id',LOCAL_AUTH_READER_ID:'reader-id',AUTH_RATE_KEY:'synthetic-portal-test-rate-key-12345',EDITOR_READY:'true'};
 const fallback=async()=>{throw new HttpError(401,'Sign in')};const handler=createHandler(fallback);
 const login=await handler(new Request(origin+'/api/local-auth/login',{method:'POST',headers:{origin,'content-type':'application/json','x-project-auth':'1'},body:JSON.stringify({username:'ming-test',password})}),config);assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await handler(new Request(origin+'/api/me',{headers:{cookie}}),config)).status,200);
 const me=await (await handler(new Request(origin+'/api/me',{headers:{cookie}}),config)).json();assert.equal(me.siteReady,true);assert.equal(me.editorReady,false);
 assert.equal((await handler(new Request(origin+'/api/site/drawings',{headers:{cookie}}),config)).status,200);
 assert.equal((await handler(new Request(origin+'/api/drawings',{method:'POST',headers:{cookie,origin,'x-cad-request':'1','content-type':'application/json'},body:'{}'}),config)).status,403);
 assert.equal((await createHandler(async()=>({id:'outside-id',email:'outside@example.com'}))(new Request(origin+'/api/me'),config)).status,401);
 assert.equal((await createHandler(async()=>({id:'owner-id',email:release.ownerEmail}))(new Request(origin+'/api/me'),config)).status,200);
 const missingStore={...config,AUTH_DB:null};
 assert.equal((await createHandler(async()=>({id:'owner-id',email:release.ownerEmail}))(new Request(origin+'/api/me'),missingStore)).status,200);
 assert.equal((await handler(new Request(origin+'/api/me',{headers:{cookie}}),missingStore)).status,401);
 auth.prepare('UPDATE auth_accounts SET version=version+1').run();assert.equal((await handler(new Request(origin+'/api/me',{headers:{cookie}}),config)).status,401);
});
