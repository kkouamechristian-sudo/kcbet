const D = window.KC;
const ISSUES=["1","X","2"];
const LG=Object.fromEntries(D.fixtures.map(f=>[f.lg,f.country+" · "+f.league]));
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf=(x,d=2)=>Number(x).toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(x,d=0)=>nf(x*100,d)+" %";
const sgn=(x,d=1)=>(x>=0?"+":"−")+nf(Math.abs(x)*100,d)+" %";
const store={get(k,f){try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch(e){return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const key=f=>(f.date+"|"+f.home+"|"+f.away).replace(/[^A-Za-z0-9]/g,"");
D.fixtures.forEach(f=>f.key=key(f));
const byKey=Object.fromEntries(D.fixtures.map(f=>[f.key,f]));
const parseD=s=>{const[d,m,y]=s.split("/").map(Number);return new Date(y,m-1,d)};
const dayLabel=s=>parseD(s).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
const STRAT=Object.fromEntries(D.table.map(t=>[t.label,t]));
const BIG=STRAT["Gros favoris (proba marche >= 73 %)"];
const big=f=>!f.far&&Math.max(...f.market)>=.73;
const DCR=D.dc.sets.all.regle_avg;
const pickLabel=f=>[f.home,"Nul",f.away][f.market.indexOf(Math.max(...f.market))];
const devig2=(a,b)=>a&&b?(1/a)/(1/a+1/b):null;

/* ---------- Matchs ---------- */
const S={league:"all",day:"",kind:"all",open:new Set(),mine:{},ticket:store.get("jc-ticket",null),stake:store.get("jc-stake",1000),period:"all"};
function chips(el,items,cur,fn){el.innerHTML=items.map(([v,l])=>`<button class="chip" type="button" data-v="${esc(v)}" aria-pressed="${v===cur}">${esc(l)}</button>`).join("");
  el.onclick=e=>{const b=e.target.closest("button");if(b)fn(b.dataset.v)}}
function barHTML(p){return `<div class="bar" role="img" aria-label="Domicile ${pct(p[0])}, nul ${pct(p[1])}, extérieur ${pct(p[2])}">${[["s1",0],["sx",1],["s2",2]].map(([c,i])=>`<i class="${c}" style="width:${p[i]*100}%"></i>`).join("")}</div>
  <div class="legend"><span><i class="dot s1"></i>1 ${pct(p[0])}</span><span><i class="dot sx"></i>X ${pct(p[1])}</span><span><i class="dot s2"></i>2 ${pct(p[2])}</span></div>`}
function verdict(f,i){const o=parseFloat(S.mine[f.key+i]);if(!o||o<=1)return"";const ev=f.market[i]*o-1,fair=1/f.market[i];
  let t=ev>=0?`<b class="pos">${nf(o)} dépasse le juste prix de ${nf(fair)}</b> : ${sgn(ev)} estimé.`:`<b class="neg">${nf(o)} est sous le juste prix de ${nf(fair)}</b> : ${sgn(ev)} estimé.`;
  if(ev>=0)t+=o>=4?" Attention : sur le passé, ce type d'écart sur les grosses cotes a perdu de l'argent.":" Un écart positif reste une estimation, pas une preuve.";
  return `${esc(ISSUES[i])} : ${t}`}
function detailHTML(f){
  const pO=devig2(f.ao25,f.au25),inT=(S.ticket||[]).filter(l=>l.key===f.key).map(l=>l.i);
  const rows=ISSUES.map((n,i)=>`<tr><td>${n==="1"?esc(f.home):n==="2"?esc(f.away):"Nul"}</td><td>${pct(f.market[i])}</td><td>${nf(1/f.market[i])}</td>${!f.odds?"":`<td>${nf(f.odds[i])}</td><td>${nf(f.max[i])}</td>`}
  <td><input class="mini" id="mc-${f.key}-${i}" data-mine="${f.key}" data-i="${i}" type="number" min="1.01" step="0.01" inputmode="decimal" aria-label="Ma cote pour ${n}" value="${esc(S.mine[f.key+i]||"")}"></td>
  ${!f.odds?"":`<td><button class="ghost" type="button" data-add="${f.key}" data-i="${i}">${inT.includes(i)?"Retirer":"Au ticket"}</button></td>`}</tr>`).join("");
  return `${barHTML(f.market)}${f.sure?`<p class="note">Pari le plus sûr : <b>${esc(f.sure.label)}</b>, ${pct(f.sure.p)}, ${f.sure.odds?"cote "+nf(f.sure.odds):"juste prix "+nf(1/f.sure.p)}.</p>`:""}${f.intl?`<p class="warnbox">Sélections nationales : probabilités tirées du classement Elo (${f.elo[0]} contre ${f.elo[1]}), sans cote du marché. Méthode testée sur ${D.intl_test?D.intl_test.n.toLocaleString("fr-FR"):"?"} matchs récents, plus précise que le hasard, non comparée aux cotes.</p>`:f.far?'<p class="warnbox">Prévision Dixon-Coles seule, sans cote du marché, donc moins précise. La date peut changer, et elle ne compte pas dans nos résultats.</p>':""}
  <div class="scroll"><table><thead><tr><th>Issue</th><th>Proba</th><th>Juste prix</th>${!f.odds?"":"<th>Moyenne</th><th>Meilleure</th>"}<th>Ma cote</th>${!f.odds?"":"<th></th>"}</tr></thead><tbody>${rows}</tbody></table></div>
  <p class="verdict" id="v-${f.key}" role="status">${[0,1,2].map(i=>verdict(f,i)).filter(Boolean).join("<br>")}</p>
  <div class="second">
    ${pO?`<div class="kv"><b>${pct(pO)}</b><small>Plus de 2,5 buts (marché)</small></div>`:`<div class="kv"><b>${pct(f.o25)}</b><small>Plus de 2,5 buts (Dixon-Coles)</small></div>`}
    <div class="kv"><b>${pct(f.btts)}</b><small>Les deux marquent (Dixon-Coles)</small></div>
    <div class="kv"><b>${nf(f.xg[0],1)} – ${nf(f.xg[1],1)}</b><small>Buts attendus (Dixon-Coles)</small></div>
    <div class="kv"><b>${esc(f.score)}</b><small>Score le plus probable (Dixon-Coles)</small></div>
    ${f.far?"":`<div class="kv"><b>${f.model.map(x=>pct(x)).join(" · ")}</b><small>Deuxième avis 1 X 2 (Dixon-Coles, moins précis que le marché)</small></div>`}
  </div>
  ${f.signal?`<p class="warnbox">Signal Dixon-Coles : ${esc(f.signal.label)} à ${nf(f.signal.odds)}, écart de ${sgn(f.signal.edge)}. ${f.top?`Sur l'historique, cette règle a donné ${sgn(DCR.roi)} sur ${DCR.n.toLocaleString("fr-FR")} paris (fourchette ${sgn(DCR.lo)} à ${sgn(DCR.hi)}). Ce n'est pas prouvé.`:"Cette règle n'a pas été testée sur ce championnat."}</p>`:f.thin?'<p class="note">Trop peu de matchs joués par une équipe : probabilités Dixon-Coles fragiles, pas de signal.</p>':""}
  <h2>Tous les types de paris</h2>
  <p class="lead">${f.intl?"Calculé avec le classement Elo.":f.far?"Calculé avec Dixon-Coles.":"Calculé à partir des cotes du match."} Colonnes : probabilité, puis juste prix. Comparez avec la cote de votre bookmaker.${f.cc&&(f.cc[0]||f.cc[1])?" Corners et cartons : moyennes récentes des équipes, estimation simple non testée.":""}</p>
  ${marketsHTML(f)}
  ${big(f)&&f.top?`<p class="note">Gros favori : ${BIG.all.wins} gagnés sur ${BIG.all.n} sur l'historique, soit ${sgn(BIG.all.roi)} de rendement (fourchette ${sgn(BIG.all.lo)} à ${sgn(BIG.all.hi)}). Ce n'est pas prouvé.</p>`:""}`}
function dayChip(d,i){const t=parseD(d),now=new Date();now.setHours(0,0,0,0);const n=Math.round((t-now)/864e5);
  return n===0?"Aujourd'hui":n===1?"Demain":t.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
function renderMatches(){
  const have=[...new Set(D.fixtures.map(f=>f.date))].sort((a,b)=>parseD(a)-parseD(b)),days=[];
  if(have.length){const t0=new Date();t0.setHours(0,0,0,0);const end=parseD(have[have.length-1]);for(let t=new Date(Math.min(t0,parseD(have[0])));t<=end;t.setDate(t.getDate()+1)){if(t<t0)continue;days.push(String(t.getDate()).padStart(2,"0")+"/"+String(t.getMonth()+1).padStart(2,"0")+"/"+t.getFullYear())}}
  if(!days.includes(S.day))S.day=days.find(d=>have.includes(d))||days[0]||"";
  const onDay=f=>f.date===S.day,kindOk=f=>S.kind==="all"||(S.kind==="big"?big(f):S.kind==="sig"?!!f.signal:S.kind==="sure"?!!(f.sure&&f.sure.p>=.7):f.far&&!f.intl);
  const lgs=[...new Set(D.fixtures.map(f=>f.lg))].sort((a,b)=>{const x=D.fixtures.find(f=>f.lg===a),y=D.fixtures.find(f=>f.lg===b);return (y.top-x.top)||LG[a].localeCompare(LG[b],"fr")});
  const count=l=>D.fixtures.filter(f=>f.lg===l&&onDay(f)&&kindOk(f)).length;
  chips($("f-day"),days.map(d=>[d,dayChip(d)]),S.day,v=>{S.day=v;renderMatches()});
  $("f-day").querySelectorAll(".chip").forEach(b=>{const n=D.fixtures.filter(f=>f.date===b.dataset.v).length;b.insertAdjacentHTML("beforeend",`<small>${n}</small>`);if(!n)b.classList.add("empty")});
  chips($("f-league"),[["all","Tous les championnats"],...lgs.filter(l=>l===S.league||count(l)>0).map(l=>[l,LG[l]])],S.league,v=>{S.league=v;renderMatches()});
  chips($("f-kind"),[["all","Tous"],["sure","Plus sûrs"],["big","Gros favoris"],["sig","Signaux Dixon-Coles"],["far","Prévisions"]],S.kind,v=>{S.kind=v;renderMatches()});
  $("f-league").querySelectorAll(".chip").forEach(b=>{const v=b.dataset.v,n=v==="all"?D.fixtures.filter(f=>onDay(f)&&kindOk(f)).length:count(v);b.insertAdjacentHTML("beforeend",`<small>${n}</small>`)});
  const L=D.fixtures.filter(f=>onDay(f)&&kindOk(f)&&(S.league==="all"||f.lg===S.league));
  const order=[...lgs],G=new Map();L.sort((a,b)=>order.indexOf(a.lg)-order.indexOf(b.lg)||a.ko.localeCompare(b.ko)).forEach(f=>{if(!G.has(f.lg))G.set(f.lg,[]);G.get(f.lg).push(f)});
  let h="";
  if(S.kind==="sure"){G.clear();if(L.length)G.set("__sure",[...L].sort((a,b)=>b.sure.p-a.sure.p))}
  h+=S.kind==="sure"&&L.length?'<p class="note" style="margin:8px">Les paris les plus probables du jour, tous types confondus. Une forte probabilité va avec une cote faible : ce n\'est pas forcément un bon pari.</p>':"";
  for(const[lg,ms]of G){h+=`<div class="group"><span>${lg==="__sure"?"Les plus sûrs":esc(LG[lg])}</span><small>${ms.length}</small></div>`;
    for(const f of ms){const open=S.open.has(f.key),ev=window.LIVE&&window.LIVE.get(f.key),on=ev&&ev.state!=="pre";
      const lp=ev&&ev.state==="in"&&typeof liveProbs==="function"?liveProbs(ev):null,pm=lp||f.market,m=Math.max(...pm),i=pm.indexOf(m);
      const tm=on?clockLabel(ev):f.far&&!f.intl?"Prév.":new Date(f.ko).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
      const su=f.sure;
      h+=`<article class="match${on?" live":""}"><button class="mhead" type="button" data-open="${f.key}" aria-expanded="${open}">
        <span class="time${ev&&ev.state==="in"?" now":""}">${esc(tm)}</span>
        <span class="teams"><span>${esc(f.home)}</span><span>${esc(f.away)}</span><span class="bar" aria-hidden="true">${[["s1",0],["sx",1],["s2",2]].map(([c,k])=>`<i class="${c}" style="width:${pm[k]*100}%"></i>`).join("")}</span></span>
        ${on?`<span class="scoreb"><b>${ev.hg}</b><b>${ev.ag}</b></span>`:f.odds?`<span class="odds">${f.odds.map((o,k)=>`<span class="${k===i?"best":""}">${nf(o)}</span>`).join("")}</span>`:""}
        <span class="pred"><b>${esc([f.home,"Nul",f.away][i])}</b><small>${pct(m)}${lp?" en direct":ev&&ev.state==="post"?" avant match":f.odds?` · ${nf(f.odds[i])}`:""}</small><span class="tags">${big(f)?'<span class="tag">Favori</span>':""}${f.signal?'<span class="tag">Signal</span>':""}</span></span>
        ${su&&!on?`<span class="surec"><b>${esc(su.label)}</b><small>${pct(su.p)} · ${su.odds?nf(su.odds):"juste "+nf(1/su.p)}</small></span>`:""}</button>
        ${open?`<div class="detail">${detailHTML(f)}</div>`:""}</article>`}}
  $("m-list").innerHTML=h||'<p class="lead" style="padding:12px">Aucun match pour ce filtre.</p>';
}
$("m-list").addEventListener("click",e=>{
  const o=e.target.closest("[data-open]"),a=e.target.closest("[data-add]");
  if(o){const k=o.dataset.open;S.open.has(k)?S.open.delete(k):S.open.add(k);renderMatches();return}
  if(a){toggleLeg(a.dataset.add,+a.dataset.i);renderMatches();return}
  const m=e.target.closest("[data-mk]");if(m)addMarket(m.dataset.mk,m.dataset.l,+m.dataset.p)
});
$("m-list").addEventListener("input",e=>{const m=e.target.dataset.mine;if(!m)return;const i=+e.target.dataset.i,f=byKey[m];S.mine[m+i]=e.target.value;
  const leg=(S.ticket||[]).find(l=>l.key===m&&l.i===i);if(leg&&parseFloat(e.target.value)>1){leg.o=parseFloat(e.target.value);saveTicket()}
  $("v-"+m).innerHTML=[0,1,2].map(j=>verdict(f,j)).filter(Boolean).join("<br>")});

/* ---------- Ticket ---------- */
let example=false;
function saveTicket(){if(!example)store.set("jc-ticket",S.ticket);renderTicket()}
function seedTicket(){if(S.ticket&&S.ticket.length)return;example=true;
  S.ticket=D.fixtures.filter(big).sort((a,b)=>Math.max(...b.market)-Math.max(...a.market)).slice(0,4).map(f=>{const i=f.market.indexOf(Math.max(...f.market));return{key:f.key,i,o:f.odds[i]}})}
function toggleLeg(k,i){if(example){S.ticket=[];example=false}S.ticket=S.ticket||[];
  const ex=S.ticket.findIndex(l=>l.key===k);const same=ex>=0&&S.ticket[ex].i===i;if(ex>=0)S.ticket.splice(ex,1);
  if(!same){const m=parseFloat(S.mine[k+i]);S.ticket.push({key:k,i,o:m>1?m:byKey[k].odds[i]})}saveTicket()}
const legP=l=>l.p!=null?l.p:byKey[l.key].market[l.i],legName=l=>l.m||ISSUES[l.i];
function addMarket(k,label,p){if(example){S.ticket=[];example=false}S.ticket=S.ticket||[];const ex=S.ticket.findIndex(l=>l.key===k);if(ex>=0)S.ticket.splice(ex,1);S.ticket.push({key:k,m:label,p,o:+(1/p).toFixed(2)});saveTicket();location.hash="ticket"}
function ticketCalc(){const L=(S.ticket||[]).filter(l=>byKey[l.key]);let p=1,o=1;for(const l of L){p*=legP(l);o*=l.o}return{L,p,o,ev:p*o-1}}
function renderTicket(){
  const{L,p,o,ev}=ticketCalc();
  const ex=$("t-example");ex.hidden=!example;if(example)ex.textContent="Exemple : les plus gros favoris de ces matchs, aux cotes moyennes. Ajoutez une sélection depuis Matchs pour commencer votre ticket.";
  $("t-legs").innerHTML=L.length?L.map((l,n)=>{const f=byKey[l.key],q=legP(l);return `<div class="leg"><div><b>${esc(f.home)} – ${esc(f.away)}</b><small>${esc(legName(l))} · ${pct(q)} · juste prix ${nf(1/q)}${l.est?" · cote estimée, à remplacer":""}</small></div>
    <input class="mini" id="tl-${l.key}" data-leg="${n}" type="number" min="1.01" step="0.01" inputmode="decimal" aria-label="Cote" value="${l.o}">
    <button class="ghost" type="button" data-del="${n}">Retirer</button></div>`}).join(""):'<p class="lead">Ticket vide. Ouvrez un match dans Matchs, puis choisissez « Au ticket ».</p>';
  const stake=parseFloat($("t-stake").value)||0;
  $("t-figs").innerHTML=L.length?`
   <div class="fig"><b>${nf(o)}</b><span>Cote totale</span></div>
   <div class="fig"><b>${pct(p,1)}</b><span>Chance que tout passe, soit ${nf(p*100,0)} tickets sur 100</span></div>
   <div class="fig"><b>${pct(1/o,1)}</b><span>Chance nécessaire pour être à l'équilibre</span></div>
   <div class="fig"><b class="${ev>=0?"pos":"neg"}">${sgn(ev)}</b><span>Résultat moyen estimé, soit ${ev>=0?"+":"−"}${nf(Math.abs(ev*stake),0)} pour cette mise</span></div>`:"";
}
$("t-stake").value=S.stake;
$("t-stake").addEventListener("input",()=>{store.set("jc-stake",parseFloat($("t-stake").value)||0);renderTicket()});
$("t-legs").addEventListener("input",e=>{const n=e.target.dataset.leg;if(n==null)return;const v=parseFloat(e.target.value);if(v>1){S.ticket[+n].o=v;if(!example)store.set("jc-ticket",S.ticket);
  const pos=e.target.id,val=e.target.value;renderTicket();const el=$(pos);if(el){el.value=val;el.focus()}}});
$("t-legs").addEventListener("click",e=>{const b=e.target.closest("[data-del]");if(!b)return;if(example)example=false;S.ticket.splice(+b.dataset.del,1);saveTicket();renderMatches()});

/* ---------- Generateur de ticket ---------- */
const genTypes=()=>[...document.querySelectorAll("#g-types [data-gt]")].filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.gt);
$("g-types").addEventListener("click",e=>{const b=e.target.closest("[data-gt]");if(!b)return;const v=b.dataset.gt;const all=[...document.querySelectorAll("#g-types [data-gt]")].filter(x=>!x.dataset.gt.startsWith("__"));if(v==="__all")all.forEach(x=>x.setAttribute("aria-pressed","true"));else if(v==="__none")all.forEach(x=>x.setAttribute("aria-pressed","false"));else b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")==="true"?"false":"true")});
let genUsed=new Set();
function genTicket(again){
  const target=parseFloat(String($("g-target").value).replace(",",".")),period=+$("g-period").value,types=genTypes(),max=+$("g-max").value,scope=$("g-scope").value;
  if(!(target>=1.05&&target<=100000)){$("g-msg").textContent="Entrez une cote visée entre 1,05 et 100 000, par exemple 2,5.";return}
  if(!types.length){$("g-msg").textContent="Cochez au moins un type de pari.";return}
  if(!again)genUsed=new Set();
  const t0=new Date();t0.setHours(0,0,0,0);const now=Date.now(),cands=[];
  for(const f of D.fixtures){const ko=new Date(f.ko).getTime();if(ko<now+6e5||(ko-t0)/864e5>=period+1)continue;
    if(scope==="top"&&!f.top)continue;if(scope==="clubs"&&f.intl)continue;if(genUsed.has(f.key)||!f.lam)continue;
    const rows=[];
    for(const g of allMarkets(f))if(types.includes(g.t))g.rows.forEach(([l,p],k)=>{if(p<.3||p>.96)return;
      let o=null;if(g.t==="Résultat"&&f.odds)o=f.odds[k];if(g.t==="Total de buts"&&f.ao25&&/2,5/.test(l))o=/^Plus/.test(l)?f.ao25:f.au25;
      const est=!o;if(est)o=Math.max(1.01,(1/p)*.93);if(o<1.04)return;rows.push({f,label:g.t+" : "+l,p,o,est})});
    if(rows.length)cands.push(rows)}
  let plan=null;
  for(let n=max;n>=Math.min(2,max)&&!plan;n--){const q=Math.pow(target,1/n),per=[];
    for(const rows of cands){let b=null;for(const r of rows)if(r.o>=q&&(!b||r.p+(r.est?0:.01)>b.p+(b.est?0:.01)))b=r;if(b)per.push(b)}
    per.sort((x,y)=>y.p-x.p);const legs=[],perLg={};
    for(const c of per){if(legs.length>=n)break;if((perLg[c.f.lg]||0)>=2)continue;legs.push(c);perLg[c.f.lg]=(perLg[c.f.lg]||0)+1}
    if(legs.length<n)continue;const odds=legs.reduce((m,c)=>m*c.o,1),prob=legs.reduce((m,c)=>m*c.p,1);
    if(odds<target*.97)continue;if(!plan||prob>plan.prob)plan={legs,odds,prob}}
  const legs=plan?plan.legs:[],odds=plan?plan.odds:0;
  if(!legs.length){$("g-msg").textContent="Impossible d'atteindre cette cote avec ces critères. Baissez la cote visée, ajoutez des sélections ou élargissez la période.";return}
  legs.forEach(c=>genUsed.add(c.f.key));
  S.ticket=legs.map(c=>({key:c.f.key,m:c.label,p:c.p,o:+c.o.toFixed(2),est:c.est}));example=false;saveTicket();renderMatches();
  const{p,o}=ticketCalc(),ne=legs.filter(c=>c.est).length;
  $("g-msg").innerHTML=`${legs.length<max?`Seulement ${legs.length} sélections possibles pour cette cote. `:""}${odds>target*1.5?"La cote dépasse nettement la cote visée : les paris de ces types ont des cotes trop élevées pour autant de sélections. ":""}${legs.length} sélections sur ${legs.length} matchs différents, cote ${nf(o)}, <b>${pct(p,1)}</b> de chances que tout passe.${ne?` ${ne} cote${ne>1?"s":""} estimée${ne>1?"s":""} à partir du juste prix : remplacez-${ne>1?"les par celles":"la par celle"} de votre bookmaker.`:""}`;
}
$("g-run").addEventListener("click",()=>genTicket(false));
$("g-again").addEventListener("click",()=>genTicket(true));

/* ---------- Preuves ---------- */
function renderProof(){
  const T=D.dc.sets.test;
  $("p-lead").textContent=`${D.dc.n.toLocaleString("fr-FR")} matchs rejoués avec Dixon-Coles, sans information postérieure au coup d'envoi. Son meilleur poids face au marché est de ${pct(D.dc.weight)} : les cotes moyennes restent la référence la plus précise.`;
  $("p-figs").innerHTML=`
   <div class="fig"><b>${D.dc.n.toLocaleString("fr-FR")}</b><span>Matchs testés, ${T.n} pour la saison ${D.test_label}</span></div>
   <div class="fig"><b>${nf(T.ll_market,3)}</b><span>Erreur du marché en ${D.test_label} (plus bas = mieux)</span></div>
   <div class="fig"><b>${nf(T.ll_dc,3)}</b><span>Erreur de Dixon-Coles sur la même saison</span></div>`;
  chips($("f-period"),[["all","Depuis "+D.first_eval],["test","Saison "+D.test_label]],S.period,v=>{S.period=v;renderProof()});
  const lo=-.8,hi=.3,x=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
  const NAMES={"Toujours le favori":"Toujours parier le favori","Gros favoris (proba marche >= 73 %)":"Gros favoris (probabilité de 73 % ou plus)","Modele seul, avantage >= 5 %":"Écart du modèle de 5 % ou plus","Modele seul, avantage >= 10 %":"Écart du modèle de 10 % ou plus","Meilleure cote, avantage >= 2 %":"Meilleure cote, 2 % au-dessus du juste prix","Meilleure cote, avantage >= 4 %":"Meilleure cote, 4 % au-dessus du juste prix"};
  const DS=D.dc.sets[S.period];
  const DC=[["Dixon-Coles, écart de 5 à 20 %, cotes Bet365",DS.regle_b365],["Dixon-Coles, même règle, mises Kelly/4",DS.regle_b365_kelly],["Dixon-Coles, écart de 5 à 20 %, cotes moyennes",DS.regle_avg],["Dixon-Coles, 1 X 2 seul",DS["1x2_avg"]],["Dixon-Coles, écart de 10 à 20 %",DS.edge10_avg]];
  const R=[...D.table.filter(t=>t[S.period].n>0&&!t.label.startsWith("Modele")).map(t=>({l:NAMES[t.label]||t.label,...t[S.period]})),...DC.map(([l,r])=>({l,...r}))].sort((a,b)=>b.roi-a.roi);
  $("p-ranges").innerHTML=R.map(r=>`<div class="range" title="${r.n} paris, ${r.wins} gagnés, cote moyenne ${nf(r.avg_odds)}">
    <div class="rhead"><span>${esc(r.l)}</span><b class="${r.lo>0?"pos":r.hi<0?"neg":""}">${sgn(r.roi)}</b></div>
    <div class="track"><span class="zero" style="left:${x(0)}%"></span><span class="ci" style="left:${x(r.lo)}%;width:${x(r.hi)-x(r.lo)}%"></span><span class="pt" style="left:${x(r.roi)}%"></span></div>
    <div class="meta">${r.n} paris · ${pct(r.hit)} gagnés · cote moyenne ${nf(r.avg_odds)} · fourchette ${sgn(r.lo,0)} à ${sgn(r.hi,0)}</div></div>`).join("")+
   `<div class="axis-wrap" aria-hidden="true">${[-.8,-.4,0,.3].map(v=>`<span style="left:${x(v)}%">${v>0?"+":v<0?"−":""}${Math.abs(v*100)} %</span>`).join("")}</div>`;
  const W=360,H=300,M={l:34,r:12,t:10,b:30},sx=v=>M.l+v*(W-M.l-M.r),sy=v=>H-M.b-v*(H-M.t-M.b);
  const ticks=[0,.25,.5,.75,1];
  $("p-calib").innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Probabilité annoncée contre fréquence observée" style="width:100%;max-width:440px;display:block;margin:auto">
   ${ticks.map(t=>`<line x1="${M.l}" x2="${W-M.r}" y1="${sy(t)}" y2="${sy(t)}" stroke="var(--line)"/><text x="${M.l-6}" y="${sy(t)+4}" text-anchor="end">${t*100}</text><text x="${sx(t)}" y="${H-M.b+16}" text-anchor="middle">${t*100}</text>`).join("")}
   <line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(1)}" y2="${sy(1)}" stroke="var(--muted)" stroke-dasharray="4 4"/>
   ${D.calib.map(c=>`<circle cx="${sx(c.pred)}" cy="${sy(c.obs)}" r="${5}" fill="var(--c1)" stroke="var(--panel)" stroke-width="2"><title>Annoncé ${pct(c.pred,1)}, observé ${pct(c.obs,1)}, ${c.n} issues</title></circle>`).join("")}
   <text x="${(M.l+W-M.r)/2}" y="${H-2}" text-anchor="middle">Probabilité annoncée (%)</text></svg>`;
  $("p-calib-table").innerHTML=`<table><thead><tr><th>Tranche</th><th>Annoncé</th><th>Observé</th><th>Issues</th></tr></thead><tbody>${D.calib.map(c=>`<tr><td>${c.lo*100} à ${c.hi*100} %</td><td>${pct(c.pred,1)}</td><td>${pct(c.obs,1)}</td><td>${c.n}</td></tr>`).join("")}</tbody></table>`;
  $("p-method").innerHTML=[
   "Les probabilités affichées viennent des cotes moyennes de plusieurs bookmakers, une fois leur marge retirée proportionnellement. Les prévisions lointaines, sans cote, viennent de Dixon-Coles seul et ne sont pas enregistrées dans nos résultats.",
   "Tous les types de paris sont calculés avec les buts attendus déduits des cotes du match. Seul le résultat 1 X 2 a été testé. Les pronostics en direct utilisent le score, le temps restant et les cartons rouges. Ils ne sont pas testés et ne comptent pas dans nos résultats.",
   "Les tests historiques ci-dessus portent sur les cinq grands championnats européens. Les autres championnats affichés n'ont pas été testés.",
   "Sélections nationales (Ligue des nations, qualifications CAN, amicaux) : probabilités tirées d'un classement Elo calculé sur l'historique international de martj42, sans cote. Ces matchs ne comptent pas dans nos résultats.",
   "Les coupes d'Europe et les championnats africains de clubs n'ont pas de pronostic : aucune source gratuite ne fournit à la fois leurs cotes et leur historique. Leurs scores sont visibles dans le Direct.",
   "Le deuxième avis vient de notre modèle Dixon-Coles domicile/extérieur, réajusté à chaque mise à jour. Ses signaux suivent une règle fixe : écart de 5 à 20 %, au moins 10 matchs joués par équipe.",
   `Le test de Dixon-Coles a réajusté le modèle chaque semaine, ${D.dc.fits} fois, sur les seuls matchs déjà joués, et garde le meilleur pari par match. Il date du 6 novembre 2026 et n'est pas refait à chaque mise à jour.`,
   `Le poids de Dixon-Coles est choisi sur les saisons ${D.first_label} et ${D.mid_label}, avant le test sur ${D.test_label}. La saison ${D.first_label} sert surtout de préparation.`,
   `Le xG n'est disponible que pour une partie des matchs, soit ${D.n_xg} matchs sur ${D.n_matches.toLocaleString("fr-FR")}.`,
   `La saison ${D.test_label} reste un petit échantillon, surtout pour les gros favoris. Un bon résultat récent peut venir du hasard.`,
   `Dernier résultat intégré : ${new Date(D.last_result).toLocaleDateString("fr-FR")}. Source : football-data.co.uk. Mise à jour automatique plusieurs fois par jour dès que la source publie.`
  ].map(t=>`<li>${esc(t)}</li>`).join("");
}

/* ---------- Journal ---------- */
let bets=[],col=null;
function renderJournal(){
  const done=bets.filter(b=>b.status!=="open"),st=done.reduce((a,b)=>a+b.stake,0),pnl=done.reduce((a,b)=>a+(b.status==="won"?b.stake*(b.odds-1):-b.stake),0),won=done.filter(b=>b.status==="won").length;
  const withP=done.filter(b=>b.prob),exp=withP.reduce((a,b)=>a+b.stake*(b.prob*b.odds-1),0);
  $("j-figs").innerHTML=done.length?`
   <div class="fig"><b class="${pnl>=0?"pos":"neg"}">${st?sgn(pnl/st):"–"}</b><span>Rendement sur ${done.length} pari${done.length>1?"s":""} réglé${done.length>1?"s":""}</span></div>
   <div class="fig"><b>${nf(pnl,0)}</b><span>Gain ou perte, pour ${nf(st,0)} misés</span></div>
   <div class="fig"><b>${pct(won/done.length)}</b><span>Paris gagnés</span></div>
   ${withP.length?`<div class="fig"><b>${nf(exp,0)}</b><span>Résultat attendu d'après les probabilités</span></div>`:""}`:"";
  $("j-list").innerHTML=bets.length?`<h2>Historique</h2>`+[...bets].sort((a,b)=>b.at-a.at).map(b=>`<div class="leg" style="grid-template-columns:minmax(0,1fr) 110px auto">
    <div><b>${esc(b.label)}</b><small>Cote ${nf(b.odds)} · mise ${nf(b.stake,0)}${b.prob?` · ${pct(b.prob,1)}`:""}</small></div>
    <select id="st-${esc(b.id)}" data-status="${esc(b.id)}" aria-label="État du pari"><option value="open"${b.status==="open"?" selected":""}>En cours</option><option value="won"${b.status==="won"?" selected":""}>Gagné</option><option value="lost"${b.status==="lost"?" selected":""}>Perdu</option></select>
    <button class="ghost" type="button" data-rm="${esc(b.id)}">Supprimer</button></div>`).join(""):'<p class="lead">Aucun pari pour le moment. Ajoutez le premier avec le formulaire, ou notez un ticket depuis l\'onglet Ticket.</p>';
}
async function addBet(b){b.id="b"+Date.now()+Math.floor(Math.random()*1e4);b.at=Date.now();b.status="open";
  if(col){await col.doc(b.id).set(b)}else{bets.push(b);store.set("jc-bets",bets);renderJournal()}}
async function patchBet(id,patch){const b=bets.find(x=>x.id===id);if(!b)return;Object.assign(b,patch);if(col)await col.doc(id).update(patch);else store.set("jc-bets",bets);renderJournal()}
async function rmBet(id){bets=bets.filter(x=>x.id!==id);if(col)await col.doc(id).delete();else store.set("jc-bets",bets);renderJournal()}
$("j-form").addEventListener("submit",async e=>{e.preventDefault();const odds=parseFloat($("j-odds").value),stake=parseFloat($("j-stake").value),p=parseFloat($("j-prob").value);
  try{await addBet({label:$("j-label").value.trim(),odds,stake,prob:p>0?p/100:null});$("j-form").reset();$("j-msg").textContent="Pari ajouté."}catch(err){$("j-msg").textContent="L'enregistrement a échoué. Réessayez dans un instant."}});
$("j-list").addEventListener("change",e=>{const id=e.target.dataset.status;if(id)patchBet(id,{status:e.target.value}).catch(()=>{$("j-msg").textContent="La modification n'a pas été enregistrée."})});
$("j-list").addEventListener("click",e=>{const b=e.target.closest("[data-rm]");if(!b)return;
  if(b.dataset.sure){rmBet(b.dataset.rm).catch(()=>{$("j-msg").textContent="La suppression a échoué."})}else{b.dataset.sure="1";b.textContent="Confirmer"}});
$("t-log").addEventListener("click",async()=>{const{L,p,o}=ticketCalc(),stake=parseFloat($("t-stake").value);
  if(!L.length||!(stake>0)){$("t-msg").textContent="Ajoutez au moins une sélection et une mise.";return}
  const label=L.map(l=>`${byKey[l.key].home}–${byKey[l.key].away} (${legName(l)})`).join(", ").slice(0,120);
  try{await addBet({label,odds:+o.toFixed(3),stake,prob:p});$("t-msg").textContent="Ticket noté dans le journal."}catch(err){$("t-msg").textContent="L'enregistrement a échoué. Réessayez dans un instant."}});
function bootJournal(){bets=store.get("jc-bets",[]);renderJournal()}

/* ---------- Resultats ---------- */
function renderResults(){
  const Sv=D.suivi,reg=D.registre,done=reg.filter(x=>x.result),wait=reg.filter(x=>!x.result&&!x.void);
  const first=reg.length?new Date(reg[reg.length-1].created).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"";
  $("r-lead").textContent=reg.length?`Chaque pronostic est enregistré avant le coup d'envoi, puis comparé au score final, sans retouche. Les scores arrivent quelques heures après le match. Suivi public depuis le ${first}.`:"Le suivi public commence avec les prochains matchs.";
  const fig=(r,l)=>r.n?`<div class="fig"><b class="${r.roi>=0?"pos":"neg"}">${sgn(r.roi)}</b><span>${l} : ${r.wins} gagnés sur ${r.n}, ${pct(r.hit)}, cote moyenne ${nf(r.avg_odds)}</span></div>`:"";
  $("r-figs").innerHTML=Sv.pick.n?fig(Sv.pick,"Pronostics")+(Sv.sure&&Sv.sure.n?`<div class="fig"><b>${pct(Sv.sure.hit)}</b><span>Paris les plus sûrs réussis : ${Sv.sure.wins} sur ${Sv.sure.n}, pour ${pct(Sv.sure.expected)} annoncés</span></div>`:"")+fig(Sv.big,"Gros favoris")+fig(Sv.signal,"Signaux Dixon-Coles"):`<div class="fig"><b>${wait.length}</b><span>Pronostics en attente de résultat. Les résultats arrivent dans les jours suivant le match.</span></div>`;
  const row=x=>{const r=x.result,sig=x.signal;return `<div class="result"><div><b>${esc(x.home)} – ${esc(x.away)}</b><small>${esc(new Date(x.ko).toLocaleDateString("fr-FR",{day:"numeric",month:"short"}))} · ${esc(x.league)} · Pronostic ${esc(x.pick.label)}, ${pct(x.pick.p)}, cote ${nf(x.pick.odds)}${sig?` · Signal ${esc(sig.label)} à ${nf(sig.odds)}`:""}${x.sure?` · Sûr : ${esc(x.sure.label)} ${pct(x.sure.p)}${r&&r.sure!=null?(r.sure?" ✓":" ✗"):""}`:""}</small></div>
   <div class="tick ${r?(r.pick?"pos":"neg"):""}">${r?`${r.hg} – ${r.ag} · ${r.pick?"Gagné":"Perdu"}`:x.void?"Annulé":new Date(x.ko)>new Date()?"À venir":"En attente"}</div></div>`};
  const past=[...done,...wait].filter(x=>new Date(x.ko)<=new Date()).sort((a,b)=>b.ko.localeCompare(a.ko)),soon=wait.filter(x=>new Date(x.ko)>new Date()).length;
  $("r-list").innerHTML=reg.length?`<h2>Historique</h2>${soon?`<p class="lead">${soon} pronostics enregistrés pour des matchs à venir.</p>`:""}`+past.slice(0,200).map(row).join(""):'<p class="lead">Aucun pronostic enregistré pour le moment.</p>';
}

/* ---------- Navigation ---------- */
const VIEWS=["matchs","direct","resultats","ticket","preuves","journal"];
function route(){const v=VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):"matchs";
  document.querySelectorAll("[data-view]").forEach(s=>s.hidden=s.dataset.view!==v);
  document.querySelectorAll("[data-nav]").forEach(a=>{if(a.dataset.nav===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  window.scrollTo(0,0)}
addEventListener("hashchange",route);

const days=[...new Set(D.fixtures.map(f=>f.date))];
const fd=new Date(D.fetched);const fetched=isNaN(fd)?"dernier relevé":fd.toLocaleString("fr-FR",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC"})+" GMT";
const nb=D.fixtures.filter(f=>!f.far).length,nf2=D.fixtures.filter(f=>f.far).length,nl=new Set(D.fixtures.map(f=>f.lg)).size;
$("m-lead").textContent=D.fixtures.length?`${nb} matchs avec cotes et ${nf2} prévisions sur ${nl} championnats. Cotes relevées le ${fetched}. Touchez un match pour le détail.`:`Aucun match à venir dans les données relevées le ${fetched}.`;
const lastD=days.length?parseD(days[days.length-1]):null;const today=new Date();today.setHours(0,0,0,0);
if(lastD&&today>lastD){$("m-stale").hidden=false;$("m-stale").textContent="Ces matchs sont passés. De nouveaux matchs arriveront dès que la source les publiera."}
seedTicket();renderMatches();renderResults();renderTicket();renderProof();route();bootJournal();
