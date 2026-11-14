/* Scores et pronostics en direct, lus depuis le navigateur du visiteur. */
const ESPN="https://site.api.espn.com/apis/site/v2/sports/soccer/";
const SLUGS={E0:"eng.1",E1:"eng.2",E2:"eng.3",E3:"eng.4",EC:"eng.5",SP1:"esp.1",SP2:"esp.2",D1:"ger.1",D2:"ger.2",I1:"ita.1",I2:"ita.2",F1:"fra.1",F2:"fra.2",SC0:"sco.1",SC1:"sco.2",SC2:"sco.3",SC3:"sco.4",N1:"ned.1",B1:"bel.1",P1:"por.1",T1:"tur.1",G1:"gre.1",ARG:"arg.1",AUT:"aut.1",BRA:"bra.1",CHN:"chn.1",DNK:"den.1",FIN:"fin.1",IRL:"irl.1",JPN:"jpn.1",MEX:"mex.1",NOR:"nor.1",ROU:"rou.1",SWE:"swe.1",SWZ:"sui.1",USA:"usa.1",INT_UNL:"uefa.nations",INT_CANQ:"caf.nations_qual",INT_CNL:"concacaf.nations.league",INT_AMI:"fifa.friendly",INT_WCQ_CAF:"fifa.worldq.caf",INT_WCQ_UEFA:"fifa.worldq.uefa"};
const CUPS={"uefa.champions":"Europe · Ligue des champions","uefa.europa":"Europe · Ligue Europa","uefa.europa.conf":"Europe · Ligue Conférence","caf.champions":"Afrique · Ligue des champions CAF","caf.confed":"Afrique · Coupe de la Confédération"};
const SLUG2LG=Object.fromEntries(Object.entries(SLUGS).map(([k,v])=>[v,k]));
const V={events:new Map(),open:new Set(),tab:"",err:false,at:0,full:0,timer:null,busy:false};
const normName=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\b(fc|afc|cf|sc|ac|as|ssc|sv|vfb|vfl|tsg|rc|ud|cd|ca|sd|fk|club|de|the|city|united|town|real|atletico|ath|athletic|rj|mg|pr)\b/g," ").replace(/\s+/g," ").trim();
function bi(s){const o=new Set();const t=s.replace(/ /g,"");for(let i=0;i<t.length-1;i++)o.add(t.slice(i,i+2));return o}
function sim(a,b){a=normName(a);b=normName(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const x=bi(a),y=bi(b);let n=0;x.forEach(v=>{if(y.has(v))n++});return x.size+y.size?2*n/(x.size+y.size):0}
function findFixture(lg,home,away,date){if(!lg)return null;const day=new Date(date).getTime();let best=null,bs=0;
  for(const f of D.fixtures){if(f.lg!==lg||(f.far&&!f.intl))continue;if(Math.abs(new Date(f.ko).getTime()-day)>864e5)continue;const a=sim(f.home,home),b=sim(f.away,away),s=a+b;
    /* une equipe ne joue qu'une fois par jour : un nom sur deux tres proche suffit dans le meme championnat */
    if((Math.max(a,b)>=.7||Math.min(a,b)>=.5)&&s>bs){bs=s;best=f}}
  return best}
function parseEvent(e,slug){const c=e.competitions&&e.competitions[0];if(!c)return null;const t=c.competitors||[],h=t.find(x=>x.homeAway==="home"),a=t.find(x=>x.homeAway==="away");if(!h||!a)return null;
  const st=e.status||{},ty=st.type||{},reds=(c.details||[]).filter(d=>d.redCard),idH=h.team&&h.team.id,lg=SLUG2LG[slug];
  const ev={id:e.id,slug,lg,date:e.date,state:ty.state,done:ty.completed,detail:ty.description||"",clock:st.displayClock||"",period:st.period||0,name:ty.name||"",home:h.team.displayName,away:a.team.displayName,hl:h.team.logo,al:a.team.logo,hg:+h.score||0,ag:+a.score||0,redH:reds.filter(d=>d.team&&d.team.id===idH).length,redA:reds.filter(d=>d.team&&d.team.id!==idH).length};
  ev.fx=findFixture(lg,ev.home,ev.away,ev.date);return ev}
function liveState(ev){const m=parseInt(ev.clock,10)||0,ht=/HALFTIME/.test(ev.name),min=ht?45:ev.period>=2?Math.max(46,m):m;
  return{min,left:Math.max(.005,(94-min)/94),hg:ev.hg,ag:ev.ag,redH:ev.redH,redA:ev.redA}}
function clockLabel(ev){if(ev.state==="pre")return new Date(ev.date).toLocaleTimeString(LOC,{hour:"2-digit",minute:"2-digit"});if(ev.state==="post")return/POSTPONED|CANCELED|ABANDONED/.test(ev.name)?"Reporté":"Fin";if(/HALFTIME/.test(ev.name))return"MT";return ev.clock.replace("'","")+"'"}
function liveProbs(ev){if(!ev.fx||!ev.fx.lam||ev.state!=="in")return null;return result1x2(liveCells(ev.fx,liveState(ev)).cells)}
function marketsHTML(f,st){return allMarkets(f,st).map((g,i)=>`<details class="mk"${i===0?" open":""}><summary>${esc(g.t)}</summary><div class="scroll"><table><tbody>${g.rows.map(([l,p])=>`<tr><td>${esc(l)}</td><td>${pct(p,p<.1?1:0)}</td><td>${p>.002?nf(1/p):"–"}</td>${st?"":`<td><button class="ghost" type="button" data-mk="${f.key}" data-l="${esc(g.t+" : "+l)}" data-p="${p}">Au ticket</button></td>`}</tr>`).join("")}</tbody></table></div></details>`).join("")}
function leagueName(ev){return ev.lg?(LG[ev.lg]||(typeof D!=="undefined"&&ev.lg)):CUPS[ev.slug]||ev.slug}
function renderLive(){
  const all=[...V.events.values()],sets={in:all.filter(e=>e.state==="in"),pre:all.filter(e=>e.state==="pre"),post:all.filter(e=>e.state==="post")};
  const b=document.querySelector('[data-nav="direct"]');if(b)b.textContent=sets.in.length?`Direct (${sets.in.length})`:"Direct";
  if(!V.chosen)V.tab=sets.in.length?"in":"pre";
  chips($("l-kind"),[["in",`En direct ${sets.in.length}`],["pre",`À venir ${sets.pre.length}`],["post",`Terminés ${sets.post.length}`]],V.tab,v=>{V.tab=v;V.chosen=true;renderLive()});
  $("l-status").textContent=V.err&&!all.length?"Scores en direct indisponibles pour le moment. La page réessaie toute seule.":V.at?`Mis à jour à ${new Date(V.at).toLocaleTimeString(LOC,{hour:"2-digit",minute:"2-digit",second:"2-digit"})}. Actualisation automatique.`:"Chargement des scores…";
  const L=sets[V.tab].sort((a,b)=>String(leagueName(a)).localeCompare(String(leagueName(b)),"fr")||a.date.localeCompare(b.date)),G=new Map();L.forEach(e=>{const k=leagueName(e);if(!G.has(k))G.set(k,[]);G.get(k).push(e)});
  let h="";
  for(const[k,ms]of G){h+=`<div class="group"><span>${flagOf(k)}${esc(k)}</span><small>${ms.length}</small></div>`;
    for(const e of ms){const p=liveProbs(e),open=V.open.has(e.id),pm=e.fx&&!p?e.fx.market:p,i=pm?pm.indexOf(Math.max(...pm)):0,lab=pm&&e.fx?[e.fx.home,"Nul",e.fx.away][i]:"";
      h+=`<article class="match"><button class="mhead" type="button" data-ev="${esc(e.id)}" aria-expanded="${open}"${e.fx?"":" disabled"}>
        <span class="time ${e.state==="in"?"now":""}">${esc(clockLabel(e))}</span>
        <span class="teams"><span>${tlogo("",e.hl)}${esc(e.home)}${e.redH?` <i class="red" aria-label="${e.redH} carton rouge"></i>`:""}</span><span>${tlogo("",e.al)}${esc(e.away)}${e.redA?` <i class="red" aria-label="${e.redA} carton rouge"></i>`:""}</span>${pm?`<span class="bar" aria-hidden="true">${[["s1",0],["sx",1],["s2",2]].map(([c,k])=>`<i class="${c}" style="width:${pm[k]*100}%"></i>`).join("")}</span>`:""}</span>
        ${e.state==="pre"?"":`<span class="scoreb"><b>${e.hg}</b><b>${e.ag}</b></span>`}
        <span class="pred">${pm&&e.state!=="post"?`<b>${esc(lab)}</b><small>${pct(pm[i])}${e.state==="in"?" en direct":""}</small>`:e.state==="post"||e.fx?"":'<small>Pas de pronostic</small>'}</span></button>
        ${open&&e.fx?`<div class="detail">${e.state==="in"?`<p class="note">Pronostic recalculé avec le score, le temps restant et les cartons rouges connus. Méthode non testée sur l'historique.</p>${marketsHTML(e.fx,liveState(e))}`:`${marketsHTML(e.fx)}`}</div>`:""}</article>`}}
  $("l-list").innerHTML=h||'<p class="lead" style="padding:12px">Aucun match dans cette liste pour le moment.</p>';
}
async function pull(slug){const r=await fetch(ESPN+slug+"/scoreboard");if(!r.ok)throw new Error(slug);const d=await r.json();
  for(const[k,v]of V.events)if(v.slug===slug)V.events.delete(k);
  for(const e of d.events||[]){const ev=parseEvent(e,slug);if(ev)V.events.set(ev.id,ev)}}
function slugsToday(){const now=Date.now(),set=new Set(Object.keys(CUPS));for(const f of D.fixtures){if((f.far&&!f.intl)||!SLUGS[f.lg])continue;if(Math.abs(new Date(f.ko).getTime()-now)<36*36e5)set.add(SLUGS[f.lg])}return[...set]}
function activeSlugs(){const now=Date.now(),s=new Set();for(const e of V.events.values())if(e.state==="in"||(e.state==="pre"&&new Date(e.date).getTime()-now<6e5))s.add(e.slug);return[...s]}
async function tick(){if(V.busy||document.hidden)return;V.busy=true;
  const fullRun=Date.now()-V.full>3e5,list=fullRun?slugsToday():activeSlugs();let ok=0,bad=0;
  for(let i=0;i<list.length;i+=5){const r=await Promise.allSettled(list.slice(i,i+5).map(pull));r.forEach(x=>x.status==="fulfilled"?ok++:bad++)}
  if(fullRun)V.full=Date.now();V.err=!ok&&bad>0;if(ok)V.at=Date.now();V.busy=false;
  window.LIVE=new Map();for(const e of V.events.values())if(e.fx)window.LIVE.set(e.fx.key,e);
  renderLive();renderTicker();if(typeof renderHero==="function")renderHero();
  const a=document.activeElement;if(!$("m-list").closest("section").hidden&&!(a&&a.closest&&a.closest("#m-list")&&a.tagName==="INPUT"))renderMatches()}
$("l-list").addEventListener("click",e=>{const b=e.target.closest("[data-ev]");if(b){const k=b.dataset.ev;V.open.has(k)?V.open.delete(k):V.open.add(k);renderLive();return}
  const m=e.target.closest("[data-mk]");if(m)addMarket(m.dataset.mk,m.dataset.l,+m.dataset.p)});
let tickerText="";
function renderTicker(){
  const live=[...V.events.values()].filter(e=>e.state==="in").sort((a,b)=>(b.fx?1:0)-(a.fx?1:0));
  const box=$("ticker"),mv=$("ticker-move");
  const item=e=>{const p=liveProbs(e),i=p?p.indexOf(Math.max(...p)):-1,lab=p&&e.fx?[e.fx.home,"Nul",e.fx.away][i]:"";
    return `<button class="tk" type="button" data-tk="${esc(e.id)}"><span class="tk-min">${esc(clockLabel(e))}</span> ${tlogo("",e.hl)}${esc(e.home)} <b>${e.hg} – ${e.ag}</b> ${tlogo("",e.al)}${esc(e.away)}${p?` <span class="tk-p">${esc(lab)} ${pct(p[i])}</span>`:""}</button>`};
  const html=live.map(item).join("");
  box.hidden=!live.length;
  if(html===tickerText)return;
  tickerText=html;
  mv.innerHTML=html+html;
  mv.style.animationDuration=Math.max(20,live.length*7)+"s";
}
$("ticker").addEventListener("click",e=>{const b=e.target.closest("[data-tk]");if(!b)return;V.tab="in";V.chosen=true;V.open.add(b.dataset.tk);location.hash="direct";renderLive()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
renderLive();tick();V.timer=setInterval(tick,45000);
