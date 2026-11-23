import {scrypt,randomBytes,timingSafeEqual} from 'node:crypto';
// OWASP equivalent scrypt profile: 16 MiB, r=8, p=5. Target Worker benchmark required.
const N=16384,r=8,p=5;
const derive=(password,salt)=>new Promise((resolve,reject)=>scrypt(password,salt,32,{N,r,p,maxmem:32*1024*1024},(error,key)=>error?reject(error):resolve(key)));
export function validPassword(password){return typeof password==='string'&&[...password].length>=15&&[...password].length<=128&&Buffer.byteLength(password,'utf8')<=512}
export async function passwordHash(password){if(!validPassword(password))throw new Error('Use a password of 15–128 characters.');const salt=randomBytes(16);const key=await derive(password,salt);return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`}
export async function verifyPassword(password,encoded){const parts=String(encoded||'').split('$');const valid=parts.length===6&&parts[0]==='scrypt'&&parts[1]===String(N)&&parts[2]===String(r)&&parts[3]===String(p)&&/^[a-f0-9]{32}$/.test(parts[4])&&/^[a-f0-9]{64}$/.test(parts[5]);const salt=valid?Buffer.from(parts[4],'hex'):Buffer.alloc(16);const bounded=validPassword(password)?password:'invalid password input';const key=await derive(bounded,salt);return valid&&validPassword(password)&&timingSafeEqual(key,Buffer.from(parts[5],'hex'))}
