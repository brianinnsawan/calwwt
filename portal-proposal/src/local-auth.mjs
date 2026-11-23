import {createIdentity} from './identity/identity.mjs';
import {authenticate} from './auth.mjs';
// Kept on the actor under symbols, so they are never part of what /api/me sends to the browser.
export const PERSON_ROW=Symbol.for('calnkt.personRow'),PASSWORD_EVENT=Symbol.for('calnkt.passwordEvent');
export const identity=createIdentity({appId:'portal',
 async resolveActor(env,id,role){
  // Task-only accounts (created by task-app admins) are bound to subject "task:<person>".
  // They are limited to the task pages by routeTasks() in tasks-portal.mjs.
  if(role==='reader'&&typeof id==='string'&&id.startsWith('task:')){
   if(env.TASKS_ENABLED!=='true'||!env.TASKS_DB)return null;
   // The person's row is kept on the actor (under a symbol, so it is never sent to the browser) for src/site-access.mjs,
   // which would otherwise read the same row again on every request (site audit, 10 Nov 2026).
   const person=await env.TASKS_DB.prepare('SELECT id, name, language, account_id FROM people WHERE id=? AND active=1').bind(id.slice(5)).first();
   return person?{id,taskOnly:true,localRole:'task',[PERSON_ROW]:person}:null;
  }
  const approved=role==='owner'?env.LOCAL_AUTH_OWNER_ID:env.LOCAL_AUTH_READER_ID;
  if(!approved||id!==approved||env.LOCAL_AUTH_OWNER_ID===env.LOCAL_AUTH_READER_ID)return null;
  const user=await env.DB.prepare('SELECT id,email FROM users WHERE id=?').bind(id).first();
  return user?{...user,localRole:role}:null;
 },
 async recoveryOwner(request,env){
  try{const actor=await authenticate(request,env);return env.LOCAL_AUTH_OWNER_ID&&actor.id===env.LOCAL_AUTH_OWNER_ID?actor:null}catch{return null}
 }
});
export async function portalIdentity(request,env,fallback){
 if(env.LOCAL_AUTH_ENABLED!=='true')return fallback(request,env);
 try{const session=await identity.session(request,env);if(session)return {...session.actor,localUsername:session.username,accountId:session.accountId,sessionCreatedAt:session.createdAt,sessionTwoStep:session.twoStep,sessionConfirmedAt:session.confirmedAt,[PASSWORD_EVENT]:session.passwordEvent};}catch{/* Existing verified owner recovery must not depend on AUTH_DB availability. */}
 // Preserve cryptographically verified existing Brian recovery; never email-link.
 let actor;
 try{actor=await fallback(request,env);}
 catch(error){
  // A copy without Cloudflare Access (e.g. staging) sends people to the sign-in page instead of an error.
  if(error?.status===503&&!env.ACCESS_AUD)throw Object.assign(new Error('Sign in with your project username.'),{status:401});
  throw error;
 }
 if(!env.LOCAL_AUTH_OWNER_ID||actor.id!==env.LOCAL_AUTH_OWNER_ID)throw Object.assign(new Error('Sign in with your project username.'),{status:401});
 return actor;
}
