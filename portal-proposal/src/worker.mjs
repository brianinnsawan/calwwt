import {identity,portalIdentity,PASSWORD_EVENT} from './local-auth.mjs';
// SPDX-License-Identifier: GPL-3.0-only
import {authenticate, allowedEmails, normalizeEmail, HttpError, hash} from './auth.mjs';
import software from './software.mjs';
import {releaseObject} from './release-object.mjs';
import {routeTasks,stagingSetup} from './tasks-portal.mjs';
import {siteAccess,landingPath,VIEW_AS_COOKIE,signViewAs} from './site-access.mjs';
import {routeSites,SITES_CSP} from './sites.mjs';
import {routeCadWorkspace,CAD_PARSER_WORKER,CAD_WORKER_CSP,cadCacheControl} from './cad-workspace.mjs';
import {gate} from '../../schedule/gate-core.mjs';
import {routeFiles} from './files.mjs';
import {routeTrackers} from './trackers.mjs';
import {routeMeetings,reconnectMeetingRooms} from './meetings.mjs';
import {REPEAT_CRON,runScheduledRepeats} from './repeats.mjs';
import {routeAgent,routeAgentAdmin} from './agent.mjs';
import {canonicalPath} from './paths.mjs';
import {routeBackup,scheduledJob} from './backup.mjs';
import {requireAdminGate} from './admin-gate.mjs';
export {MeetingRoom} from './meeting-room.mjs';
import {serveSiteAsset,legacySiteAPI,originalDrawing,siteDrawings,isSiteViewer,requireSiteViewer} from './site-assets.mjs';
const MAX_BYTES = 25 * 1024 * 1024;
const idPattern = '[0-9a-f-]{36}';
const mime = 'application/acad';
const fail = (status, message, details) => { throw new HttpError(status, message, details); };
const json = (body, status=200) => Response.json(body, {status});
const sql = (env, query, ...values) => env.DB.prepare(query).bind(...values);
const one = (env, query, ...values) => sql(env, query, ...values).first();
const all = async (env, query, ...values) => (await sql(env, query, ...values).all()).results;
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
function field(value, max, required=true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'A required text field is missing or too long.');
  return value.trim();
}
function filename(value) {
  const name = field(value, 180);
  if (!/\.dwg$/i.test(name) || /[\x00-\x1f\x7f/\\]/.test(name)) fail(400, 'Choose a DWG file with a plain filename.');
  return name;
}
async function boundedBytes(request, limit) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) fail(413, 'File is too large. Maximum size is 25 MiB.');
  if (!request.body) fail(400, 'The request body is empty.');
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  for (;;) {
    const {done,value} = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); fail(413, 'Request body exceeds its size limit.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
async function bodyJSON(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Expected JSON.');
  try { return JSON.parse(new TextDecoder().decode(await boundedBytes(request, 8192))); }
  catch(error) { if (error instanceof HttpError) throw error; fail(400, 'Invalid JSON.'); }
}
async function drawing(env, actor, id, action='view') {
  const row = await one(env, `SELECT d.*, CASE WHEN d.owner_id = ? THEN 'owner' WHEN ? THEN g.role END AS role
    FROM drawings d LEFT JOIN grants g ON g.drawing_id = d.id AND g.email = ? WHERE d.id = ?`, actor.id, env.SHARING_ENABLED==='true'?1:0, actor.email, id);
  if (!row || !row.role) fail(404, 'Drawing not found.');
  const roles = {view:['owner','view','edit','approve'], edit:['owner','edit'], approve:['owner','approve'], share:['owner']};
  if (!roles[action].includes(row.role)) fail(403, `You do not have permission to ${action} this drawing.`);
  return row;
}
async function revision(env, drawingId, revisionId) {
  const row = await one(env, 'SELECT * FROM revisions WHERE id = ? AND drawing_id = ?', revisionId, drawingId);
  if (!row) fail(404, 'Revision not found.');
  return row;
}
async function registerActor(env, actor) {
  // Fail closed if an email is unexpectedly reassigned to a new Access subject.
  await sql(env, 'INSERT OR IGNORE INTO users(id,email,created_at) VALUES(?,?,?)', actor.id, actor.email, now()).run();
  const user = await one(env, 'SELECT id,email FROM users WHERE id=?', actor.id);
  if (!user || user.email !== actor.email) fail(403, 'Identity changed. Owner review is required.');
}
async function settleUpload(env, id, recoverAbandoned=false) {
  // Cancellation and revision publication serialize in D1. A cancelled intent
  // cannot pass revision_upload_guard, including a delayed ambiguous commit.
  // A known completed write can be deleted. An abandoned write instead requires
  // a persistent R2 barrier before its reservation can be released.
  try {
    if(recoverAbandoned)await sql(env,"UPDATE upload_reservations SET requires_barrier=CASE WHEN state='uploading' THEN 1 ELSE requires_barrier END,state='cancelled' WHERE id=? AND state IN ('uploading','uploaded')",id).run();
    else await sql(env,"UPDATE upload_reservations SET state='cancelled' WHERE id=? AND state='uploaded'",id).run();
    if(await one(env,'SELECT id FROM revisions WHERE id=?',id))return 'published';
    const intent=await one(env,'SELECT * FROM upload_reservations WHERE id=?',id);
    if(intent?.state!=='cancelled')return 'uncertain';
    if(intent.requires_barrier){
      // A permanent zero-byte tombstone fences late conditional-create writes.
      // First win the absent-key race, or conditionally replace the exact known
      // unpublished object. Never delete an object with an uncertain writer.
      const marker={httpMetadata:{contentType:'application/octet-stream'},customMetadata:{cancelledUpload:id}};
      let fenced=await env.DRAWINGS.put(intent.object_key,new Uint8Array(),{...marker,onlyIf:{etagDoesNotMatch:'*'}});
      if(!fenced){
        const object=await env.DRAWINGS.head(intent.object_key);
        if(object?.size===0&&object.customMetadata?.cancelledUpload===id)fenced=true;
        else if(object?.size===intent.size&&object.customMetadata?.sha256===intent.sha256&&object.etag){
          fenced=await env.DRAWINGS.put(intent.object_key,new Uint8Array(),{...marker,onlyIf:{etagMatches:object.etag}});
          if(!fenced){const current=await env.DRAWINGS.head(intent.object_key);fenced=current?.size===0&&current.customMetadata?.cancelledUpload===id;}
        }
      }
      if(!fenced)return 'uncertain';
    }else await env.DRAWINGS.delete(intent.object_key);
    await sql(env,"DELETE FROM upload_reservations WHERE id=? AND state='cancelled'",id).run();
    return intent.requires_barrier?'fenced':'removed';
  } catch { return 'uncertain'; } // Preserve the object/reservation on uncertainty.
}
async function storage(env,actor) {
  const used=await one(env,'SELECT COALESCE(SUM(r.size),0) AS bytes FROM revisions r JOIN drawings d ON d.id=r.drawing_id WHERE d.owner_id=?',actor.id);
  const pending=await all(env,'SELECT id,size,state,created_at FROM upload_reservations WHERE owner_id=? ORDER BY created_at',actor.id);
  return {usedBytes:used.bytes,reservedBytes:pending.reduce((n,item)=>n+item.size,0),ownerLimitBytes:268435456,totalDrawingLimitBytes:536870912,pending};
}
async function upload(request, env, actor, drawingId, noteOverride) {
  let parent = null; let record;
  if (drawingId) {
    record = await drawing(env, actor, drawingId, 'edit');
    const match = request.headers.get('if-match');
    if (!match || !new RegExp(`^"${idPattern}"$`).test(match)) fail(428, 'A base revision is required. Reopen the drawing before saving.');
    parent = match.slice(1,-1);
    if (parent !== record.head_id) fail(409, 'A newer revision exists. Your changes were not uploaded. Download your draft, then reopen the latest revision.', {currentRevision:record.head_id});
  }
  let name;
  try { name = filename(decodeURIComponent(request.headers.get('x-filename') || '')); }
  catch (error) { if(error instanceof HttpError) throw error; fail(400, 'Invalid filename encoding.'); }
  const note = field(noteOverride ?? request.headers.get('x-revision-note') ?? '', 500, false);
  const bytes = await boundedBytes(request, MAX_BYTES);
  if (!/^AC10(12|14|15|18|21|24|27|32)$/.test(new TextDecoder().decode(bytes.slice(0,6)))) fail(415, 'The file is not a supported binary DWG.');
  const created = now(); const revisionId = uuid(); const id = drawingId || uuid();
  const objectKey = `drawings/${id}/${revisionId}.dwg`; const digest = await hash(bytes);
  try {
    await sql(env,"INSERT INTO upload_reservations(id,owner_id,drawing_id,object_key,sha256,size,state,created_at) VALUES(?,?,?,?,?,?,'uploading',?)",revisionId,record?.owner_id||actor.id,id,objectKey,digest,bytes.length,created).run();
  } catch(error) {
    if(String(error).includes('storage_quota'))fail(507,'The drawing storage allowance is full (256 MiB per owner, 512 MiB total, including pending uploads). Existing revisions remain safe.');
    throw error;
  }
  const object = await env.DRAWINGS.put(objectKey, bytes, {
    onlyIf: {etagDoesNotMatch:'*'}, httpMetadata: {contentType:mime}, customMetadata:{sha256:digest}
  });
  if (!object) {
    await sql(env,'DELETE FROM upload_reservations WHERE id=?',revisionId).run();
    fail(409, 'This revision key already exists. No file was overwritten.');
  }
  // An ambiguous R2 failure remains reserved until an owner explicitly fences
  // it after ten minutes. A late writer cannot overwrite that tombstone.
  await sql(env,"UPDATE upload_reservations SET state='uploaded' WHERE id=? AND state='uploading'",revisionId).run();
  const statements = [];
  if (!drawingId) statements.push(sql(env, 'INSERT INTO drawings(id,owner_id,title,created_at) VALUES(?,?,?,?)', id, actor.id, name.slice(0,-4).slice(0,160) || 'Untitled', created));
  statements.push(sql(env, `INSERT INTO revisions(id,drawing_id,parent_id,object_key,sha256,size,filename,created_by,created_at,note)
    VALUES(?,?,?,?,?,?,?,?,?,?)`, revisionId,id,parent,objectKey,digest,bytes.length,name,actor.id,created,note));
  statements.push(sql(env,'DELETE FROM upload_reservations WHERE id=?',revisionId));
  try {
    if(record && record.owner_id!==actor.id && env.SHARING_ENABLED!=='true')fail(403,'Sharing was disabled. The revision was not published.');
    await env.DB.batch(statements);
  }
  catch(error) {
    const outcome=await settleUpload(env,revisionId);
    if(outcome!=='published') {
      if (String(error).includes('revision_conflict')) fail(409, 'Another save won the race. Download your draft and reopen the current revision.');
      if (String(error).includes('revision_forbidden')) fail(403, 'Edit permission changed. The revision was not published.');
      if (String(error).includes('upload_not_ready')) fail(409, 'This interrupted upload was recovered. Retry from the current revision; no old file was overwritten.');
      throw error;
    }
  }
  return json({drawingId:id, revisionId, sha256:digest, bytes:bytes.length, createdAt:created},201);
}
async function api(request, env, actor, url, access) {
  if (url.pathname === '/api/me' && request.method === 'GET') return json({...actor,person:access.person,name:access.name,lang:access.lang,viewAs:access.viewAs||null,pages:access.pages,areas:[...access.areas],accessAdmin:access.admin,accessView:access.view,workspaceReady:!actor.taskOnly&&env.WORKSPACE_READY==='true',sharingEnabled:env.SHARING_ENABLED==='true',editorReady:actor.localRole!=='reader'&&env.EDITOR_READY==='true',viewerReady:env.VIEWER_READY==='true'||env.EDITOR_READY==='true',siteReady:env.SITE_READY==='true'&&isSiteViewer(env,actor),maxBytes:MAX_BYTES});
  if(url.pathname==='/api/site/drawings'&&request.method==='GET')return json({drawings:siteDrawings(env,actor)});
  await registerActor(env, actor);
  if(url.pathname==='/api/site/import'&&request.method==='POST'){
    const body=await bodyJSON(request),original=await originalDrawing(env,actor,body.sourcePath);
    const info=original.metadata;
    const note=`Original site copy ${info.catalogId}; SHA-256 ${original.sha256}; layout ${info.layout||'Model'}.${info.reconstructed?' Reconstructed DWG: the contract PDF governs.':''}`;
    return upload(new Request(env.APP_ORIGIN+'/api/drawings',{method:'POST',body:original.bytes,headers:{'X-Filename':encodeURIComponent(original.filename)}}),env,actor,undefined,note);
  }
  if(url.pathname==='/api/storage' && request.method==='GET')return json(await storage(env,actor));
  if(url.pathname==='/api/storage/reconcile' && request.method==='POST') {
    const cutoff=new Date(Date.now()-10*60*1000).toISOString();
    const pending=await all(env,"SELECT id FROM upload_reservations WHERE owner_id=? AND created_at<? ORDER BY created_at LIMIT 25",actor.id,cutoff);
    const results=[];for(const item of pending)results.push({id:item.id,outcome:await settleUpload(env,item.id,true)});
    return json({results,...await storage(env,actor)});
  }
  if (url.pathname === '/api/drawings') {
    if (request.method === 'GET') return json({drawings:await all(env, `SELECT d.*, u.email AS owner_email, r.filename, r.sha256, r.created_at AS updated_at,
      CASE WHEN d.owner_id=? THEN 'owner' WHEN ? THEN g.role END AS role
      FROM drawings d JOIN users u ON u.id=d.owner_id LEFT JOIN revisions r ON r.id=d.head_id
      LEFT JOIN grants g ON g.drawing_id=d.id AND g.email=?
      WHERE d.owner_id=? OR (? AND g.role IS NOT NULL) ORDER BY r.created_at DESC LIMIT 500`,actor.id,env.SHARING_ENABLED==='true'?1:0,actor.email,actor.id,env.SHARING_ENABLED==='true'?1:0)});
    if (request.method === 'POST') return upload(request,env,actor);
  }
  const route = url.pathname.match(new RegExp(`^/api/drawings/(${idPattern})(?:/(.*))?$`));
  if (!route) fail(404,'Not found.');
  const [,drawingId,tail=''] = route;
  const record = await drawing(env,actor,drawingId);
  if (!tail && request.method==='GET') {
    return json({drawing:record,revisions:await all(env, `SELECT r.id,r.parent_id,r.sha256,r.size,r.filename,r.created_at,r.note,u.email AS author_email,
      (SELECT COUNT(*) FROM approvals a WHERE a.revision_id=r.id) AS approval_count
      FROM revisions r JOIN users u ON u.id=r.created_by WHERE r.drawing_id=? ORDER BY r.created_at DESC`,drawingId)});
  }
  if(tail==='revisions' && request.method==='POST') return upload(request,env,actor,drawingId);
  if(tail==='grants') {
    await drawing(env,actor,drawingId,'share');
    if(request.method==='GET') return json({grants:await all(env,'SELECT email,role,created_at FROM grants WHERE drawing_id=?',drawingId), enabled:env.SHARING_ENABLED==='true'});
    if(request.method==='DELETE') {
      const body=await bodyJSON(request);const email=normalizeEmail(field(body.email,254));
      await sql(env,'DELETE FROM grants WHERE drawing_id=? AND email=? AND EXISTS (SELECT 1 FROM drawings WHERE id=? AND owner_id=?)',drawingId,email,drawingId,actor.id).run();
      return json({email,revoked:true});
    }
    if(request.method==='POST') {
      if(env.SHARING_ENABLED!=='true') fail(403,'Sharing is not enabled. The initial application admits Brian only.');
      const body=await bodyJSON(request); const email=normalizeEmail(body.email);
      if(!allowedEmails(env).has(email)) fail(403,'The recipient must first be explicitly approved for this application.');
      if(!['view','edit','approve'].includes(body.role)) fail(400,'Choose View, Edit, or Approve.');
      await sql(env, `INSERT INTO grants(drawing_id,email,role,granted_by,created_at) VALUES(?,?,?,?,?)
        ON CONFLICT(drawing_id,email) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by,created_at=excluded.created_at`,drawingId,email,body.role,actor.id,now()).run();
      return json({email,role:body.role},201);
    }
  }
  const revRoute=tail.match(new RegExp(`^revisions/(${idPattern})/(file\.dwg|approvals|approval-record\.json)$`));
  if(revRoute) {
    const [,revisionId,operation]=revRoute; const rev=await revision(env,drawingId,revisionId);
    if(operation==='file.dwg' && request.method==='GET') {
      const file=await env.DRAWINGS.get(rev.object_key);
      if(!file || file.size!==rev.size || file.customMetadata?.sha256!==rev.sha256) fail(503,'The stored revision could not be verified.');
      return new Response(file.body,{headers:{'Content-Type':mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(rev.filename)}`,'ETag':`"${rev.sha256}"`,'X-Content-SHA256':rev.sha256}});
    }
    if(operation==='approvals' && request.method==='POST') {
      await drawing(env,actor,drawingId,'approve');
      const body=await bodyJSON(request);
      if(body.sha256!==rev.sha256) fail(409,'The revision hash changed or does not match the reviewed file.');
      const approval={id:uuid(),revisionId,sha256:rev.sha256,approverId:actor.id,approverEmail:actor.email,createdAt:now(),scope:field(body.scope,500),comment:field(body.comment||'',2000,false)};
      try {
        if(record.owner_id!==actor.id && env.SHARING_ENABLED!=='true')fail(403,'Sharing was disabled. No approval was recorded.');
        await sql(env,'INSERT INTO approvals(id,revision_id,sha256,approved_by,approver_email,created_at,scope,comment) VALUES(?,?,?,?,?,?,?,?)',approval.id,revisionId,rev.sha256,actor.id,actor.email,approval.createdAt,approval.scope,approval.comment).run();
      }
      catch(error){if(String(error).includes('approval_forbidden'))fail(403,'Approval permission changed. No approval was recorded.');throw error;}
      return json(approval,201);
    }
    if(['approvals','approval-record.json'].includes(operation) && request.method==='GET') {
      const approvals=await all(env,'SELECT * FROM approvals WHERE revision_id=? ORDER BY created_at',revisionId);
      const result=json({format:'CAD version2 approval record v1',drawingId,title:record.title,revisionId,sha256:rev.sha256,filename:rev.filename,bytes:rev.size,revisionCreatedAt:rev.created_at,approvals,
        statement:'Recorded application approval for this exact file and stated scope. This is not a qualified digital signature or independent engineering certification.'});
      if(operation==='approval-record.json') result.headers.set('Content-Disposition',`attachment; filename="approval-${revisionId}.json"`);
      return result;
    }
  }
  fail(405,'This operation is not available.');
}
const TEMPORARY_PASSWORD_EVENTS=new Set(['task_account_created_with_temporary_password','password_reset_by_admin']);
/** True when the account's latest password event is one set by an admin (and not yet replaced by the person or a setup code). */
async function mustChangePassword(env,actor){
  if(!actor?.accountId||!env.AUTH_DB)return false;
  // A signed-in session already carries the newest password event (src/identity/identity.mjs): no second database call.
  if(PASSWORD_EVENT in actor)return TEMPORARY_PASSWORD_EVENTS.has(actor[PASSWORD_EVENT]);
  const row=await env.AUTH_DB.prepare("SELECT event FROM auth_audit WHERE target_id=? AND event IN ('task_account_created_with_temporary_password','password_reset_by_admin','password_changed_by_self','ticket_issued') ORDER BY at DESC, rowid DESC LIMIT 1").bind(actor.accountId).first();
  return !!row&&TEMPORARY_PASSWORD_EVENTS.has(row.event);
}
function secure(response,csp) {
  const copy=new Response(response.body,response);
  const headers={
    'Cache-Control':'private, no-store, max-age=0', 'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer', 'X-Frame-Options':'SAMEORIGIN',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    // Night audit (2 Nov 2026): browsers only ever use https for this site.
    'Strict-Transport-Security':'max-age=31536000'
  };
  if(csp)headers['Content-Security-Policy']=csp;
  for(const [key,value] of Object.entries(headers)) copy.headers.set(key,value);
  return copy;
}
// Faster pages on weak signal (Brian, 3 Nov 2026). secure() marks everything "do not store"; this then relaxes it for
// files only, never for pages (HTML) or data (/api/…):
// - files whose name carries their content fingerprint (3D models and sheets "-0123456789ab.glb", the model viewer's
//   "index-AbC_dE12.js", the full CAD program's version folder) never change under that name: the browser keeps them;
// - other files with a fingerprint (ETag), such as the viewers and model sheets: kept, but checked with the site on
//   every use ("no-cache"). The access check still runs on every request; an unchanged file costs a few bytes (304).
// Downloads ("attachment") stay "do not store". Signing out clears what the browser kept (Clear-Site-Data, below).
// Site audit (10 Nov 2026): also the Tasks screens ("/__tasks/app-0123456789ab.js", tasks/scripts/build-ui-module.mjs),
// the camp models ("-0123456789ab.glb.json") and the model viewer's ".mjs" files, which carry a fingerprint too.
const KEEP_FOREVER=/(?:-[0-9a-f]{12}\.(?:glb|glb\.json|json|pdf|svg|png|webp|js|mjs|css|wasm)$)|(?:^\/(?:model|files\/cad)\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|mjs|css)$)|(?:^\/cad-workspace\/full\/v\d+(?:\.\d+)*\/)/;
const sameTag=(a,b)=>a.replace(/^W\//,'')===b.replace(/^W\//,'');
export function cachePolicy(request,response){
  const path=new URL(request.url).pathname;
  if(path==='/api/local-auth/logout'||path==='/api/local-auth/logout-all'){if(response.status===200)response.headers.set('Clear-Site-Data','"cache"');return response;}
  if(!['GET','HEAD'].includes(request.method))return response;
  if(path.startsWith('/api/')||path.startsWith('/model/api/')||path.startsWith('/owner-recovery'))return response;
  if(![200,206,304].includes(response.status))return response;
  if(/text\/html/i.test(response.headers.get('content-type')||''))return response;
  if(/^attachment/i.test(response.headers.get('content-disposition')||''))return response;
  if(/immutable/.test(response.headers.get('cache-control')||''))return response;
  const etag=response.headers.get('etag');
  if(KEEP_FOREVER.test(path))response.headers.set('Cache-Control','private, max-age=31536000, immutable');
  else if(etag)response.headers.set('Cache-Control','private, no-cache');
  else return response;
  const asked=request.headers.get('if-none-match');
  if(etag&&asked&&response.status===200&&asked.split(',').some((t)=>sameTag(t.trim(),etag))){
    try{response.body?.cancel();}catch{}
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-range');
    return new Response(null,{status:304,headers});
  }
  return response;
}
// authenticateOverride exists only as a module-level test seam. The deployed
// default verifies local sessions or cryptographic owner recovery.
export function createHandler(authenticateOverride=authenticate) {
  const handle=async(request,env,ctx) => {
    try {
      if(new URL(request.url).origin!==env.APP_ORIGIN)fail(403,'This hostname is not enabled.');
      // Audit F01: every check below and the asset store see the same canonical path. Disguised spellings
      // (%73afety, //safety, safety%2F...) are redirected to the plain form or refused.
      {const u=new URL(request.url),canon=canonicalPath(u.pathname);
        if(canon===null)fail(404,'Not found.');
        if(canon!==u.pathname){if(!['GET','HEAD'].includes(request.method))fail(404,'Not found.');return secure(new Response(null,{status:308,headers:{Location:canon+u.search}}));}}
      // Chief, Brian's AI assistant: /api/agent/* with its key only (src/agent.mjs); never a browser session.
      {const agentResponse=await routeAgent(request,env);if(agentResponse)return secure(agentResponse);}
      const recoveryPath=new URL(request.url).pathname;
      if(recoveryPath==='/owner-recovery'||recoveryPath.startsWith('/owner-recovery/')){
        const owner=await authenticateOverride(request,env);
        if(!env.LOCAL_AUTH_OWNER_ID||owner.id!==env.LOCAL_AUTH_OWNER_ID)fail(403,'Owner recovery only.');
        if(recoveryPath==='/owner-recovery')return secure(new Response(null,{status:308,headers:{Location:'/owner-recovery/'}}));
        if(recoveryPath==='/owner-recovery/'&&['GET','HEAD'].includes(request.method)){
          const asset=new URL('/account.html',request.url);return secure(await env.ASSETS.fetch(new Request(asset,request)));
        }
        const suffix=recoveryPath.slice('/owner-recovery'.length);
        if(!['/api/local-auth/admin/accounts','/api/local-auth/admin/ticket'].includes(suffix))fail(404,'Not found.');
        // Force the cryptographic recovery adapter, not a concurrent local
        // session, for owner reset. Keep the Access assertion/cookie intact.
        const headers=new Headers(request.headers);
        headers.set('cookie',(headers.get('cookie')||'').split(';').filter(x=>!x.trim().startsWith('__Host-project_session=')).join(';'));
        const target=new URL(request.url);target.pathname=suffix;
        const result=await identity.handle(new Request(target,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method)?{body:request.body,duplex:'half'}:{})}),env);
        return secure(result);
      }
      // Audit F06: while an admin is viewing the site as someone else, login administration and password changes are refused
      // too (signing out stays allowed). The view-as cookie is only ever set for admins.
      {const p=new URL(request.url).pathname,viewing=(request.headers.get('cookie')||'').split(';').some((c)=>{const [k,v]=c.trim().split('=');return k===VIEW_AS_COOKIE&&!!v;});
        if(viewing&&!['GET','HEAD'].includes(request.method)&&p.startsWith('/api/local-auth/')&&!['/api/local-auth/logout','/api/local-auth/logout-all','/api/local-auth/login','/api/local-auth/redeem'].includes(p))fail(403,'View only: you are viewing the site as someone else. Stop viewing to make changes.');}
      const authResponse=await identity.handle(request,env);
      if(authResponse){
        // Round 2: signing out also ends "View the site as" (otherwise the next sign-in on this browser looked like viewing).
        const out=secure(authResponse),ap=new URL(request.url).pathname;
        if(['/api/local-auth/logout','/api/local-auth/logout-all'].includes(ap))out.headers.append('Set-Cookie',`${VIEW_AS_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`);
        return out;
      }
      const stagingResponse=await stagingSetup(request,env);if(stagingResponse)return secure(stagingResponse);
      const authPath=new URL(request.url).pathname;
      if(env.LOCAL_AUTH_ENABLED==='true'&&(authPath==='/sign-in.html'||authPath==='/account.html'||authPath==='/privacy.html'||authPath.startsWith('/__identity/'))){
        // Site audit (10 Nov 2026): the forms on these pages are sent by the page's own program. If that has not loaded yet (weak
        // signal) the browser sends the form itself: as a POST (method="post" in the pages), which is answered by showing the
        // page again. What was typed is not read, kept or logged, and never becomes part of the address.
        if(!['GET','HEAD'].includes(request.method))return secure(new Response(null,{status:303,headers:{Location:authPath}}));
        return secure(await env.ASSETS.fetch(request));
      }
      const actor=await portalIdentity(request,env,authenticateOverride);
      // Audit F02 (Brian, 2 Nov 2026): a password set by an admin (temporary) only lets the person change it. Until they choose
      // their own on the Account page, every other page sends them there and every other API call is refused.
      if(await mustChangePassword(env,actor)){
        const p=new URL(request.url).pathname;
        const allowed=p==='/account.html'||p.startsWith('/__nav/')||p.startsWith('/__identity/')||p==='/api/me';
        if(!allowed){
          if(p.startsWith('/api/'))fail(403,'Please change your temporary password first (Account page).');
          return secure(new Response(null,{status:302,headers:{Location:'/account.html?change=1'}}));
        }
      }
      // "View the site as" switch (admins only): start or stop. Uses the real signed-in person, never the viewed one.
      if(new URL(request.url).pathname==='/api/view-as'){
        if(request.method!=='POST')fail(405,'Method not allowed.');
        if(request.headers.get('origin')!==env.APP_ORIGIN||request.headers.get('x-requested-with')!=='tasks')fail(403,'Request blocked.');
        const real=await siteAccess(env,actor);
        if(!real.admin||!env.TASKS_DB)fail(403,'Only admins can view the site as someone else.');
        const body=await bodyJSON(request);const id=body.person==null?null:String(body.person);
        if(id)requireAdminGate(env,actor); // audit N04: starting view-as is an admin action; stopping is always allowed
        const cookie=v=>`${VIEW_AS_COOKIE}=${v}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${v?3600:0}`;
        if(!id)return secure(new Response(JSON.stringify({viewAs:null}),{headers:{'Content-Type':'application/json','Set-Cookie':cookie('')}}));
        const row=await env.TASKS_DB.prepare('SELECT id,name FROM people WHERE id=? AND active=1').bind(id).first();
        if(!row||!/^[a-z0-9]{1,40}$/.test(row.id))fail(404,'Person not found.');
        if(row.id===real.person)fail(400,'That is you.');
        await env.TASKS_DB.prepare("INSERT INTO events(task_id,request_id,at,by_id,kind,data_json) VALUES(NULL,NULL,?,?,'view_as',?)").bind(new Date().toISOString(),real.person||'brian',JSON.stringify({person:row.id})).run();
        return secure(new Response(JSON.stringify({viewAs:{id:row.id,name:row.name}}),{headers:{'Content-Type':'application/json','Set-Cookie':cookie(signViewAs(env,real.person,row.id))}}));
      }
      const access=await siteAccess(env,actor,request);
      // While viewing as someone: look only. Every change is refused.
      if(access.viewAs&&!['GET','HEAD'].includes(request.method))fail(403,'View only: you are viewing the site as someone else. Stop viewing to make changes.');
      // Task app: its own API checks (origin + header) and per-person permissions apply.
      // Admin -> Backups (audit F11). Admins only; see src/backup.mjs.
      const backupResponse=await routeBackup(request,env,actor,access);if(backupResponse)return secure(backupResponse);
      // Admin -> Chief: the owner's assistant keys and what Chief did (owner only).
      const agentAdminResponse=await routeAgentAdmin(request,env,actor,access);if(agentAdminResponse)return secure(agentAdminResponse);
      const tasksResponse=await routeTasks(request,env,actor,access);if(tasksResponse)return secure(tasksResponse);
      const url0=new URL(request.url),p0=url0.pathname;
      // Sub-tab pages: Schedule -> Milestones, Drawings -> Drawing changes, Safety -> HES plan. See src/trackers.mjs.
      const trackersResponse=await routeTrackers(request,env,actor,access);if(trackersResponse)return secure(trackersResponse);
      const meetingsResponse=await routeMeetings(request,env,actor,access);if(meetingsResponse)return meetingsResponse.webSocket?meetingsResponse:secure(meetingsResponse); // a live page connection is passed on as it is
      const SUBPAGES={'/milestones':'timeline','/drawing-changes':'drawings','/meetings':'meetings'};
      const sub=Object.keys(SUBPAGES).find((k)=>p0===k||p0.startsWith(k+'/'));
      if(sub){
        if((access.pages?.[SUBPAGES[sub]]||'none')==='none')fail(404,'Not found.');
        if(!['GET','HEAD'].includes(request.method))fail(405,'Method not allowed.');
        if(p0===sub)return secure(new Response(null,{status:308,headers:{Location:sub+'/'}}));
        const target=new URL(request.url);if(p0.endsWith('/'))target.pathname=p0+'index.html';
        return secure(await env.ASSETS.fetch(new Request(target,request)));
      }
      // Sites -> CAD workspace (/cad-workspace/, /api/cad/*; copied from calnkt, 27 Nov 2026; old /workspace/, /cad/ and /app/
      // addresses lead there). Page level 'drawings': view = open, measure, draw on screen; edit = also save notes and copies.
      // See src/cad-workspace.mjs.
      const cadResponse=await routeCadWorkspace(request,env,actor,access);
      if(cadResponse){const out=secure(cadResponse,p0===CAD_PARSER_WORKER?CAD_WORKER_CSP:undefined),cache=cadCacheControl(p0,cadResponse.status);if(cache)out.headers.set('Cache-Control',cache);return out;}
      // Sites (calwwt): the 8 Caltex sites, each with its 3D model, timeline, photos and notes. See src/sites.mjs.
      {const sitesResponse=await routeSites(request,env,actor,access);if(sitesResponse)return secure(sitesResponse,p0.startsWith('/api/')?undefined:SITES_CSP);}
      // Project files: /files (screens) and /api/files (list, upload, download). Own checks inside; see src/files.mjs.
      if(p0==='/files'||p0.startsWith('/files/')||p0==='/api/files'||p0.startsWith('/api/files/')){
        // The viewer and Excel code (no data) is also used by Safety -> HES plan and the tracker downloads
        // (Milestones, Drawing changes), so anyone who may open any page may load it.
        const viewerCode=p0==='/files/view.mjs'||p0==='/files/formula.mjs'||p0==='/files/files.css'||p0.startsWith('/files/vendor/');
        if((access.pages?.files||'none')==='none'&&!(viewerCode&&Object.values(access.pages||{}).some((l)=>l&&l!=='none')))fail(404,'Not found.');
        if(p0.startsWith('/api/')||p0==='/files/cad/sheets.json'){
          const viewer=access.person&&env.TASKS_DB?await env.TASKS_DB.prepare('SELECT id, company FROM people WHERE id=? AND active=1').bind(access.person).first():null;
          return secure(await routeFiles(request,env,actor,access,viewer));
        }
        if(!['GET','HEAD'].includes(request.method))fail(405,'Method not allowed.');
        if(p0==='/files')return secure(new Response(null,{status:308,headers:{Location:'/files/'}}));
        const target=new URL(request.url);if(p0.endsWith('/'))target.pathname=p0+'index.html';
        // The DWG reader (LibreDWG compiled to WebAssembly, run in a Web Worker) builds its bindings at run time,
        // which needs 'unsafe-eval'. Only that worker script gets it; a worker cannot touch the page.
        if(p0==='/files/cad/workers/libredwg-parser-worker.js')return secure(await env.ASSETS.fetch(new Request(target,request)),"default-src 'none'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; connect-src 'self'");
        return secure(await env.ASSETS.fetch(new Request(target,request)));
      }
      // Project logins (everyone except Brian's owner login and the original reader login) use the
      // project home and the areas the Access page gives them. They cannot reach the old site's own drawing store
      // (/api/drawings, /app/, /source/); their CAD tool is Drawings -> CAD workspace above (src/cad-workspace.mjs).
      if(actor.taskOnly){
        if(!['GET','HEAD'].includes(request.method))fail(403,'This account can view only.');
        const apiOK=['/api/me','/api/site/drawings','/api/health','/api/checks','/api/photos'].includes(p0)||p0.startsWith('/api/photos/');
        if((p0.startsWith('/api/')&&!apiOK)||/^\/(workspace|app|source|cad)(\/|$)/.test(p0))fail(404,'Not found.');
      }
      // No home page: "/" and the old home page go to the person's first page (Brian, 1 Nov 2026).
      if(['GET','HEAD'].includes(request.method)&&['/','/index.html','/project-home.html','/project-home'].includes(p0))return secure(new Response(null,{status:302,headers:{Location:landingPath(access)}}));
      if(actor.localRole==='reader'&&!['GET','HEAD'].includes(request.method))fail(403,'This account can view and download only.');
      const url=new URL(request.url);
      if(!['GET','HEAD'].includes(request.method)) {
        if(request.headers.get('origin')!==env.APP_ORIGIN || request.headers.get('x-cad-request')!=='1') fail(403,'This request must come from this application.');
        if(request.headers.get('sec-fetch-site') && request.headers.get('sec-fetch-site')!=='same-origin') fail(403,'Cross-site request refused.');
      }
      if(url.pathname.startsWith('/api/')) return secure(legacySiteAPI(request,env,actor,url)||await api(request,env,actor,url,access));
      if(!['GET','HEAD'].includes(request.method)) fail(405,'Method not allowed.');
      let assetPath;
      try { assetPath=decodeURIComponent(url.pathname).replace(/\/{2,}/g,'/'); }
      catch { fail(400,'Invalid asset path.'); }
      if((assetPath==='/app'||assetPath.startsWith('/app/')) && env.EDITOR_READY!=='true'&&env.VIEWER_READY!=='true') fail(503,'The CAD workspace is awaiting verification.');
      if(url.pathname.endsWith('/sw.js')) fail(404,'Offline caching is not enabled for this private application.');
      if(url.pathname==='/workspace')return secure(new Response(null,{status:308,headers:{Location:'/workspace/'+url.search}}));
      if(['/workspace/','/workspace/index.html','/','/index.html'].includes(url.pathname)){
        // Request the canonical asset URL; /index.html redirects to / on Workers Assets.
        const target=new URL(request.url);target.pathname='/';return secure(await env.ASSETS.fetch(new Request(target,request)));
      }
      const site=await serveSiteAsset(request,env,actor,url);if(site)return secure(site);
      const asset=software[url.pathname];
      if(asset){
        const object=await releaseObject(env.DRAWINGS,asset,{headOnly:request.method==='HEAD'});
        return secure(new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':asset.contentType,'Content-Length':String(asset.size),'ETag':`"${asset.sha256}"`}}));
      }
      return secure(await env.ASSETS.fetch(request));
    } catch(error) {
      const status=error instanceof HttpError || [401,403,503].includes(error.status) ? error.status : 500;
      const failedPath=new URL(request.url).pathname;
      if(status===401&&env.LOCAL_AUTH_ENABLED==='true'&&request.method==='GET'&&request.headers.get('accept')?.includes('text/html')&&!failedPath.startsWith('/api/')&&!failedPath.startsWith('/owner-recovery'))return secure(new Response(null,{status:302,headers:{Location:'/sign-in.html'}}));
      if(status===500) console.error(JSON.stringify({event:'request_failed',kind:error.name}));
      return secure(json({error:status===500?'The request could not be completed. Your existing revisions are unchanged.':error.message,...(error.details||{})},status));
    }
  };
  return async(request,env,ctx)=>{
    const response=await handle(request,env,ctx);
    // Site audit (10 Nov 2026): a sign-out counts only when a sign-in really ended. Before, anyone could send "sign out" without
    // being signed in, over and over, and each one made every live meeting page drop and reconnect.
    const changedPath=new URL(request.url).pathname,ended=response.headers.get('x-session-ended')==='1';
    if(response.headers.has('x-session-ended')){try{response.headers.delete('x-session-ended');}catch{}}
    if(!['GET','HEAD'].includes(request.method)&&response.status<300&&ACCESS_CHANGES.test(changedPath)&&(changedPath!=='/api/local-auth/logout'||ended))ctx?.waitUntil?.(reconnectMeetingRooms(env).catch(()=>{}));
    return cachePolicy(request,response);
  };
}
// Requests that can change who may see what: admin people / page levels / accounts, password and sign-out. After one
// succeeds, open live meeting pages reconnect so access is checked again at once (src/meetings.mjs).
const ACCESS_CHANGES=/^\/api\/(?:tasks\/admin\/|task-accounts\/|local-auth\/(?:logout|logout-all|change-password|admin\/|two-step))/;
// Weekly cron (production/wrangler.jsonc "triggers"): backup copy + 90-day sign-in cleanup. See src/backup.mjs.
// Daily cron at 06:00 Bangkok: repeating tasks (src/repeats.mjs). Other crons: the weekly backup.
// Site gate (brianinnsawan/site-gate) in front of everything: Thailand only, visits logged to site-stats as "calwwt",
// private stats page at /_stats (stats key). /api/agent stays open from abroad: Chief (Grok) calls it from overseas
// servers and it needs its own key anyway. If the gate itself fails, requests go straight to the portal.
const portal=createHandler();
const GATE={site:'calwwt',allowPaths:['/api/agent'],linkPreviews:false};
export default {fetch(request,env,ctx){return gate(request,env,ctx,GATE,(req)=>portal(req,env,ctx));},scheduled(controller,env,ctx){const at=new Date(controller.scheduledTime||Date.now());ctx.waitUntil(controller.cron===REPEAT_CRON?runScheduledRepeats(env,at):scheduledJob(env,at));}};
