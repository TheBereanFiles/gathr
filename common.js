// Gathr shared helpers: synced store (textdb.dev, no account), compression, access gate
const GSTORE='https://textdb.dev/api/data/';
const _qs=new URLSearchParams(location.search);
const GID=_qs.get('join')||_qs.get('g')||localStorage.gathr_gid||'gathr-zk-m7Qx2pLk-v1';
localStorage.gathr_gid=GID;
const GURL=GSTORE+encodeURIComponent(GID);
async function gz(s){const b=await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();let o='';new Uint8Array(b).forEach(c=>o+=String.fromCharCode(c));return 'gz:'+btoa(o)}
async function ungz(s){if(!s||!s.startsWith('gz:'))return s?JSON.parse(s):null;const u=Uint8Array.from(atob(s.slice(3)),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
async function storeGet(){const r=await fetch(GURL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('get '+r.status);const t=(await r.text()).trim();try{return await ungz(t)||{}}catch(e){return {}}}
async function storePut(doc){const r=await fetch(GURL,{method:'POST',headers:{'content-type':'text/plain'},body:await gz(JSON.stringify(doc))});if(!r.ok)throw Error('put '+r.status)}
function localDoc(){try{return JSON.parse(localStorage.gathr_doc||'{}')}catch(e){return {}}}
function saveLocalDoc(d){try{localStorage.gathr_doc=JSON.stringify(d)}catch(e){}}
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s.trim()));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
// Initial prototype code set by owner (hash only is stored)
const SEED_ACC={codes:[{id:'c1',label:'Launch code',h:'3410a1824bd11c0b091f80e19067e975afd0a1a05d031f644067cea752b0a3c1',at:Date.parse('2026-10-22')}]};
function activeHashes(acc){return ((acc||SEED_ACC).codes||[]).map(c=>c.h)}
// Gate: shows overlay until a valid code is entered. getAcc() returns current ACC object.
function gateCheck(getAcc,onOpen){const h=localStorage.gathr_code_h;let g=document.getElementById('gate');
 if(h&&activeHashes(getAcc()).includes(h)){if(g)g.remove();document.documentElement.classList.remove('locked');onOpen&&onOpen();return true}
 const msg=h?'Access denied: this code is no longer active':'';if(h)localStorage.removeItem('gathr_code_h');
 document.documentElement.classList.add('locked');
 if(!g){g=document.createElement('div');g.id='gate';g.innerHTML=`<div class="gin"><div style="font-size:44px">🏡</div><h2>Gathr</h2><p>This gathering is private. Enter the access code your host shared with you.</p><input id="gcode" autocomplete="off" autocapitalize="off" placeholder="Access code"><button id="gbtn">Unlock</button><div id="gmsg"></div><small>Prototype light lock. Not real security.</small></div>`;document.body.appendChild(g);
  const go=async()=>{const v=document.getElementById('gcode').value;const hv=await sha(v);if(activeHashes(getAcc()).includes(hv)){localStorage.gathr_code_h=hv;gateCheck(getAcc,onOpen)}else{document.getElementById('gmsg').textContent='Access denied'}};
  g.querySelector('#gbtn').onclick=go;g.querySelector('#gcode').onkeydown=e=>{if(e.key=='Enter')go()}}
 document.getElementById('gmsg').textContent=msg;return false}
const GATE_CSS=`html.locked body>*:not(#gate){visibility:hidden}#gate{position:fixed;inset:0;z-index:100;background:#FAF7F2;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif;color:#243438}#gate .gin{max-width:340px;width:100%;text-align:center;background:#E4EDE5;border-radius:24px;padding:28px 22px;box-sizing:border-box}#gate h2{font:700 32px Fraunces,Georgia,serif;margin:6px 0}#gate p{color:#596B70;font-size:15px}#gate input{width:100%;box-sizing:border-box;padding:14px;border-radius:14px;border:1px solid #D6DEDB;font:600 17px Inter,sans-serif;text-align:center;margin:10px 0}#gate button{width:100%;padding:14px;border:none;border-radius:14px;background:#165D63;color:#fff;font:700 16px Inter,sans-serif}#gmsg{color:#b3261e;font-weight:600;min-height:22px;margin-top:12px}#gate small{color:#596B70}`;
document.head.insertAdjacentHTML('beforeend','<style>'+GATE_CSS+'</style>');document.documentElement.classList.add('locked');
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
