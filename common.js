// Gathr shared helpers: synced store (textdb.dev, no account), compression, access gate
const GSTORE='https://textdb.dev/api/data/';
const OWNER_GID='gathr-zk-m7Qx2pLk-v1';
const _qs=new URLSearchParams(location.search);
const PREV_GID=localStorage.getItem('gathr_gid')||'';
function validGid(s){return !!s&&/^[A-Za-z0-9_-]{6,80}$/.test(s)}
function validMt(s){return !!s&&/^[A-Za-z0-9_-]{20,80}$/.test(s)}
function guestEncode(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let bin='';for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function guestDecode(s){if(!s||s.length>1800||!/^[A-Za-z0-9_-]+$/.test(s))return null;try{let b=s.replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';const bin=atob(b);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const o=JSON.parse(new TextDecoder().decode(bytes));if(!o||typeof o!=='object'||Array.isArray(o))return null;const out={};if(typeof o.p==='string'&&o.p.trim())out.p=o.p.trim().slice(0,80);if(typeof o.a==='string'&&o.a.trim())out.a=o.a.trim().slice(0,120);if(typeof o.d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(o.d))out.d=o.d;if(typeof o.t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(o.t))out.t=o.t;if(Array.isArray(o.f)){const f=o.f.map(x=>typeof x==='string'?x.trim().slice(0,40):'').filter(Boolean).slice(0,12);if(f.length)out.f=f}return out}catch(e){return null}}
function readGuestMode(){const raw=(location.hash||'').replace(/^#/,'');if(!raw.startsWith('guest='))return null;const s=raw.slice(6);if(!s)return {bad:1};return guestDecode(s)||{bad:1}}
// A guest link is only the fragment. It does not open a group or the access gate.
const GUEST=readGuestMode();
// ?invite=app opens the app in no group, even if this phone already belongs to one.
const INVITE_APP=!GUEST&&(_qs.get('invite')||'')==='app';
const JOIN_ID=!GUEST&&!INVITE_APP&&validGid(_qs.get('join')||'')?_qs.get('join'):'';
const _qg=!GUEST&&!INVITE_APP&&validGid(_qs.get('g')||'')?_qs.get('g'):'';
const MEMBER_TOKEN=!GUEST&&!INVITE_APP&&validMt(_qs.get('m')||'')?_qs.get('m'):'';
// An unknown ?g= is ignored. It must not load a group this phone does not already belong to.
// A home-screen launch is the exception: ?g= plus a member token. The token is checked
// against the group after it loads, and a bad token never adds a person.
const QUERY_G=_qg&&groupList().some(g=>g.id===_qg)?_qg:'';
const HOME_G=_qg&&MEMBER_TOKEN&&!QUERY_G?_qg:'';
const SAVED=!GUEST&&!INVITE_APP&&validGid(PREV_GID)?PREV_GID:'';
const GID=GUEST?'':(JOIN_ID||HOME_G||QUERY_G||SAVED||'');
if(!GUEST&&GID&&!HOME_G&&!JOIN_ID&&!INVITE_APP)localStorage.gathr_gid=GID;
const GURL=GID?GSTORE+encodeURIComponent(GID):'';
let groupName='';
function appPath(){let path=location.pathname;if(path.endsWith('/index.html'))path=path.slice(0,-'index.html'.length);else if(!path.endsWith('/'))path+='/';return new URL(path,location.origin)}
function newGroupId(){const b=new Uint8Array(16);if(crypto&&crypto.getRandomValues)crypto.getRandomValues(b);else for(let i=0;i<b.length;i++)b[i]=Math.floor(Math.random()*256);let o='';b.forEach(x=>o+=x.toString(16).padStart(2,'0'));return 'gathr-'+o}
function groupList(){try{const a=JSON.parse(localStorage.gathr_groups||'[]');return Array.isArray(a)?a.filter(x=>x&&validGid(x.id)):[]}catch(e){return []}}
function saveGroupList(a){try{localStorage.gathr_groups=JSON.stringify((a||[]).slice(0,30))}catch(e){}}
function rememberGroup(id,name,host){if(!validGid(id))return;const nm=String(name||'Our Gathering').slice(0,60);const cur=groupList();const i=cur.findIndex(x=>x.id===id);const prev=i>=0?cur[i]:null;const hn=host===undefined?(prev&&prev.host?String(prev.host).slice(0,40):''):String(host||'').slice(0,40);if(prev&&prev.name===nm&&String(prev.host||'')===hn)return;const row={id,name:nm};if(hn)row.host=hn;if(i>=0)cur[i]=row;else cur.unshift(row);saveGroupList(cur)}
function forgetGroup(id){if(!validGid(id))return;saveGroupList(groupList().filter(g=>g.id!==id));try{const docs=readDocs();if(Object.prototype.hasOwnProperty.call(docs,id)){delete docs[id];localStorage.gathr_docs=JSON.stringify(docs)}}catch(e){}if(localStorage.getItem('gathr_gid')===id)localStorage.removeItem('gathr_gid');if(localStorage.getItem('gathr_doc_gid')===id){localStorage.removeItem('gathr_doc_gid');localStorage.removeItem('gathr_doc')}}
function migrateGroups(){if(groupList().length||!validGid(PREV_GID))return;rememberGroup(PREV_GID,'Our Gathering')}
migrateGroups();
function readDocs(){try{const o=JSON.parse(localStorage.gathr_docs||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch(e){return {}}}
function localDoc(){if(!GID)return {};const docs=readDocs();if(Object.prototype.hasOwnProperty.call(docs,GID))return docs[GID]||{};const legacyGid=localStorage.getItem('gathr_doc_gid')||PREV_GID;if(GID===legacyGid){try{return JSON.parse(localStorage.gathr_doc||'{}')||{}}catch(e){return {}}}return {}}
function saveLocalDoc(d){if(!GID)return;try{const docs=readDocs();docs[GID]=d;const keep=new Set(groupList().map(g=>g.id).concat(GID));const ids=Object.keys(docs);if(ids.length>30){for(const id of ids)if(!keep.has(id))delete docs[id]}localStorage.gathr_docs=JSON.stringify(docs)}catch(e){}try{localStorage.gathr_doc=JSON.stringify(d);localStorage.gathr_doc_gid=GID}catch(e){}}
async function gz(s){const b=await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();let o='';new Uint8Array(b).forEach(c=>o+=String.fromCharCode(c));return 'gz:'+btoa(o)}
async function ungz(s){if(!s||!s.startsWith('gz:'))return s?JSON.parse(s):null;const u=Uint8Array.from(atob(s.slice(3)),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
async function storeGet(){if(!GURL)return {};const r=await fetch(GURL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('get '+r.status);const t=(await r.text()).trim();try{return await ungz(t)||{}}catch(e){return {}}}
async function storePut(doc){if(!GURL)return;const r=await fetch(GURL,{method:'POST',headers:{'content-type':'text/plain'},body:await gz(JSON.stringify(doc))});if(!r.ok)throw Error('put '+r.status)}
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s.trim()));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
// App-wide gate. Hash only is stored. The owner group's code list is the source of truth.
const SEED_ACC={codes:[{id:'c1',label:'Launch code',h:'3410a1824bd11c0b091f80e19067e975afd0a1a05d031f644067cea752b0a3c1',at:Date.parse('2026-10-22')}]};
function activeHashes(acc){return ((acc||SEED_ACC).codes||[]).map(c=>c.h)}
function readAppAcc(){try{const o=JSON.parse(localStorage.gathr_app_acc||'');if(o&&Array.isArray(o.codes)&&o.codes.length)return o}catch(e){}return JSON.parse(JSON.stringify(SEED_ACC))}
function saveAppAcc(acc){try{if(acc&&Array.isArray(acc.codes)&&acc.codes.length)localStorage.gathr_app_acc=JSON.stringify(acc)}catch(e){}}
// Gate: shows overlay until a valid code is entered. getAcc() returns current ACC object.
function gateCheck(getAcc,onOpen){const h=localStorage.gathr_code_h;let g=document.getElementById('gate');
 if(h&&activeHashes(getAcc()).includes(h)){if(g)g.remove();document.documentElement.classList.remove('locked');onOpen&&onOpen();return true}
 const msg=h?'Access denied: this code is no longer active':'';if(h)localStorage.removeItem('gathr_code_h');
 document.documentElement.classList.add('locked');
 if(!g){g=document.createElement('div');g.id='gate';const gateLead=INVITE_APP?'Enter the access code to open Gathr. Then you can start your own group.':(JOIN_ID?'Enter the access code to open Gathr. Then you can ask to join this group.':(HOME_G?'Enter the access code to open Gathr. Then this opens your group.':'Enter the access code to open Gathr.'));g.innerHTML=`<div class="gin"><div style="font-size:44px">🏡</div><h2>Gathr</h2><p>${gateLead}</p><input id="gcode" autocomplete="off" autocapitalize="off" placeholder="Access code"><button id="gbtn">Unlock</button><div id="gmsg"></div></div>`;document.body.appendChild(g);
  const go=async()=>{const v=document.getElementById('gcode').value;const hv=await sha(v);if(activeHashes(getAcc()).includes(hv)){localStorage.gathr_code_h=hv;gateCheck(getAcc,onOpen)}else{document.getElementById('gmsg').textContent='Access denied'}};
  g.querySelector('#gbtn').onclick=go;g.querySelector('#gcode').onkeydown=e=>{if(e.key=='Enter')go()}}
 document.getElementById('gmsg').textContent=msg;return false}
const GATE_CSS=`html.locked body>*:not(#gate){visibility:hidden}html.sealed .app{visibility:hidden}html.sealed #toast{visibility:visible}#gate{position:fixed;top:0;left:0;right:0;bottom:var(--kb,0px);z-index:100;background:#FAF7F2;display:flex;align-items:safe center;justify-content:center;overflow:auto;box-sizing:border-box;padding:calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));font-family:Inter,system-ui,sans-serif;color:#243438}#gate .gin{max-width:340px;width:100%;text-align:center;background:#E4EDE5;border-radius:24px;padding:28px 22px;box-sizing:border-box}#gate h2{font:700 32px Fraunces,Georgia,serif;margin:6px 0}#gate p{color:#596B70;font-size:15px}#gate input{width:100%;box-sizing:border-box;padding:14px;border-radius:14px;border:1px solid #D6DEDB;font:600 17px Inter,sans-serif;text-align:center;margin:10px 0}#gate button{width:100%;padding:14px;border:none;border-radius:14px;background:#165D63;color:#fff;font:700 16px Inter,sans-serif}#gmsg{color:#b3261e;font-weight:600;min-height:22px;margin-top:12px}#gate small{color:#596B70}html.kb #gate,html.kb #namegate,html.kb #joinreq{padding-bottom:24px !important}`;
document.head.insertAdjacentHTML('beforeend','<style>'+GATE_CSS+'</style>');if(!GUEST)document.documentElement.classList.add('locked');
function unseal(){document.documentElement.classList.remove('sealed')}
if(!GUEST&&GID)document.documentElement.classList.add('sealed');
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
let fullH=window.innerHeight;
function syncKb(){
 const vv=window.visualViewport,ih=window.innerHeight;
 if(ih>fullH)fullH=ih;
 const overlay=vv?Math.max(0,Math.round(ih-vv.height-vv.offsetTop)):0;
 const ae=document.activeElement;
 const focused=!!(ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName));
 const on=overlay>80||(focused&&fullH-ih>120);
 document.documentElement.style.setProperty('--kb',(overlay>80?overlay:0)+'px');
 document.documentElement.classList.toggle('kb',on);
 const nav=document.getElementById('nav');
 if(nav&&!on&&nav.offsetHeight)document.documentElement.style.setProperty('--nav-h',nav.offsetHeight+'px');
}
addEventListener('resize',syncKb);
if(window.visualViewport){visualViewport.addEventListener('resize',syncKb);visualViewport.addEventListener('scroll',syncKb)}
document.addEventListener('focusin',e=>{const t=e.target;if(!t||!/^(INPUT|TEXTAREA)$/.test(t.tagName))return;syncKb();if(t.closest('#comp,.pf'))return;setTimeout(()=>{try{t.scrollIntoView({block:'nearest',inline:'nearest'})}catch(err){}},80)});
document.addEventListener('focusout',()=>setTimeout(syncKb,30));
syncKb();
