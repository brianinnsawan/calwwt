let lang='th';const login=document.getElementById('login'),setup=document.getElementById('setup'),status=document.getElementById('status');
const message=(th,en)=>status.textContent=lang==='th'?th:en;
document.getElementById('language').onclick=()=>{lang=lang==='th'?'en':'th';document.documentElement.lang=lang;document.querySelectorAll('[data-th]').forEach(e=>e.textContent=e.dataset[lang]);document.getElementById('language').textContent=lang==='th'?'English':'ไทย'};
function mode(isSetup){login.hidden=isSetup;setup.hidden=!isSetup;status.textContent='';login.reset();setup.reset();(isSetup?setup:login).querySelector('input').focus()}
document.getElementById('login-mode').onclick=()=>mode(false);document.getElementById('setup-mode').onclick=()=>mode(true);
async function send(route,body){const response=await fetch('/api/local-auth/'+route,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Project-Auth':'1'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Sign-in unavailable.');return result}
for(const [form,route] of [[login,'login'],[setup,'redeem']])form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));if(route==='redeem'&&values.password!==values.confirm)return message('รหัสผ่านไม่ตรงกัน','Passwords do not match.');delete values.confirm;const button=form.querySelector('[type=submit]');button.disabled=true;try{await send(route,values);form.reset();if(route==='redeem'){mode(false);message('ตั้งรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้','Password set. Sign in with your username.')}else{
 // Fixed same-origin target, never a caller-controlled redirect or setup-code URL.
 location.assign(document.body.dataset.application==='scurve'?'/?project=219cbbd4-99fe-4e78-b6a0-d36bfe346fba':'/project-home.html');
 }}catch(error){status.textContent=error.message;form.querySelectorAll('[type=password]').forEach(e=>e.value='')}finally{button.disabled=false}};
document.getElementById('logout').onclick=async()=>{try{await send('logout',{});mode(false);message('ออกจากระบบแล้ว','Signed out.')}catch(error){status.textContent=error.message}};
// Never persist usernames, passwords or setup codes. Clear sensitive form values on exit.
window.addEventListener('pagehide',()=>{login.reset();setup.reset()});
