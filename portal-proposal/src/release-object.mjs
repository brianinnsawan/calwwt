// SPDX-License-Identifier: GPL-3.0-only
import {HttpError} from './auth.mjs';
const unavailable=()=>{throw new HttpError(503,'The private release file could not be verified.');};
function metadata(object,asset){
  if(!object||object.size!==asset.size)unavailable();
  const declared=object.customMetadata?.sha256;
  if(declared!==undefined&&declared!==asset.sha256)unavailable();
  return declared===asset.sha256;
}
async function verifyStream(object,asset){
  if(!object.body||!object.version||typeof crypto.DigestStream!=='function')unavailable();
  const digest=new crypto.DigestStream('SHA-256');
  let count=0;
  const counted=new TransformStream({transform(chunk,controller){
    count+=chunk.byteLength;if(count>asset.size)unavailable();controller.enqueue(chunk);
  }});
  // Consume and verify before opening a second stream. Never tee private large
  // files into an unbounded buffer or deliver a range before checking its file.
  // Observe both rejections immediately when a malformed stream is aborted.
  let value;
  try{[,value]=await Promise.all([object.body.pipeThrough(counted).pipeTo(digest),digest.digest]);}
  catch{unavailable();}
  const actual=[...new Uint8Array(value)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(count!==asset.size||actual!==asset.sha256)unavailable();
}
export async function releaseObject(bucket,asset,{range,headOnly=false}={}){
  const first=headOnly?await bucket.head(asset.key):await bucket.get(asset.key,range?{range}:undefined);
  if(metadata(first,asset))return first;
  if(range)await first.body?.cancel();
  const full=headOnly||range?await bucket.get(asset.key):first;
  metadata(full,asset);await verifyStream(full,asset);
  if(headOnly)return full;
  const verified=await bucket.get(asset.key,{...(range?{range}:{}),onlyIf:{etagMatches:full.etag}});
  metadata(verified,asset);
  // R2 assigns a new version on every upload. Detect replacement even if the
  // byte count or ETag is reused between hashing and the final range/full read.
  if(!verified.body||verified.version!==full.version){await verified.body?.cancel();unavailable();}
  return verified;
}
