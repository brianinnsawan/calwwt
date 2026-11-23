import {randomBytes,createHash,createHmac} from 'node:crypto';
import {passwordHash,verifyPassword,validPassword} from './password.mjs';
const TTL=8*3600,IDLE=30*60,TICKET=15*60,COOKIE='__Host-project_session';
const digest=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const validToken=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
const cookie=(value,age)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
function response(data,status=200,setCookie){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...(setCookie?{'Set-Cookie':setCookie}:{})}})}
function cookieToken(request){const entries=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+'='));return entries.length===1&&validToken(entries[0].slice(COOKIE.length+1))?entries[0].slice(COOKIE.length+1):null}
async function input(request){if(request.headers.get('content-type')?.split(';')[0]!=='application/json')fail(415,'Use JSON.');if(Number(request.headers.get('content-length'))>4096)fail(413,'Request too large.');const reader=request.body?.getReader();if(!reader)fail(400,'Invalid request.');let bytes=0,parts=[];for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();fail(413,'Request too large.')}parts.push(value)}try{const body=JSON.parse(Buffer.concat(parts).toString('utf8'));if(!body||Array.isArray(body)||typeof body!=='object')throw 0;return body}catch{fail(400,'Invalid request.')}}
export function createIdentity({appId,resolveActor,recoveryOwner,clock=()=>Math.floor(Date.now()/1000)}){
 if(!['portal','scurve'].includes(appId))throw new Error('Fixed application ID required.');
 function config(env,request){if(env.LOCAL_AUTH_ENABLED!=='true')fail(404,'Not found.');if(!env.AUTH_DB||env.AUTH_DB===env.DB||typeof env.AUTH_RATE_KEY!=='string'||env.AUTH_RATE_KEY.length<32)fail(503,'Identity setup is incomplete.');if(!/^https:\/\/[^/]+$/.test(env.APP_ORIGIN)||new URL(request.url).origin!==env.APP_ORIGIN)fail(403,'Invalid origin.');return env.AUTH_DB}
 async function limit(db,env,label,max,now){const key=createHmac('sha256',env.AUTH_RATE_KEY).update(label+'\0'+Math.floor(now/900)).digest('hex');const row=await query(db,'INSERT INTO auth_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',key,Math.floor(now/900)*900+900).first();if(row.count>max)fail(429,'Too many attempts. Try again later.');}
 async function rate(db,env,request,now,username){await limit(db,env,'global',100,now);await limit(db,env,'ip:'+String(request.headers.get('cf-connecting-ip')||'unavailable'),30,now);if(username)await limit(db,env,'username:'+username,8,now);await query(db,'DELETE FROM auth_limits WHERE expires_at < ?',now-900).run();}
 async function session(request,env){const db=config(env,request),raw=cookieToken(request);if(!raw)return null;const now=clock();const row=await query(db,`SELECT a.id,a.username,a.role,a.version,s.created_at,s.digest,b.subject_id
 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.account_id JOIN auth_bindings b ON b.account_id=a.id AND b.app_id=s.app_id
 WHERE s.digest=? AND s.app_id=? AND s.version=a.version AND a.active=1 AND a.password_hash IS NOT NULL AND s.expires_at>? AND s.idle_expires_at>?`,digest(raw),appId,now,now).first();if(!row)return null;
 const actor=await resolveActor(env,row.subject_id,row.role);if(!actor)return null;
 await query(db,'UPDATE auth_sessions SET idle_expires_at=MIN(expires_at,?) WHERE digest=?',now+IDLE,row.digest).run();return {actor,accountId:row.id,role:row.role,username:row.username,createdAt:row.created_at,digest:row.digest,version:row.version};}
 async function owner(request,env){const s=await session(request,env);if(s?.role==='owner'){if(clock()-s.createdAt>300)fail(401,'Sign in again before changing access.');return {id:s.accountId,subjectId:s.actor.id,recovery:false}}
 // Only the existing cryptographically verified owner recovery adapter may enter here.
 const actor=await recoveryOwner(request,env);if(!actor)fail(403,'Owner access required.');return {id:'recovery:'+actor.id,subjectId:actor.id,recovery:true};}
 async function handle(request,env){const path=new URL(request.url).pathname;if(!path.startsWith('/api/local-auth/'))return null;try{
 const db=config(env,request),now=clock();
 if(path==='/api/local-auth/admin/accounts'&&request.method==='GET'){await owner(request,env);const rows=await query(db,'SELECT a.id,a.username,a.role,a.active,(a.password_hash IS NOT NULL) AS hasPassword FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id WHERE b.app_id=?',appId).all();return response({accounts:rows.results})}
 if(path==='/api/local-auth/session'&&request.method==='GET'){const s=await session(request,env);return response({user:s?{username:s.username,role:s.role}:null})}
 if(request.method!=='POST')fail(405,'Method not allowed.');
 if(request.headers.get('origin')!==env.APP_ORIGIN||request.headers.get('x-project-auth')!=='1'||(request.headers.has('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin'))fail(403,'Use the project sign-in page.');
 const body=await input(request);
 if(path==='/api/local-auth/login'){
  const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  await rate(db,env,request,now,username.slice(0,40)||'<invalid>');
  const a=/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)?await query(db,'SELECT a.*,b.subject_id FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id AND b.app_id=? WHERE a.username=?',appId,username).first():null;
  const ok=await verifyPassword(body.password,a?.password_hash);
  if(!ok||!a?.active||!await resolveActor(env,a.subject_id,a.role))fail(401,'Username or password could not be verified.');
  const raw=token();const result=await query(db,`INSERT INTO auth_sessions(digest,account_id,app_id,version,created_at,expires_at,idle_expires_at)
 SELECT ?,id,?,version,?,?,? FROM auth_accounts WHERE id=? AND version=? AND password_hash=? AND active=1`,digest(raw),appId,now,now+TTL,now+IDLE,a.id,a.version,a.password_hash).run();
  if(result.meta.changes!==1)fail(401,'Username or password could not be verified.');
  return response({ok:true},200,cookie(raw,TTL));
 }
 if(path==='/api/local-auth/redeem'){
  await rate(db,env,request,now);if(!validToken(body.token))fail(400,'Setup or reset code is invalid or expired.');
  const t=await query(db,'SELECT t.digest FROM auth_tickets t JOIN auth_accounts a ON a.id=t.account_id JOIN auth_bindings b ON b.account_id=a.id AND b.app_id=? WHERE t.digest=? AND t.used_at IS NULL AND t.expires_at>? AND t.version=a.version AND a.active=1',appId,digest(body.token),now).first();if(!t)fail(400,'Setup or reset code is invalid or expired.');
  if(!validPassword(body.password))fail(400,'Use a password of 15–128 characters.');
  const encoded=await passwordHash(body.password);
  try{await query(db,'INSERT INTO auth_redemptions(ticket_digest,password_hash,redeemed_at) VALUES(?,?,?)',digest(body.token),encoded,clock()).run()}catch{fail(400,'Setup or reset code is invalid or expired.')}
  // Never authenticate by reset token. Require a separate password login.
  return response({ok:true,signInRequired:true},200,cookie('',0));
 }
 if(path==='/api/local-auth/logout'){const raw=cookieToken(request);if(raw)await query(db,'DELETE FROM auth_sessions WHERE digest=? AND app_id=?',digest(raw),appId).run();return response({ok:true},200,cookie('',0))}
 if(path==='/api/local-auth/logout-all'){const s=await session(request,env);if(!s)fail(401,'Sign in required.');await db.batch([query(db,'UPDATE auth_accounts SET version=version+1 WHERE id=?',s.accountId),query(db,'DELETE FROM auth_sessions WHERE account_id=?',s.accountId)]);return response({ok:true},200,cookie('',0))}
 if(path==='/api/local-auth/admin/ticket'||path==='/api/local-auth/admin/disable'){
  const admin=await owner(request,env);await rate(db,env,request,now);
  const target=await query(db,'SELECT a.*,b.subject_id FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id AND b.app_id=? WHERE a.id=?',appId,String(body.accountId||'')).first();if(!target)fail(404,'Account not found.');
  // Recovery can reset only its own owner binding. No caller can disable an owner.
  if(target.role==='owner'&&(!admin.recovery||target.subject_id!==admin.subjectId||path.endsWith('/disable')))fail(403,'Owner recovery is protected.');
  if(!target.active)fail(409,'Account is disabled.');
  if(path.endsWith('/disable')){await db.batch([query(db,'UPDATE auth_accounts SET active=0,version=version+1 WHERE id=? AND role<>?',target.id,'owner'),query(db,'DELETE FROM auth_sessions WHERE account_id=?',target.id),query(db,'INSERT INTO auth_audit VALUES(?,?,?,?,?)',token(),admin.id,target.id,'disabled',now)]);return response({ok:true})}
  const raw=token();const results=await db.batch([
   query(db,'UPDATE auth_accounts SET password_hash=NULL,version=version+1 WHERE id=? AND version=? AND active=1',target.id,target.version),
   query(db,'INSERT INTO auth_tickets(digest,account_id,version,expires_at,purpose) SELECT ?,id,version,?,? FROM auth_accounts WHERE id=? AND version=? AND changes()=1',digest(raw),now+TICKET,target.password_hash?'reset':'setup',target.id,target.version+1),
   query(db,'DELETE FROM auth_sessions WHERE account_id=?',target.id),
   query(db,'INSERT INTO auth_audit VALUES(?,?,?,?,?)',token(),admin.id,target.id,'ticket_issued',now)]);
  if(results[0].meta.changes!==1||results[1].meta.changes!==1)fail(409,'Account changed. Review before issuing another code.');
  return response({code:raw,expiresIn:TICKET,username:target.username,delivery:'Give this one-time code privately to the verified person. Do not put it in a URL.'});
 }
 fail(404,'Not found.');
 }catch(error){return response({error:error.status?error.message:'Identity service unavailable.'},error.status||503)}}
 return {handle,session};
}
