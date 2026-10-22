// Gathr app sync + install hint + access-code admin
const me=()=>localStorage.gathr_name||'';
let R={},ACC=JSON.parse(JSON.stringify(SEED_ACC));
const K={
 ev:[()=>EV,v=>{EV=v;G=nextG()}], spots:[()=>SPOTS,v=>{SPOTS=v}],
 food:[()=>food,v=>{food=v}], ch:[()=>ch,v=>{ch=v}],
 msgs:[()=>msgs,v=>{msgs.splice(0,msgs.length,...v)}],
 gm:[()=>gm,v=>{gm=v}], pend:[()=>pend,v=>{pend=v}], who:[()=>who,v=>{who=v}],
 study:[()=>[curStudy,curWeek],v=>{if(Array.isArray(v)){curStudy=v[0]|0;curWeek=v[1]|0}}],
 rsvp:[()=>R,v=>{R=v;rsv=R[me()]||null}], acc:[()=>ACC,v=>{ACC=v}]
};
const SEED={};for(const k in K)SEED[k]=JSON.stringify(K[k][0]());
const last={},ts={};for(const k in K){last[k]=SEED[k];ts[k]=1}
let online=false,pushing=null,dirty=false;
function cnt(v){return Object.values(R).filter(x=>x==v).length}
rs2=function(v){rsv=v;R[me()]=v;rh();toast(v=='going'?'See you there! 🙌':v=='maybe'?'Marked as maybe':"We'll miss you. Let us know how to pray.");tick()};
function applyDoc(d){let ch_=false;for(const k in K){const e=d[k];if(e&&e.ts>ts[k]){try{K[k][1](JSON.parse(e.v));last[k]=JSON.stringify(K[k][0]());ts[k]=e.ts;ch_=true}catch(x){}}}return ch_}
function curDoc(){const d={};for(const k in K)d[k]={ts:ts[k],v:last[k]};return d}
function myRole(){const m=gm.find(x=>x[0]==me());return m?m[1]:'Member'}
let rolePinned=false;function rerender(){try{if(!rolePinned)viewer=myRole();rh();rf();rfe();rch();if($('#grp.on'))rg();if($('#thr.on')&&typeof ct!='undefined')rth();if($('#cal.on'))rcal();$('#subt').textContent=titles[document.querySelector('nav button.on').dataset.t][1];maybeEnterFromJoin()}catch(e){console.warn(e)}}
function tick(){for(const k in K){const s=JSON.stringify(K[k][0]());if(s!==last[k]){last[k]=s;ts[k]=Date.now();dirty=true}}if(dirty){saveLocalDoc(curDoc());push()}}
async function push(){if(pushing)return pushing;pushing=(async()=>{try{while(dirty){dirty=false;const rem=await storeGet();if(applyDoc(rem))rerender();const out=curDoc();for(const k in rem)if(!(k in out))out[k]=rem[k];await storePut(out);online=true}}catch(e){online=false;dirty=true}finally{pushing=null;status()}})();return pushing}
async function poll(){if(pushing)return;try{const rem=await storeGet();online=true;if(applyDoc(rem)){saveLocalDoc(curDoc());rerender()}const missing=Object.keys(K).some(k=>!rem[k]||rem[k].ts<ts[k]);if(missing){dirty=true;push()}}catch(e){online=false}status();recheck()}
function status(){const s=$('#syncdot');if(s){s.textContent=online?'● Live sync':'○ Offline (saved on this phone)';s.style.color=online?'#165D63':'#596B70'}}
function recheck(){gateCheck(()=>ACC,null)}
async function resetSample(){if(!confirm('Reset group data? This clears gatherings, food, chat, RSVPs, saved spots and pending requests on every phone. Members and access codes stay.'))return;const now=Date.now();for(const k in K){if(k=='acc'||k=='gm')continue;K[k][1](JSON.parse(SEED[k]));last[k]=SEED[k];ts[k]=now}R={};rsv=null;last.rsvp=JSON.stringify(R);dirty=true;saveLocalDoc(curDoc());rerender();await push();toast('Group data reset on all phones')}
// ---- access codes admin (inside My Gathering) ----
const _rg=rg;rg=function(){_rg();const b=$('#grb');if(!b)return;
 if(!isHost()){b.insertAdjacentHTML('beforeend',`<div class="card"><b>🔐 Access code</b><div class="sub">Only the owner and admins can change access codes.</div></div>`);return}
 b.insertAdjacentHTML('beforeend',`<div class="card" id="acccard"><b>🔐 Access codes</b><div class="sub" style="margin:4px 0 10px">Everyone needs a current code to open Gathr on any phone. Rotating or revoking a code locks out phones that used it.</div>
 ${ACC.codes.map(c=>`<div class="item" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><span><b>${c.label}</b><br><small class="sub">Active · set ${new Date(c.at).toLocaleDateString()}</small></span>${ACC.codes.length>1?`<button class="btn" style="flex:0;border:1px solid var(--line);background:#fff;color:#b3261e" onclick="revokeCode('${c.id}')">Revoke</button>`:''}</div>`).join('')}
 <input id="ncode" placeholder="New code (e.g. a short phrase)" style="width:100%;box-sizing:border-box;padding:11px;border-radius:12px;border:1px solid var(--line);font:600 14px Inter;margin:8px 0">
 <div class="row" style="gap:8px"><button class="btn p" onclick="setCode(true)">Rotate (replace all)</button><button class="btn" style="background:#fff;border:1px solid var(--line);color:var(--acc)" onclick="setCode(false)">Add code</button></div>
 <div class="sub" style="margin-top:8px">Codes are stored only as SHA-256 hashes. Light lock only, not real security.</div></div>
 <div class="card"><b>🧹 Group data</b><div class="sub" style="margin:4px 0 10px">Shared store: textdb.dev · <span id="syncdot"></span></div><button class="btn" style="width:100%;background:#fff;border:1px solid #e3b3a8;color:#b3261e" onclick="resetSample()">Reset group data (all phones)</button></div>`);status()};
