// SPDX-License-Identifier: GPL-3.0-only
import {installPrivacy,onPrivateClear,privateSessionEnded,showPrivacyError} from './privacy.mjs';
function siteNavigation(actor){
 const destinations=new Set();
 for(const link of document.querySelectorAll('a[href]')){
  const url=new URL(link.getAttribute('href'),location.href);
  if(url.origin!==location.origin)continue;
  if(url.pathname==='/')url.pathname='/site.html';
  if(['/cad','/cad/','/cad/index','/cad/index.html','/cad/index.htm'].includes(url.pathname)){
   url.pathname='/workspace/';url.searchParams.set('view','site');
   link.setAttribute('aria-label','Drawing workspace');
   if(link.textContent.trim()==='Original CAD viewer')link.textContent='Drawing workspace';
  }
  if(url.pathname==='/workspace/'&&url.searchParams.has('source')&&link.textContent.trim()==='Create editable copy')link.textContent='Open in CAD';
  link.setAttribute('href',url.pathname+url.search+url.hash);destinations.add(url.pathname);
 }
 const host=document.querySelector('.header-actions')||document.querySelector('header');
 if(host && document.body.dataset.projectPortal !== 'true'){
  const nav=document.createElement('nav');nav.className='workspace-links';nav.setAttribute('aria-label','Site navigation');
  for(const [label,href] of [['หน้าหลัก / Home','/project-home.html'],['Site model','/site.html'],['Drawing workspace','/workspace/?view=site'],['Files & PDFs','/site-library/'],[actor?.localRole?'บัญชี / Account':'Sign out',actor?.localRole?'/account.html':'/cdn-cgi/access/logout']]){
   const path=new URL(href,location.href).pathname;
   if(path==='/workspace/'&&!actor?.workspaceReady)continue;
   if(path===new URL(location.href).pathname||destinations.has(path))continue;
   const link=document.createElement('a');link.textContent=label;link.href=href;nav.append(link);
  }
  host.append(nav);
 }
}
export async function start({portal=false}={}){
 if(globalThis.CAD_SITE_IDENTITY)return globalThis.CAD_SITE_IDENTITY;
 const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
 if(!response.ok)throw new Error('Sign in again to open the private site.');
 // The project home opens for every project login; the site model needs the Drawings area.
 const actor=await response.json();if(typeof actor.id!=='string'||!actor.id||(!portal&&!actor.siteReady))throw new Error('This private site is not available for this identity.');
 await installPrivacy();
 siteNavigation(actor);
 const prefix=`cad-v2:site:${encodeURIComponent(actor.id)}:`,memory=new Map(),fonts=new Map();
 const safe=(key,value)=>key==='nti-lang'&&['en','th'].includes(value);
 const methods={
  getItem(key){key=String(key);if(privateSessionEnded())return null;let saved=null;try{saved=localStorage.getItem(prefix+key);}catch{}return safe(key,saved)?saved:memory.get(key)??null;},
  setItem(key,value){if(privateSessionEnded())return;key=String(key);value=String(value);memory.set(key,value);if(safe(key,value)){try{localStorage.setItem(prefix+key,value);}catch{}}},
  removeItem(key){memory.delete(String(key));if(key==='nti-lang'){try{localStorage.removeItem(prefix+key);}catch{}}},
  clear(){memory.clear();},key(index){return [...memory.keys()][index]??null;}
 };
 const scoped=new Proxy(methods,{get:(target,key)=>key==='length'?memory.size:Object.hasOwn(target,key)?target[key]:methods.getItem(key),set:(_target,key,value)=>{methods.setItem(key,value);return true;}});
 Object.defineProperty(globalThis,'CAD_SITE_STORAGE',{value:scoped});
 Object.defineProperty(globalThis,'CAD_SITE_INDEXED_DB',{value:{open(){throw new Error('Persistent CAD caches are disabled.');},deleteDatabase:async()=>{fonts.clear();}}});
 const cache={async put(_store,value){if(!privateSessionEnded())fonts.set(value.name,structuredClone(value));},async get(_store,key){return fonts.has(key)?structuredClone(fonts.get(key)):undefined;},async getAll(){return [...fonts.values()].map(value=>structuredClone(value));},async delete(_store,key){fonts.delete(key);},async clear(){fonts.clear();},close(){fonts.clear();}};
 Object.defineProperty(globalThis,'CAD_SITE_FONT_CACHE',{value:cache});
 Object.defineProperty(globalThis,'CAD_SITE_IDENTITY',{value:Object.freeze({id:actor.id,email:actor.email})});
 onPrivateClear(()=>{memory.clear();fonts.clear();});
 const path=new URL(location.href).pathname;if(['/', '/index.html','/site.html'].includes(path)||path.startsWith('/pour-plan/')){const notice=document.createElement('p');notice.className='version2-session-notice';notice.textContent=methods.getItem('nti-lang')==='th'?'ข้อมูลการตรวจและแผนเทอยู่ในแท็บนี้เท่านั้น โปรดส่งออกแผนก่อนปิดแท็บ':'Temporary tab: use Checks + photos to download and verify inspections. Export pour plans before leaving.';document.body.append(notice);}
 const css=document.createElement('link');css.rel='stylesheet';css.href='/__site/navigation.css';document.head.append(css);
 // The project home also needs the person's areas (which cards to show).
 return portal?Object.freeze({...actor}):globalThis.CAD_SITE_IDENTITY;
}
export async function loadScript(path){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path;script.onload=resolve;script.onerror=()=>reject(new Error('Could not load '+path));document.body.append(script);});}
export function showError(error){return showPrivacyError(error);}
