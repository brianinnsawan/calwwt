import {randomBytes,createHash,createHmac} from 'node:crypto';
import {passwordHash,verifyPassword,validPassword} from './password.mjs';
import {verifyCode,newSecret,sealSecret,openSecret,otpauthUri,base32,newRecoveryCodes,recoveryDigest,looksLikeRecovery} from './totp.mjs';
// Brian, 1 Nov 2026: stay signed in up to 30 days per device; signed out after 7 days unused.
const TTL=30*24*3600,IDLE=7*24*3600,TICKET=15*60,COOKIE='__Host-project_session';
const digest=value=>createHash('sha256').update(value).digest('hex');
// Only the kind of device is kept (no browser string, no address): phone, tablet or computer.
const deviceKind=ua=>{const u=String(ua||'');return /iPad|Tablet|Android(?!.*Mobile)/i.test(u)?'tablet':/Mobi|iPhone|Android/i.test(u)?'phone':'computer'};
export const SESSION_IDLE=IDLE;
const TOUCH=5*60;
// The account's newest password event comes back with the session (one database call instead of two). The portal uses
// it for "a temporary password must be changed first" (src/worker.mjs mustChangePassword).
const PASSWORD_EVENTS="'task_account_created_with_temporary_password','password_reset_by_admin','password_changed_by_self','ticket_issued'";
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
 // Audit F08: the device's and the account's own limits are checked first, so one source that is already over its limit
 // no longer counts towards (and cannot use up) the site-wide limit; the site-wide cap is only an emergency brake.
 // Night audit (2 Nov 2026): wrong sign-ins are counted per account AND per device/address, and only wrong ones, so
 // someone guessing cannot lock the real person out from their own device. A wide per-account cap (60 wrong tries in
 // 15 minutes from many places) still stops a spread-out attack. Wrong 2-step codes have their own cap (10 per 15 min).
 // Round 2: label parts are JSON-encoded (no two different inputs share a key), and each try takes its place atomically
 // BEFORE the slow password check (so tries sent at the same moment cannot slip past); a right password gives it back.
 const limitKey=(env,parts,now)=>createHmac('sha256',env.AUTH_RATE_KEY).update(JSON.stringify(parts)+'\0'+Math.floor(now/900)).digest('hex');
 async function take(db,env,parts,max,now,message='Too many attempts. Try again later.'){const row=await query(db,'INSERT INTO auth_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',limitKey(env,parts,now),Math.floor(now/900)*900+900).first();if(row.count>max)fail(429,message)}
 async function giveBack(db,env,parts,now){await query(db,'UPDATE auth_limits SET count=MAX(count-1,0) WHERE key=?',limitKey(env,parts,now)).run()}
 const ipOf=(request)=>String(request.headers.get('cf-connecting-ip')||'unavailable');
 async function rate(db,env,request,now,username){await limit(db,env,'ip:'+String(request.headers.get('cf-connecting-ip')||'unavailable'),30,now);if(username)await limit(db,env,'username:'+username,8,now);await limit(db,env,'global',1000,now);await query(db,'DELETE FROM auth_limits WHERE expires_at < ?',now-900).run();}
 async function session(request,env){const db=config(env,request),raw=cookieToken(request);if(!raw)return null;const now=clock();const row=await query(db,`SELECT a.id,a.username,a.role,a.version,s.created_at,s.digest,s.two_step,s.confirmed_at,s.expires_at,s.idle_expires_at,b.subject_id,
 (SELECT event FROM auth_audit WHERE target_id=a.id AND event IN (${PASSWORD_EVENTS}) ORDER BY at DESC, rowid DESC LIMIT 1) AS password_event
 FROM auth_sessions s JOIN auth_accounts a ON a.id=s.account_id JOIN auth_bindings b ON b.account_id=a.id AND b.app_id=s.app_id
 WHERE s.digest=? AND s.app_id=? AND s.version=a.version AND a.active=1 AND a.password_hash IS NOT NULL AND s.expires_at>? AND s.idle_expires_at>?`,digest(raw),appId,now,now).first();if(!row)return null;
 const actor=await resolveActor(env,row.subject_id,row.role);if(!actor)return null;
 // Site audit (10 Nov 2026): the "last used" time was written on every request, files included. It is now written only
 // when it would move by more than 5 minutes; against a 7-day limit that changes nothing a person can notice.
 if(Math.min(row.expires_at,now+IDLE)-row.idle_expires_at>TOUCH)await query(db,'UPDATE auth_sessions SET idle_expires_at=MIN(expires_at,?) WHERE digest=?',now+IDLE,row.digest).run();
 return {actor,accountId:row.id,role:row.role,username:row.username,createdAt:row.created_at,digest:row.digest,version:row.version,twoStep:!!row.two_step,confirmedAt:row.confirmed_at||null,passwordEvent:row.password_event||null};}
 // 2-step (audit N04): a 6-digit code from the app (each time-step once), or one unused recovery code. Returns 'code', 'recovery' or null.
 async function secondFactor(db,env,t,raw,now){const code=String(raw||'').trim();if(/^\d{3}\s?\d{3}$/.test(code)){let secret;try{secret=openSecret(env,t.secret)}catch{return null}const step=verifyCode(secret,code.replace(/\s/g,''),now,t.last_step);if(step===null)return null;const r=await query(db,'UPDATE auth_totp SET last_step=? WHERE account_id=? AND last_step<?',step,t.account_id,step).run();return r.meta.changes===1?'code':null}
  if(!looksLikeRecovery(code))return null;const list=JSON.parse(t.recovery_json||'[]'),d=recoveryDigest(code);if(!list.includes(d))return null;
  const r=await query(db,'UPDATE auth_totp SET recovery_json=? WHERE account_id=? AND recovery_json=?',JSON.stringify(list.filter(x=>x!==d)),t.account_id,t.recovery_json).run();if(r.meta.changes!==1)return null;
  await query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),t.account_id,t.account_id,'two_step_recovery_code_used',now).run();return 'recovery'}
 const totpRow=(db,id,enabled=true)=>query(db,`SELECT * FROM auth_totp WHERE account_id=?${enabled?' AND enabled_at IS NOT NULL':''}`,id).first();
 async function owner(request,env){const s=await session(request,env);if(s?.role==='owner'){if(env.TWO_STEP_FOR_ADMINS==='true'&&!s.twoStep)fail(403,'Owner controls need 2-step sign-in. Set it up on this page first.');if(clock()-s.createdAt>300)fail(401,'Sign in again before changing access.');return {id:s.accountId,subjectId:s.actor.id,recovery:false}}
 // Only the existing cryptographically verified owner recovery adapter may enter here.
 const actor=await recoveryOwner(request,env);if(!actor)fail(403,'Owner access required.');return {id:'recovery:'+actor.id,subjectId:actor.id,recovery:true};}
 async function handle(request,env){const path=new URL(request.url).pathname;if(!path.startsWith('/api/local-auth/'))return null;try{
 const db=config(env,request),now=clock();
 if(path==='/api/local-auth/admin/accounts'&&request.method==='GET'){await owner(request,env);const rows=await query(db,'SELECT a.id,a.username,a.role,a.active,(a.password_hash IS NOT NULL) AS hasPassword FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id WHERE b.app_id=?',appId).all();return response({accounts:rows.results})}
 if(path==='/api/local-auth/two-step'&&request.method==='GET'){const s=await session(request,env);if(!s)fail(401,'Sign in required.');const t=await query(db,'SELECT enabled_at,recovery_json FROM auth_totp WHERE account_id=?',s.accountId).first();return response({enabled:!!t?.enabled_at,since:t?.enabled_at||null,recoveryLeft:t?.enabled_at?JSON.parse(t.recovery_json||'[]').length:0,thisSignIn:s.twoStep})}
 if(path==='/api/local-auth/session'&&request.method==='GET'){const s=await session(request,env);return response({user:s?{username:s.username,role:s.role}:null})}
 if(request.method!=='POST')fail(405,'Method not allowed.');
 if(request.headers.get('origin')!==env.APP_ORIGIN||request.headers.get('x-project-auth')!=='1'||(request.headers.has('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin'))fail(403,'Use the project sign-in page.');
 const body=await input(request);
 if(path==='/api/local-auth/login'){
  const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  await rate(db,env,request,now);
  // Per account per device (8 / 15 min) and a wide per-account cap (200 / 15 min: needs 25+ addresses, lasts 15 minutes).
  const u40=/^[a-z0-9][a-z0-9._-]{0,39}$/.test(username)?username:'<invalid>',here=['pw',u40,ipOf(request)],wide=['pw',u40];
  await take(db,env,here,8,now);await take(db,env,wide,200,now);
  const a=/^[a-z0-9][a-z0-9._-]{0,39}$/.test(username)?await query(db,'SELECT a.*,b.subject_id FROM auth_accounts a JOIN auth_bindings b ON b.account_id=a.id AND b.app_id=? WHERE a.username=?',appId,username).first():null;
  const ok=await verifyPassword(body.password,a?.password_hash);
  // Sign-in history for the Admin page (Brian, 2 Nov 2026): failed tries on a real account and every sign-in, with the kind of device.
  const device=deviceKind(request.headers.get('user-agent'));
  if(a&&!ok)await query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),'sign-in-page',a.id,'login_failed:'+device,now).run();
  if(!ok||!a?.active||!await resolveActor(env,a.subject_id,a.role))fail(401,'Username or password could not be verified.');
  await giveBack(db,env,here,now);await giveBack(db,env,wide,now); // a right password does not count
  // 2-step (audit N04): with 2-step on, the password alone is not enough. The page then asks for the 6-digit code.
  const t=await totpRow(db,a.id);let twoStep=0;
  if(t){if(!body.code)return response({twoStep:true,error:'Enter the 6-digit code from your authenticator app.'},401);
   // Recorded as login_failed:code-<device>, so the 90-day sign-in clean-up and the history lock treat it like a wrong password.
   await take(db,env,['code',u40],10,now,'Too many wrong codes. Try again in 15 minutes.');
   if(!await secondFactor(db,env,t,body.code,now)){await query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),'sign-in-page',a.id,'login_failed:code-'+device,now).run();return response({twoStep:true,error:'That code is not right. Enter the newest 6-digit code from your authenticator app.'},401)}
   await giveBack(db,env,['code',u40],now);twoStep=1}
  const raw=token();const result=await query(db,`INSERT INTO auth_sessions(digest,account_id,app_id,version,created_at,expires_at,idle_expires_at,two_step)
 SELECT ?,id,?,version,?,?,?,? FROM auth_accounts WHERE id=? AND version=? AND password_hash=? AND active=1`,digest(raw),appId,now,now+TTL,now+IDLE,twoStep,a.id,a.version,a.password_hash).run();
  if(result.meta.changes!==1)fail(401,'Username or password could not be verified.');
  await query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),a.id,a.id,'login:'+device,now).run();
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
 if(path==='/api/local-auth/change-password'){
  // Signed-in people change their own password (current one required). Other devices are signed out; this one stays in.
  const s=await session(request,env);if(!s)fail(401,'Sign in required.');
  await rate(db,env,request,now,'change:'+s.accountId);
  const a=await query(db,'SELECT * FROM auth_accounts WHERE id=? AND active=1',s.accountId).first();
  if(!a||!await verifyPassword(body.current,a.password_hash))fail(400,'Your current password is not right.');
  if(!validPassword(body.password))fail(400,'Use a password of 15–128 characters.');
  if(body.password===body.current)fail(400,'Choose a new password that is different from the current one.');
  const encoded=await passwordHash(body.password),raw=token();
  const results=await db.batch([
   query(db,'UPDATE auth_accounts SET password_hash=?,version=version+1 WHERE id=? AND version=? AND password_hash=? AND active=1',encoded,a.id,a.version,a.password_hash),
   query(db,'DELETE FROM auth_sessions WHERE account_id=? AND changes()=1',a.id),
   query(db,'INSERT INTO auth_sessions(digest,account_id,app_id,version,created_at,expires_at,idle_expires_at,two_step,confirmed_at) SELECT ?,id,?,version,?,?,?,?,? FROM auth_accounts WHERE id=? AND password_hash=? AND active=1',digest(raw),appId,now,now+TTL,now+IDLE,s.twoStep?1:0,now,a.id,encoded),
   query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),a.id,a.id,'password_changed_by_self',now),
  ]);
  if(results[0].meta.changes!==1)fail(409,'Your account changed meanwhile. Sign in again and retry.');
  return response({ok:true},200,cookie(raw,TTL));
 }
 // Confirm it is you (audit N04): password, plus the 2-step code when 2-step is on. Admin changes need this within 15 minutes.
 if(path==='/api/local-auth/confirm'){
  const s=await session(request,env);if(!s)fail(401,'Sign in required.');
  await rate(db,env,request,now,'confirm:'+s.accountId);
  const a=await query(db,'SELECT * FROM auth_accounts WHERE id=? AND active=1',s.accountId).first();
  if(!a||!await verifyPassword(body.password,a.password_hash))fail(400,'Your password is not right.');
  const t=await totpRow(db,a.id);
  if(t&&!await secondFactor(db,env,t,body.code,now))fail(400,'Enter the newest 6-digit code from your authenticator app.');
  await query(db,'UPDATE auth_sessions SET confirmed_at=? WHERE digest=?',now,s.digest).run();
  return response({ok:true,twoStep:s.twoStep});
 }
 // 2-step set-up on the Account page: start (password) -> scan the QR code -> enable (first code) -> recovery codes shown once.
 if(path==='/api/local-auth/two-step/start'){
  const s=await session(request,env);if(!s)fail(401,'Sign in required.');
  await rate(db,env,request,now,'two-step:'+s.accountId);
  const a=await query(db,'SELECT * FROM auth_accounts WHERE id=? AND active=1',s.accountId).first();
  if(!a||!await verifyPassword(body.password,a.password_hash))fail(400,'Your password is not right.');
  if(await totpRow(db,a.id))fail(409,'2-step sign-in is already on.');
  const secret=newSecret();
  await query(db,'INSERT INTO auth_totp(account_id,secret,enabled_at,last_step,recovery_json,created_at) VALUES(?,?,NULL,0,?,?) ON CONFLICT(account_id) DO UPDATE SET secret=excluded.secret,last_step=0,recovery_json=excluded.recovery_json,created_at=excluded.created_at WHERE enabled_at IS NULL',a.id,sealSecret(env,secret),'[]',now).run();
  const host=new URL(env.APP_ORIGIN).host;
  return response({secret:base32(secret),uri:otpauthUri(secret,`${a.username} (${host})`)});
 }
 if(path==='/api/local-auth/two-step/enable'){
  const s=await session(request,env);if(!s)fail(401,'Sign in required.');
  await rate(db,env,request,now,'two-step:'+s.accountId);
  const t=await query(db,'SELECT * FROM auth_totp WHERE account_id=? AND enabled_at IS NULL',s.accountId).first();if(!t)fail(409,'Start the set-up again.');
  let step=null;try{step=verifyCode(openSecret(env,t.secret),String(body.code||'').replace(/\s/g,''),now,0)}catch{/* unreadable */}
  if(step===null)fail(400,'That code is not right. Check the time on your phone and enter the newest code.');
  const codes=newRecoveryCodes();
  const results=await db.batch([
   query(db,'UPDATE auth_totp SET enabled_at=?,last_step=?,recovery_json=? WHERE account_id=? AND enabled_at IS NULL',now,step,JSON.stringify(codes.map(recoveryDigest)),s.accountId),
   query(db,'DELETE FROM auth_sessions WHERE account_id=? AND digest<>?',s.accountId,s.digest),
   query(db,'UPDATE auth_sessions SET two_step=1,confirmed_at=? WHERE digest=?',now,s.digest),
   query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),s.accountId,s.accountId,'two_step_enabled',now)]);
  if(results[0].meta.changes!==1)fail(409,'Start the set-up again.');
  return response({ok:true,recoveryCodes:codes});
 }
 if(path==='/api/local-auth/two-step/disable'){
  const s=await session(request,env);if(!s)fail(401,'Sign in required.');
  await rate(db,env,request,now,'two-step:'+s.accountId);
  const a=await query(db,'SELECT * FROM auth_accounts WHERE id=? AND active=1',s.accountId).first();
  if(!a||!await verifyPassword(body.password,a.password_hash))fail(400,'Your password is not right.');
  const t=await totpRow(db,a.id);
  if(t&&!await secondFactor(db,env,t,body.code,now))fail(400,'Enter the newest 6-digit code from your authenticator app.');
  await db.batch([query(db,'DELETE FROM auth_totp WHERE account_id=?',a.id),query(db,'UPDATE auth_sessions SET two_step=0 WHERE account_id=?',a.id),
   ...(t?[query(db,'INSERT INTO auth_audit(id,actor_id,target_id,event,at) VALUES(?,?,?,?,?)',token(),a.id,a.id,'two_step_disabled_by_self',now)]:[])]);
  return response({ok:true});
 }
 // Site audit (10 Nov 2026): the answer says whether a sign-in really ended (X-Session-Ended, read and removed by src/worker.mjs),
 // so a sign-out sent by someone who is not signed in does not make live meeting pages reconnect.
 if(path==='/api/local-auth/logout'){const raw=cookieToken(request);const ended=raw?(await query(db,'DELETE FROM auth_sessions WHERE digest=? AND app_id=?',digest(raw),appId).run()).meta?.changes===1:false;const out=response({ok:true},200,cookie('',0));if(ended)out.headers.set('X-Session-Ended','1');return out}
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
