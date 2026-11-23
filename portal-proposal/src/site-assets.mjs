// SPDX-License-Identifier: GPL-3.0-only
import release from './site-release.mjs';
import {HttpError,hash} from './auth.mjs';
import {releaseObject} from './release-object.mjs';
import {cachedAccess} from './site-access.mjs';
const aliases={'/':'/index.html','/site.html':'/index.html','/pour-plan/':'/pour-plan/index.html','/site-library/':'/site-library/index.html'};
const legacyCADPages=new Set(['/cad','/cad/','/cad/index','/cad/index.html','/cad/index.htm']);
const namespaces=new Set(['cad','pour-plan','models','sheets','drawings','pdfjs','assets','source-originals','site-library']);
const deny=(status,message)=>{throw new HttpError(status,message);};
function pathname(url) {
  let value;try{value=decodeURIComponent(url.pathname);}catch{deny(400,'Invalid asset path.');}
  if(/[\x00-\x1f\x7f\\]/.test(value)||value.split('/').some(part=>part==='.'||part==='..'))deny(400,'Invalid asset path.');
  return value.replace(/\/{2,}/g,'/');
}
export function isSiteViewer(env,actor,manifest=release) {
  // Project logins (task people) see the drawings when the Access page gives them the Drawings area.
  if(actor?.taskOnly||cachedAccess(actor)?.viewAs)return !!cachedAccess(actor)?.areas.has('drawings');
  if(actor.localRole==='reader'&&env.LOCAL_AUTH_READER_ID&&actor.id===env.LOCAL_AUTH_READER_ID)return true;
  if(!manifest.ownerEmail)return false;
  return actor.email===manifest.ownerEmail || new Set((env.SITE_VIEWER_EMAILS||'').split(',').map(email=>email.trim().toLowerCase()).filter(Boolean)).has(actor.email);
}
export function requireSiteViewer(env,actor,manifest=release) {
  if(!isSiteViewer(env,actor,manifest))deny(404,'Not found.');
  if(env.SITE_READY!=='true')deny(503,'The private site migration is awaiting verification.');
}
export function siteDrawings(env,actor,manifest=release){
  requireSiteViewer(env,actor,manifest);
  return Object.entries(manifest.drawings||{}).map(([sourcePath,metadata])=>{
    const asset=manifest.assets[sourcePath];
    if(!asset||!sourcePath.endsWith('.dwg'))return null;
    return {sourcePath,filename:asset.downloadName||sourcePath.split('/').pop(),size:asset.size,sha256:asset.sha256,...metadata};
  }).filter(Boolean).sort((a,b)=>a.group.localeCompare(b.group)||a.filename.localeCompare(b.filename));
}
export function legacySiteAPI(request,env,actor,url,manifest=release) {
  if(!['/api/health','/api/checks','/api/photos'].includes(url.pathname)&&!url.pathname.startsWith('/api/photos/'))return null;
  requireSiteViewer(env,actor,manifest);
  if(url.pathname==='/api/health'&&request.method==='GET')return Response.json({db:false,photos:false,crew:false,mode:'tab',storageScope:'tab-memory'});
  return Response.json({error:'Cloud field-check sync was not configured in the original site. Checks stay in this tab only and are cleared when you leave.'},{status:503});
}
export async function originalDrawing(env,actor,path,manifest=release) {
  requireSiteViewer(env,actor,manifest);
  if(typeof path!=='string'||!Object.hasOwn(manifest.drawings||{},path)||!Object.hasOwn(manifest.assets,path))deny(404,'Original drawing not found.');
  const asset=manifest.assets[path],metadata=manifest.drawings[path];
  if(!path.endsWith('.dwg')||asset.size>25*1024*1024)deny(413,'This original cannot be imported through the initial DWG upload limit.');
  const object=await env.DRAWINGS.get(asset.key);
  if(!object||object.size!==asset.size||object.customMetadata?.sha256!==asset.sha256)deny(503,'The original drawing could not be verified.');
  const bytes=new Uint8Array(await new Response(object.body).arrayBuffer());
  if(bytes.length!==asset.size||await hash(bytes)!==asset.sha256)deny(503,'The original drawing hash does not match.');
  return {bytes,filename:asset.downloadName,sha256:asset.sha256,metadata};
}
function rangeFor(request,size,etag) {
  const range=request.headers.get('range');if(!range)return null;
  if(request.headers.has('if-range')&&request.headers.get('if-range')!==etag)return null;
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2]))return false;
  let start,end;
  if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return false;start=Math.max(0,size-suffix);end=size-1;}
  else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start||start>=size)return false;end=Math.min(end,size-1);}
  return {offset:start,length:end-start+1};
}
export async function serveSiteAsset(request,env,actor,url,manifest=release) {
  const path=pathname(url),target=aliases[path]||path;
  if(legacyCADPages.has(path)){
    requireSiteViewer(env,actor,manifest);
    const query=new URLSearchParams(url.search);query.set('view','site');
    // Preserve old ?dwg=<catalog id> bookmarks. The workspace resolves them
    // against the authenticated catalog, never against an arbitrary file URL.
    return new Response(null,{status:302,headers:{Location:'/workspace/?'+query.toString()}});
  }
  const asset=manifest.assets[target];
  if(['/pour-plan','/site-library'].includes(path)){
    requireSiteViewer(env,actor,manifest);return new Response(null,{status:308,headers:{Location:path+'/'+url.search}});
  }
  if(!asset){
    if(namespaces.has(path.split('/')[1]))deny(404,'Site asset not found.');
    return null;
  }
  requireSiteViewer(env,actor,manifest);
  const etag=`"${asset.sha256}"`,range=request.method==='HEAD'?null:rangeFor(request,asset.size,etag);
  if(range===false)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${asset.size}`,'Accept-Ranges':'bytes'}});
  const object=await releaseObject(env.DRAWINGS,asset,{range,headOnly:request.method==='HEAD'});
  const headers={'Content-Type':asset.contentType,'Content-Length':String(range?range.length:asset.size),'Accept-Ranges':'bytes','ETag':etag,'X-Content-SHA256':asset.sha256};
  if(range)headers['Content-Range']=`bytes ${range.offset}-${range.offset+range.length-1}/${asset.size}`;
  if(asset.downloadName)headers['Content-Disposition']=`${asset.contentType==='application/pdf'?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(asset.downloadName)}`;
  return new Response(request.method==='HEAD'?null:object.body,{status:range?206:200,headers});
}