async function setCode(rot){const v=$('#ncode').value.trim();if(v.length<4)return toast('Use at least 4 characters');const h=await sha(v);const c={id:'c'+Date.now(),label:rot?'Current code':'Extra code '+(ACC.codes.length+1),h,at:Date.now()};ACC={codes:rot?[c]:[...ACC.codes,c]};localStorage.gathr_code_h=h;rg();tick();toast(rot?'Code rotated. Old code no longer works.':'Code added')}
function revokeCode(id){const c=ACC.codes.find(x=>x.id==id);ACC={codes:ACC.codes.filter(x=>x.id!=id)};if(c&&c.h==localStorage.gathr_code_h)localStorage.gathr_code_h=ACC.codes[0].h;rg();tick();toast('Code revoked')}
// ---- install hint (same banner; only the 2-step text differs) ----
document.head.insertAdjacentHTML('beforeend',`<style>#ihint{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));width:calc(100% - 24px);max-width:406px;z-index:31;background:#243438;color:#fff;border-radius:16px;padding:12px 14px;font:14px Inter;display:flex;gap:10px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.25)}#ihint button{background:none;border:none;color:#fff;font-size:18px}#ihint .ib{background:#F2B18A;color:#243438;border-radius:10px;padding:7px 10px;font:700 13px Inter}</style>`);
function deep(v){if(v=='cal')openCal();else if(v=='chat')go('stories');else if(v=='passage'){go('home');readRef(G?G.pass:curPass())}else go('home')}
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let bip=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();bip=e;showHint()});
function showHint(){if(standalone||localStorage.gathr_nohint||$('#ihint'))return;const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform=='MacIntel'&&navigator.maxTouchPoints>1);
 const txt=ios?'Install Gathr: tap <b>Share ⬆︎</b>, then <b>Add to Home Screen</b>.':'Install Gathr: tap the <b>⋮ menu</b>, then <b>Install app</b> or <b>Add to Home screen</b>.';
 document.body.insertAdjacentHTML('beforeend',`<div id="ihint"><span style="font-size:22px">📲</span><div style="flex:1">${txt}</div>${bip?'<button class="ib" onclick="bip.prompt();bip=null;hideHint()">Install</button>':''}<button onclick="localStorage.gathr_nohint=1;hideHint()">✕</button></div>`)}
function hideHint(){$('#ihint')&&$('#ihint').remove()}
// ---- boot ----
function openApp(){const q=new URLSearchParams(location.search).get('view');if(q)deep(q);setTimeout(showHint,1200)}
let unlocked=false;
function routeAfterGate(){unlocked=true;const joinId=new URLSearchParams(location.search).get('join');if(joinId&&!(me()&&gm.some(m=>m[0]==me()))){showJoinRequest();return}ensureName(openApp)}
function enterApproved(){ensureName(openApp)}
function maybeEnterFromJoin(){if(!unlocked||!new URLSearchParams(location.search).get('join'))return;const n=me();const member=!!(n&&gm.some(m=>m[0]==n));if(member){if(!document.getElementById('joinreq')&&localStorage.gathr_join_wait!=='1')return;localStorage.removeItem('gathr_join_wait');const el=document.getElementById('joinreq');if(el)el.remove();ensureName(openApp);return}if(localStorage.gathr_join_wait==='1'&&n&&!pend.some(p=>p[0]==n)){localStorage.removeItem('gathr_join_wait');showJoinRequest('That request was declined. You can ask again.')}}
(async()=>{applyDoc(localDoc());rsv=R[me()]||null;rerender();
 try{const rem=await storeGet();online=true;applyDoc(rem);saveLocalDoc(curDoc());rerender();if(Object.keys(K).some(k=>!rem[k])){dirty=true;push()}}catch(e){online=false}
 gateCheck(()=>ACC,()=>{routeAfterGate()});status();setInterval(tick,1000);setInterval(poll,3000)})();

function ensureName(done){if(me()){join();return done()}document.body.insertAdjacentHTML('beforeend',`<div id="namegate" style="position:fixed;inset:0;z-index:90;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px"><div style="max-width:340px;width:100%;text-align:center"><div style="font-size:40px">👋</div><h2 style="font:700 28px Fraunces,serif;margin:6px 0">Welcome to Gathr</h2><p class="sub">${gm.length?'What should your group call you?':'You\'re the first one here, so you\'ll be the group\'s owner (Creator). What\'s your name?'}</p><input id="nm" class="fi" placeholder="Your name" style="text-align:center;margin:10px 0"><button class="btn p" id="nmb">Continue</button></div></div>`);
 $('#nmb').onclick=()=>{const v=$('#nm').value.trim();if(!v)return;localStorage.gathr_name=v;$('#namegate').remove();join();done()}}
function join(){const n=me();if(!n||gm.some(x=>x[0]==n))return rerender();if(new URLSearchParams(location.search).get('join'))return rerender();gm.push([n,gm.length?'Member':'Creator']);tick();rerender();toast(gm.length==1?'You\'re the owner of this group':'Welcome, '+n)}
// keep the role-preview chips working (they set viewer directly)
const _rg2=rg;rg=function(){const b=document.querySelector('#grb');_rg2();if(b&&myRole()=='Member'){const bn=b.querySelector('.banner');bn&&bn.remove()}if(b)b.querySelectorAll('.banner .chip').forEach(c=>c.addEventListener('click',()=>{rolePinned=true;rh();rf()}))};
