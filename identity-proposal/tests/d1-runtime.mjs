import {Miniflare,convertV4MiniflareOptions} from '/Users/apple/Documents/Codex/2026-10-15/task/cad-version2/node_modules/miniflare/dist/src/index.js';
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const mf=new Miniflare(convertV4MiniflareOptions({modules:[{type:'ESModule',path:'worker.mjs',contents:`import {createIdentity} from './identity.mjs'; const auth=createIdentity({appId:'portal',resolveActor:async(_e,id)=>id==='fixture-reader'?{id}:null,recoveryOwner:async()=>({id:'fixture-owner'})}); export default {fetch:(request,env)=>auth.handle(request,env)}`},{type:'ESModule',path:'identity.mjs',contents:read('identity.mjs')},{type:'ESModule',path:'password.mjs',contents:read('password.mjs')}],compatibilityDate:'2026-09-10',compatibilityFlags:['nodejs_compat'],d1Databases:{AUTH_DB:'identity-fixture'},bindings:{APP_ORIGIN:'https://identity.example',LOCAL_AUTH_ENABLED:'true',AUTH_RATE_KEY:'local-runtime-fixture-rate-key-123456'}}));
try{
 const db=await mf.getD1Database('AUTH_DB');for(const statement of JSON.parse(readFileSync(new URL('./migration-statements.json',import.meta.url),'utf8')))await db.prepare(statement).run();
 await db.prepare("INSERT INTO auth_accounts(id,username,role,created_at) VALUES('fixture','fixture','reader',?)").bind(Math.floor(Date.now()/1000)).run();await db.prepare("INSERT INTO auth_bindings VALUES('fixture','portal','fixture-reader')").run();
 const call=(route,data)=>mf.dispatchFetch('https://identity.example/api/local-auth/'+route,{method:'POST',headers:{origin:'https://identity.example','content-type':'application/json','x-project-auth':'1'},body:JSON.stringify(data)});
 const ticket=await call('admin/ticket',{accountId:'fixture'});assert.equal(ticket.status,200);const {code}=await ticket.json();assert.ok(code);
 const password='synthetic D1 runtime phrase 293';const redeem=await call('redeem',{token:code,password});assert.equal(redeem.status,200);assert.equal((await call('redeem',{token:code,password})).status,400);
 const login=await call('login',{username:'fixture',password});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly/);
 await call('admin/ticket',{accountId:'fixture'});
 const session=await mf.dispatchFetch('https://identity.example/api/local-auth/session',{headers:{cookie:login.headers.get('set-cookie').split(';')[0]}});assert.equal((await session.json()).user,null);
 const result={pass:true,checks:['D1 schema/triggers','setup issuance','one-time redemption','replay rejection','password login','reset revokes session'],simulatorDate:'2026-09-10',productionDateNotVerified:true};writeFileSync(new URL('../d1-runtime-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await mf.dispose()}
