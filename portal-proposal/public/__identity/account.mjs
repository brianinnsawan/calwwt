const status=document.getElementById('status'),code=document.getElementById('code');
const recovering=location.pathname.startsWith('/owner-recovery/');
if(recovering){document.getElementById('logout-all').hidden=true;document.getElementById('identity').textContent='กู้คืนบัญชีเจ้าของ / Verified owner recovery';}
async function call(route,body){const r=await fetch((recovering?'/owner-recovery':'')+'/api/local-auth/'+route,{method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',headers:{'content-type':'application/json','x-project-auth':'1'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Unavailable');return data}
try{if(!recovering){const session=await call('session');document.getElementById('identity').textContent=session.user?.username||'ยังไม่ได้เข้าสู่ระบบ / Not signed in';if(session.user)document.getElementById('change').hidden=false;}try{if(!recovering&&(await call('session')).user?.role!=='owner')throw 0;/* owner controls: owner (or verified recovery) only */const {accounts}=await call('admin/accounts');const list=document.getElementById('accounts');for(const a of accounts.filter(a=>a.active&&(recovering||a.role!=='owner'))){const option=document.createElement('option');option.value=a.id;option.textContent=a.username;list.append(option)}document.getElementById('owner').hidden=false;document.getElementById('issue').disabled=!list.options.length}catch{/* Reader has no administrative controls. */}}catch(e){status.textContent=e.message}
document.getElementById('issue').onclick=async()=>{code.textContent='';if(!confirm('This immediately invalidates this person’s password and sessions. Issue a one-time reset/setup code?'))return;try{const result=await call('admin/ticket',{accountId:document.getElementById('accounts').value});code.textContent=result.code;status.textContent='ใช้ได้ครั้งเดียวภายใน 15 นาที / Valid once for 15 minutes.';setTimeout(()=>{code.textContent=''},15*60*1000)}catch(e){status.textContent=e.message}};
document.getElementById('logout-all').onclick=async()=>{try{await call('logout-all',{});location.assign('/sign-in.html')}catch(e){status.textContent=e.message}};
window.addEventListener('pagehide',()=>{code.textContent=''});

// Change your own password (current password required). Other devices are signed out; this one stays signed in.
const change=document.getElementById('change');
change.onsubmit=async(e)=>{e.preventDefault();const v=Object.fromEntries(new FormData(change));status.textContent='';
 if(v.password!==v.confirm){status.textContent='รหัสผ่านใหม่ไม่ตรงกัน / The new passwords do not match.';return}
 const b=change.querySelector('button');b.disabled=true;
 try{await call('change-password',{current:v.current,password:v.password});status.textContent='เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นออกจากระบบแล้ว / Password changed. Other devices were signed out.'}
 catch(err){status.textContent=err.message}finally{b.disabled=false;change.querySelectorAll('input').forEach((i)=>{i.value=''})}};
window.addEventListener('pagehide',()=>change.reset());

// Audit F02: arriving here with ?change=1 means the password was set by an admin and must be changed first.
if(new URLSearchParams(location.search).get('change')==='1'){
 const note=document.createElement('p');note.className='must-change';note.setAttribute('role','alert');
 note.textContent='กรุณาตั้งรหัสผ่านของคุณเองก่อนใช้งานเว็บไซต์ (รหัสผ่านที่ได้รับเป็นรหัสชั่วคราว) · Please choose your own password before using the site (the one you were given is temporary).';
 const form=document.getElementById('change');form.before(note);form.hidden=false;form.querySelector('input').focus();
 form.addEventListener('submit',()=>{const done=()=>{if(/Password changed/.test(status.textContent)){note.textContent='เปลี่ยนรหัสผ่านแล้ว กำลังไปหน้าแรก… · Password changed. Taking you to the site…';setTimeout(()=>location.assign('/'),1200);}};setTimeout(done,1500);});
}

// 2-step sign-in (audit N04): set up with the password, scan the QR code, enter the first code; recovery codes shown once.
const ts={box:document.getElementById('two-step'),state:document.getElementById('ts-state'),start:document.getElementById('ts-start'),enable:document.getElementById('ts-enable'),codes:document.getElementById('ts-codes'),off:document.getElementById('ts-off'),disable:document.getElementById('ts-disable')};
async function twoStepState(){
 if(recovering)return;let st;try{st=await call('two-step')}catch{return}
 ts.box.hidden=false;ts.enable.hidden=true;ts.start.hidden=st.enabled;ts.off.hidden=!st.enabled;
 ts.state.textContent=st.enabled?`เปิดใช้อยู่ · เหลือรหัสกู้คืน ${st.recoveryLeft} รหัส / On · ${st.recoveryLeft} recovery codes left`:'ยังไม่ได้เปิดใช้ / Off';
 if(st.enabled&&!st.thisSignIn)ts.state.textContent+=' · ออกจากระบบแล้วเข้าใหม่ด้วยรหัส 6 หลัก เพื่อใช้สิทธิ์ผู้ดูแล / Sign out and in again with the code to use admin changes.';
 if(location.hash==='#two-step')ts.box.scrollIntoView({block:'start'});
}
ts.start.onsubmit=async(e)=>{e.preventDefault();status.textContent='';const b=ts.start.querySelector('button');b.disabled=true;
 try{const r=await call('two-step/start',{password:new FormData(ts.start).get('password')});
  const {qrSvg}=await import('/__identity/vendor/qr.mjs');const box=document.getElementById('ts-qr');box.replaceChildren(qrSvg(r.uri,5));
  document.getElementById('ts-secret').textContent=r.secret.replace(/(.{4})/g,'$1 ').trim();ts.start.hidden=true;ts.enable.hidden=false;ts.enable.querySelector('input').focus()}
 catch(err){status.textContent=err.message}finally{b.disabled=false;ts.start.reset()}};
ts.enable.onsubmit=async(e)=>{e.preventDefault();status.textContent='';const b=ts.enable.querySelector('button');b.disabled=true;
 try{const r=await call('two-step/enable',{code:new FormData(ts.enable).get('code')});
  ts.enable.hidden=true;document.getElementById('ts-qr').replaceChildren();document.getElementById('ts-secret').textContent='';
  document.getElementById('ts-code-list').textContent=r.recoveryCodes.join('\n');ts.codes.hidden=false;
  status.textContent='เปิดใช้การยืนยัน 2 ขั้นตอนแล้ว อุปกรณ์อื่นออกจากระบบแล้ว / 2-step sign-in is on. Other devices were signed out.';await twoStepState()}
 catch(err){status.textContent=err.message}finally{b.disabled=false;ts.enable.reset()}};
ts.disable.onsubmit=async(e)=>{e.preventDefault();status.textContent='';if(!confirm('ปิดการยืนยัน 2 ขั้นตอน? / Turn off 2-step sign-in?'))return;const v=Object.fromEntries(new FormData(ts.disable));
 try{await call('two-step/disable',{password:v.password,code:v.code});ts.codes.hidden=true;status.textContent='ปิดแล้ว / 2-step sign-in is off.';ts.off.open=false;await twoStepState()}
 catch(err){status.textContent=err.message}finally{ts.disable.reset()}};
window.addEventListener('pagehide',()=>{document.getElementById('ts-code-list').textContent='';document.getElementById('ts-secret').textContent='';document.getElementById('ts-qr').replaceChildren()});
twoStepState();
