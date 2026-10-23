// Gathr shared helpers: synced store (textdb.dev, no account), compression, access gate
const GSTORE='https://textdb.dev/api/data/';
const OWNER_GID='gathr-zk-m7Qx2pLk-v1';
const _qs=new URLSearchParams(location.search);
const PREV_GID=localStorage.getItem('gathr_gid')||'';
function validGid(s){return !!s&&/^[A-Za-z0-9_-]{6,80}$/.test(s)}
const JOIN_ID=validGid(_qs.get('join')||'')?_qs.get('join'):'';
const QUERY_G=validGid(_qs.get('g')||'')?_qs.get('g'):'';
// Saved group stays the default. A phone with no saved group is not attached to the owner's group.
const GID=JOIN_ID||QUERY_G||(validGid(PREV_GID)?PREV_GID:'');
if(GID&&!JOIN_ID)localStorage.gathr_gid=GID;
const GURL=GID?GSTORE+encodeURIComponent(GID):'';
let groupName='';
function appPath(){let path=location.pathname;if(path.endsWith('/index.html'))path=path.slice(0,-'index.html'.length);else if(!path.endsWith('/'))path+='/';return new URL(path,location.origin)}
function newGroupId(){const b=new Uint8Array(16);if(crypto&&crypto.getRandomValues)crypto.getRandomValues(b);else for(let i=0;i<b.length;i++)b[i]=Math.floor(Math.random()*256);let o='';b.forEach(x=>o+=x.toString(16).padStart(2,'0'));return 'gathr-'+o}
function groupList(){try{const a=JSON.parse(localStorage.gathr_groups||'[]');return Array.isArray(a)?a.filter(x=>x&&validGid(x.id)):[]}catch(e){return []}}
function saveGroupList(a){try{localStorage.gathr_groups=JSON.stringify((a||[]).slice(0,30))}catch(e){}}
function rememberGroup(id,name){if(!validGid(id))return;const nm=String(name||'Our Gathering').slice(0,60);const cur=groupList();const i=cur.findIndex(x=>x.id===id);if(i>=0&&cur[i].name===nm)return;if(i>=0)cur[i].name=nm;else cur.unshift({id,name:nm});saveGroupList(cur)}
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
 if(!g){g=document.createElement('div');g.id='gate';g.innerHTML=`<div class="gin"><div style="font-size:44px">🏡</div><h2>Gathr</h2><p>Gathr is private. Enter the access code to open the app. An invite link then chooses which group you join.</p><input id="gcode" autocomplete="off" autocapitalize="off" placeholder="Access code"><button id="gbtn">Unlock</button><div id="gmsg"></div><small>Prototype light lock. Not real security.</small></div>`;document.body.appendChild(g);
  const go=async()=>{const v=document.getElementById('gcode').value;const hv=await sha(v);if(activeHashes(getAcc()).includes(hv)){localStorage.gathr_code_h=hv;gateCheck(getAcc,onOpen)}else{document.getElementById('gmsg').textContent='Access denied'}};
  g.querySelector('#gbtn').onclick=go;g.querySelector('#gcode').onkeydown=e=>{if(e.key=='Enter')go()}}
 document.getElementById('gmsg').textContent=msg;return false}
const GATE_CSS=`html.locked body>*:not(#gate){visibility:hidden}#gate{position:fixed;top:0;left:0;right:0;bottom:var(--kb,0px);z-index:100;background:#FAF7F2;display:flex;align-items:safe center;justify-content:center;overflow:auto;box-sizing:border-box;padding:calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));font-family:Inter,system-ui,sans-serif;color:#243438}#gate .gin{max-width:340px;width:100%;text-align:center;background:#E4EDE5;border-radius:24px;padding:28px 22px;box-sizing:border-box}#gate h2{font:700 32px Fraunces,Georgia,serif;margin:6px 0}#gate p{color:#596B70;font-size:15px}#gate input{width:100%;box-sizing:border-box;padding:14px;border-radius:14px;border:1px solid #D6DEDB;font:600 17px Inter,sans-serif;text-align:center;margin:10px 0}#gate button{width:100%;padding:14px;border:none;border-radius:14px;background:#165D63;color:#fff;font:700 16px Inter,sans-serif}#gmsg{color:#b3261e;font-weight:600;min-height:22px;margin-top:12px}#gate small{color:#596B70}html.kb #gate,html.kb #namegate,html.kb #joinreq{padding-bottom:24px !important}`;
document.head.insertAdjacentHTML('beforeend','<style>'+GATE_CSS+'</style>');document.documentElement.classList.add('locked');
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
