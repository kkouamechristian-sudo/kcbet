/* Match en vedette : grand bloc au-dessus des pronostics, qui fait defiler les affiches du moment. */
const H={i:0,list:[],timer:null,hold:false};
function crest(name){let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))%360;const ini=name.replace(/[^A-Za-zÀ-ÿ ]/g,"").split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
  return `<span class="crest" style="--h:${h}" aria-hidden="true">${esc(ini)}</span>`}
function heroPick(){const now=Date.now(),out=[];
  const live=window.LIVE?[...window.LIVE.values()].filter(e=>e.state==="in"&&e.fx):[];
  live.sort((a,b)=>(b.fx.top-a.fx.top));live.slice(0,3).forEach(e=>out.push({f:e.fx,ev:e}));
  const up=D.fixtures.filter(f=>(!f.far||f.intl)&&new Date(f.ko).getTime()>now&&new Date(f.ko).getTime()-now<48*36e5&&!out.some(o=>o.f.key===f.key));
  up.sort((a,b)=>(b.top-a.top)||((a.intl?1:0)-(b.intl?1:0))||(new Date(a.ko)-new Date(b.ko)));
  up.slice(0,8-out.length).forEach(f=>out.push({f,ev:null}));
  return out}
function countdown(ko){const m=Math.round((new Date(ko)-Date.now())/6e4);if(m<=0)return T("Coup d'envoi imminent","Kick-off imminent");const h=Math.floor(m/60),r=m%60;
  return T("Coup d'envoi dans ","Kick-off in ")+(h?`${h} h ${String(r).padStart(2,"0")}`:`${r} min`)}
function renderHero(){
  const box=$("hero");if(!box)return;H.list=heroPick();if(!H.list.length){box.hidden=true;return}box.hidden=false;
  if(H.i>=H.list.length)H.i=0;const{f,ev}=H.list[H.i],on=ev&&ev.state==="in";
  const p=on&&typeof liveProbs==="function"?liveProbs(ev)||f.market:f.market,su=f.sure;
  const d=new Date(f.ko),t0=new Date();t0.setHours(0,0,0,0);const n=Math.round((new Date(d).setHours(0,0,0,0)-t0)/864e5);
  const day=n===0?T("Aujourd'hui","Today"):n===1?T("Demain","Tomorrow"):d.toLocaleDateString(LOC,{weekday:"long",day:"numeric",month:"long"});
  box.innerHTML=`<div class="hero-top"><span class="hero-tag">${on?`<i class="dot-live"></i>${T("En direct","Live")}`:"★ "+T("Match en vedette","Featured match")}</span><span class="hero-lg">${esc(LG[f.lg]||f.league)}</span></div>
   <div class="hero-main">
    <div class="hero-team">${crest(f.home)}<b>${esc(f.home)}</b></div>
    <div class="hero-mid">${on?`<b class="hero-score">${ev.hg} – ${ev.ag}</b><small class="hero-live">${esc(clockLabel(ev))}</small>`:`<b class="hero-time">${esc(d.toLocaleTimeString(LOC,{hour:"2-digit",minute:"2-digit"}))}</b><small>${esc(day)}</small><small class="hero-cd">${esc(countdown(f.ko))}</small>`}</div>
    <div class="hero-team">${crest(f.away)}<b>${esc(f.away)}</b></div>
   </div>
   <div class="hero-bar"><div class="bar">${[["s1",0],["sx",1],["s2",2]].map(([c,k])=>`<i class="${c}" style="width:${p[k]*100}%"></i>`).join("")}</div>
    <div class="legend"><span><i class="dot s1"></i>1 · ${pct(p[0])}</span><span><i class="dot sx"></i>${T("N","D")} · ${pct(p[1])}</span><span><i class="dot s2"></i>2 · ${pct(p[2])}</span></div></div>
   <div class="hero-foot">${su?`<span class="hero-sure">★ ${T("Plus sûr","Safest")} · ${esc(su.label)} · ${pct(su.p)}</span>`:"<span></span>"}
    <span class="hero-btns">${su&&!on?`<button class="ghost" type="button" data-hero="ticket">${T("Au ticket","Add to ticket")}</button>`:""}<button class="act" type="button" data-hero="open">${T("Voir l'analyse →","See analysis →")}</button></span></div>
   ${H.list.length>1?`<div class="hero-nav"><button class="hero-arrow" type="button" data-hero="prev" aria-label="${T("Match précédent","Previous match")}">‹</button><span class="hero-dots">${H.list.map((_,k)=>`<button type="button" class="hd${k===H.i?" on":""}" data-hero-i="${k}" aria-label="${T("Match","Match")} ${k+1}"></button>`).join("")}</span><button class="hero-arrow" type="button" data-hero="next" aria-label="${T("Match suivant","Next match")}">›</button></div>`:""}`;
}
$("hero").addEventListener("click",e=>{const b=e.target.closest("[data-hero],[data-hero-i]");if(!b)return;const{f}=H.list[H.i];
  if(b.dataset.heroI!=null){H.i=+b.dataset.heroI;renderHero();return}
  const a=b.dataset.hero;
  if(a==="prev"||a==="next"){H.i=(H.i+(a==="next"?1:H.list.length-1))%H.list.length;renderHero();return}
  if(a==="ticket"&&f.sure){addMarket(f.key,f.sure.label,f.sure.p);return}
  if(a==="open"){S.day=f.date;S.kind="all";S.league="all";S.open.add(f.key);location.hash="matchs";renderMatches();
    const el=document.querySelector(`[data-open="${f.key}"]`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"})}});
$("hero").addEventListener("pointerenter",()=>H.hold=true);$("hero").addEventListener("pointerleave",()=>H.hold=false);
$("hero").addEventListener("focusin",()=>H.hold=true);$("hero").addEventListener("focusout",()=>H.hold=false);
renderHero();
if(!matchMedia("(prefers-reduced-motion: reduce)").matches)H.timer=setInterval(()=>{if(!H.hold&&!document.hidden&&H.list.length>1){H.i=(H.i+1)%H.list.length;renderHero()}},8000);
setInterval(()=>{if(!document.hidden)renderHero()},30000);
