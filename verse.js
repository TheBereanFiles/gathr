// Gathr: tappable Scripture references with an in-place verse popup (bible.helloao.org, fallback bible-api.com)
(function(){
const AB={gen:'GEN',ex:'EXO',exod:'EXO',lev:'LEV',num:'NUM',deut:'DEU',josh:'JOS',judg:'JDG',sam:'SA',kgs:'KI',chr:'CH',neh:'NEH',esth:'EST',ps:'PSA',psa:'PSA',prov:'PRO',eccl:'ECC',isa:'ISA',jer:'JER',lam:'LAM',ezek:'EZK',dan:'DAN',hos:'HOS',obad:'OBA',mic:'MIC',hab:'HAB',zeph:'ZEP',hag:'HAG',zech:'ZEC',mal:'MAL',matt:'MAT',mt:'MAT',mk:'MRK',lk:'LUK',jn:'JHN',rom:'ROM',cor:'CO',gal:'GAL',eph:'EPH',phil:'PHP',col:'COL',thess:'TH',tim:'TI',tit:'TIT',titus:'TIT',philem:'PHM',philemon:'PHM',heb:'HEB',jas:'JAS',james:'JAS',pet:'PE',jude:'JUD',rev:'REV',revelation:'REV',thessalonians:'TH',timothy:'TI',peter:'PE'};
function code(name){let n=name.toLowerCase().replace(/\./g,'').replace(/\s+/g,' ').trim();if(typeof BK!='undefined'&&BK[n])return BK[n];
 const m=n.match(/^([123])\s?(.+)$/);const num=m?m[1]:'',b=m?m[2]:n;if(typeof BK!='undefined'&&num&&BK[num+' '+b])return BK[num+' '+b];
 const c=AB[b];if(!c)return null;if(c.length==2)return num?num+c:null;return num?null:c}
const NAMES=[...new Set([...(typeof BK!='undefined'?Object.keys(BK).map(k=>k.replace(/^[123] /,'')):[]),...Object.keys(AB)])].sort((a,b)=>b.length-a.length).map(s=>s.replace(/ /g,'\\s'));
const RX=new RegExp('\\b((?:[123]\\s?)?(?:'+NAMES.join('|')+')\\.?)\\s(\\d{1,3})(?::(\\d{1,3})(?:\\s?[-–]\\s?(\\d{1,3})(?::(\\d{1,3}))?)?|\\s?[-–]\\s?(\\d{1,3}))?(?![\\w:])','gi');
function parse(ref){RX.lastIndex=0;const m=RX.exec(String(ref||'').trim());if(!m)return null;const b=code(m[1]);if(!b)return null;
 const c1=+m[2];let v1=m[3]?+m[3]:null,c2=c1,v2=null;
 if(m[6])c2=+m[6];else if(m[3]){if(m[5]){c2=+m[4];v2=+m[5]}else v2=m[4]?+m[4]:v1}
 return {b,c1,v1,c2,v2,label:m[0].replace(/\s+/g,' ')}}
window.vParse=parse;
const HAO={BSB:'BSB',KJV:'eng_kjv',WEB:'ENGWEBP',ASV:'eng_asv',YLT:'eng_ylt',DARBY:'eng_dby',DRA:'eng_dra'};
const BAPI={KJV:'kjv',WEB:'web',ASV:'asv',YLT:'ylt',DARBY:'darby',DRA:'dra',BSB:'web'};
const cache={};let CK='gathr_vcache';try{Object.assign(cache,JSON.parse(localStorage.getItem(CK)||'{}'))}catch(e){}
function save(){try{const k=Object.keys(cache);while(k.length>60)delete cache[k.shift()];localStorage.setItem(CK,JSON.stringify(cache))}catch(e){}}
function txt(c){return (c||[]).map(x=>typeof x=='string'?x:(x.text||'')).filter(Boolean).join(' ').replace(/\s+/g,' ').trim()}
async function chHao(t,b,c){const k='h|'+t+'|'+b+'|'+c;if(cache[k])return cache[k];const r=await fetch('https://bible.helloao.org/api/'+t+'/'+b+'/'+c+'.json');if(!r.ok)throw new Error('http '+r.status);
 const d=await r.json();const vs=d.chapter.content.filter(x=>x.type=='verse').map(x=>[x.number,txt(x.content)]);if(!vs.length)throw new Error('empty');cache[k]=vs;save();return vs}
async function getHao(t,p){const out=[];const last=Math.min(p.c2,p.c1+2);
 for(let c=p.c1;c<=last;c++){const vs=await chHao(t,p.b,c);vs.forEach(([n,s])=>{if(c==p.c1&&p.v1&&n<p.v1)return;if(c==p.c2&&p.v2&&n>p.v2)return;out.push([c,n,s])})}
 return {vs:out,cut:p.c2>last}}
async function getBapi(t,p){const k='b|'+t+'|'+p.label;if(cache[k])return cache[k];const r=await fetch('https://bible-api.com/'+encodeURIComponent(p.label)+'?translation='+t);if(!r.ok)throw new Error('http '+r.status);
 const d=await r.json();const o={vs:d.verses.map(v=>[v.chapter,v.verse,v.text.replace(/\s+/g,' ').trim()]),cut:false};cache[k]=o;save();return o}
const TRN={BSB:'Berean Standard Bible',KJV:'King James Version',WEB:'World English Bible',ASV:'American Standard Version',YLT:"Young's Literal Translation",DARBY:'Darby Translation',DRA:'Douay-Rheims'};
async function load(p,want){const tries=[['h',HAO[want]||'BSB',want]];if(want!='BSB')tries.push(['h','BSB','BSB']);tries.push(['b',BAPI[want]||'web',(BAPI[want]||'web').toUpperCase()]);
 let err;for(const [s,t,lab] of tries){try{const o=s=='h'?await getHao(t,p):await getBapi(t,p);if(o.vs.length)return Object.assign({tr:lab},o)}catch(e){err=e}}throw err||new Error('none')}
const css=document.createElement('style');css.textContent=`.vref{color:var(--acc,#165D63);font-weight:600;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;cursor:pointer}
#vsheet{position:fixed;top:0;left:0;right:0;bottom:var(--kb,0px);background:rgba(36,52,56,.45);z-index:60;display:none;align-items:flex-end;justify-content:center}#vsheet.on{display:flex}
#vsheet .vb{background:#fff;width:100%;max-width:430px;max-height:min(78dvh,100%);border-radius:22px 22px 0 0;display:flex;flex-direction:column;box-shadow:0 -6px 24px rgba(22,52,56,.18);animation:vup .22s ease-out}
@keyframes vup{from{transform:translateY(40px);opacity:.4}}#vsheet .vh{padding:14px 18px 10px;border-bottom:1px solid #E2E7E4;display:flex;align-items:flex-start;gap:10px}
#vsheet .vt{flex:1}#vsheet h3{font:700 20px Fraunces,Georgia,serif;color:#243438;margin:0}#vsheet .vl{display:inline-block;margin-top:4px;background:#E4EDE5;color:#165D63;font:700 11px Inter,sans-serif;padding:3px 8px;border-radius:8px}
#vsheet .vx{background:#E4EDE5;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;color:#243438;cursor:pointer}
#vsheet .vc{padding:14px 18px;overflow:auto;font:16px/1.65 Georgia,serif;color:#243438}#vsheet .vc sup{font:700 10px Inter,sans-serif;color:#165D63;margin-right:3px}
#vsheet .vc .ch{font:700 12px Inter,sans-serif;color:#596B70;letter-spacing:.06em;margin:10px 0 4px;text-transform:uppercase}#vsheet .vn{font:13px Inter,sans-serif;color:#596B70;margin-top:10px}
#vsheet .vf{padding:10px 18px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #E2E7E4;display:flex;gap:8px}html.kb #vsheet .vf{padding-bottom:12px}#vsheet .vf a,#vsheet .vf button{flex:1;text-align:center;padding:12px;border-radius:12px;font:700 14px Inter,sans-serif;text-decoration:none;cursor:pointer}
#vsheet .vf a{background:#165D63;color:#fff}#vsheet .vf button{background:#fff;color:#165D63;border:1px solid #CFDDD1}
#vsheet .sk{height:14px;background:#E4EDE5;border-radius:7px;margin:10px 0;animation:sk 1.2s infinite}@keyframes sk{50%{opacity:.5}}#vsheet .ve{background:#E4EDE5;border-radius:12px;padding:14px;font:14px Inter,sans-serif}`;
document.head.appendChild(css);
const sh=document.createElement('div');sh.id='vsheet';sh.innerHTML='<div class="vb" role="dialog" aria-modal="true"><div class="vh"><div class="vt"><h3 id="vtit"></h3><span class="vl" id="vtr"></span></div><button class="vx" aria-label="Close" onclick="vClose()">✕</button></div><div class="vc" id="vbody"></div><div class="vf"><a id="vfull" target="_blank" rel="noopener">Read full chapter ›</a><button onclick="vClose()">Close</button></div></div>';
document.body.appendChild(sh);sh.addEventListener('click',e=>{if(e.target===sh)vClose()});document.addEventListener('keydown',e=>{if(e.key=='Escape')vClose()});
window.vClose=()=>sh.classList.remove('on');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let seq=0;
window.vOpen=async function(ref){const p=parse(cleanRef?cleanRef(ref):ref);if(!p){window.open(bibleUrl(ref),'_blank');return}
 const want=(typeof tr!='undefined'&&tr)||'BSB';const my=++seq;
 $('#vtit').textContent=p.label;$('#vtr').textContent=want+' · loading…';$('#vfull').href=bibleUrl(p.label.replace(/:.*/,'').replace(/\s?[-–]\s?\d+$/,''));
 $('#vbody').innerHTML='<div class="sk"></div><div class="sk" style="width:85%"></div><div class="sk" style="width:92%"></div><div class="sk" style="width:60%"></div>';sh.classList.add('on');
 try{const o=await load(p,want);if(my!=seq)return;let h='',lc=null;const multi=o.vs.some(v=>v[0]!=o.vs[0][0]);
  o.vs.forEach(([c,n,s])=>{if(multi&&c!==lc){h+=`<div class="ch">Chapter ${c}</div>`;lc=c}h+=`<sup>${n}</sup>${esc(s)} `});
  if(o.cut)h+=`<div class="vn">Showing the first chapters only. Tap “Read full chapter” for the rest.</div>`;
  const fb=o.tr!=want;$('#vtr').textContent=(TRN[o.tr]||o.tr)+' ('+o.tr+')'+(fb?' · '+want+' unavailable':'');
  if(fb)h+=`<div class="vn">Your translation (${want}) couldn't be loaded, so this shows ${o.tr}.</div>`;
  if(o.tr=='DRA')h+=`<div class="vn">Douay-Rheims uses older Psalm numbering, so some Psalms are off by one.</div>`;$('#vbody').innerHTML=h}
 catch(e){if(my!=seq)return;$('#vtr').textContent=want;$('#vbody').innerHTML=`<div class="ve"><b>${navigator.onLine===false?"You're offline.":"Couldn't load this passage."}</b><br>Passages you've opened before still work offline. You can retry, or use “Read full chapter”.<div style="margin-top:10px"><button class="chip" onclick="vOpen('${esc(p.label).replace(/'/g,'')}')">↻ Try again</button></div></div>`}};
window.readRef=r=>vOpen(r);
const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|BUTTON|A|CODE)$/;
function link(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){let e=n.parentElement;while(e&&e!==document.body){if(SKIP.test(e.tagName)||e.classList.contains('vref')||e.id=='vsheet'||e.isContentEditable||e.id=='gate')return 2;e=e.parentElement}RX.lastIndex=0;return RX.test(n.nodeValue)?1:2}});
 const ns=[];while(w.nextNode())ns.push(w.currentNode);
 ns.forEach(n=>{const s=n.nodeValue;RX.lastIndex=0;let m,i=0;const f=document.createDocumentFragment();let any=false;
  while((m=RX.exec(s))){if(!code(m[1]))continue;any=true;f.appendChild(document.createTextNode(s.slice(i,m.index)));const a=document.createElement('span');a.className='vref';a.setAttribute('role','button');a.tabIndex=0;a.dataset.ref=m[0];a.textContent=m[0];f.appendChild(a);i=m.index+m[0].length}
  if(!any)return;f.appendChild(document.createTextNode(s.slice(i)));n.parentNode.replaceChild(f,n)})}
document.addEventListener('click',e=>{const r=e.target.closest&&e.target.closest('.vref');if(r){e.preventDefault();e.stopPropagation();vOpen(r.dataset.ref)}},true);
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.classList&&e.target.classList.contains('vref'))vOpen(e.target.dataset.ref)});
let pend=false;const mo=new MutationObserver(()=>{if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;mo.disconnect();try{link(document.body)}finally{mo.observe(document.body,{childList:true,subtree:true,characterData:true})}})});
link(document.body);mo.observe(document.body,{childList:true,subtree:true,characterData:true});
})();
