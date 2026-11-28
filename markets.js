/* Calcul de tous les marches a partir des buts attendus. Aussi utilise pour le direct : score et temps restant. */
function poissonRow(l,n){const p=[Math.exp(-l)];for(let k=1;k<=n;k++)p.push(p[k-1]*l/k);return p}
function scoreCells(lh,la,rho,hg,ag,n){
  n=n||10;hg=hg||0;ag=ag||0;const a=poissonRow(lh,n),b=poissonRow(la,n),out=[];let t=0;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){let p=a[i]*b[j];
    if(rho){if(i===0&&j===0)p*=1-lh*la*rho;else if(i===0&&j===1)p*=1+lh*rho;else if(i===1&&j===0)p*=1+la*rho;else if(i===1&&j===1)p*=1-rho}
    t+=p;out.push({h:i+hg,a:j+ag,p})}
  out.forEach(c=>c.p/=t);return out}
function sumIf(c,fn){return c.reduce((s,x)=>s+(fn(x)?x.p:0),0)}
function poisOver(m,line){let p=1,t=Math.exp(-m);for(let k=0;k<=Math.floor(line);k++){p-=t;t*=m/(k+1)}return Math.max(0,p)}
function liveCells(f,st){
  const r=Math.max(0,st.left);
  let lh=f.lam[0]*r,la=f.lam[1]*r;
  if(st.redH){lh*=Math.pow(.75,st.redH);la*=Math.pow(1.25,st.redH)}
  if(st.redA){la*=Math.pow(.75,st.redA);lh*=Math.pow(1.25,st.redA)}
  return{cells:scoreCells(lh,la,0,st.hg,st.ag),lh,la}}
function result1x2(c){return[sumIf(c,x=>x.h>x.a),sumIf(c,x=>x.h===x.a),sumIf(c,x=>x.h<x.a)]}
function allMarkets(f,st){
  const H=f.home,A=f.away,live=!!st,G=[];
  const lh=f.lam[0],la=f.lam[1],c=live?liveCells(f,st).cells:scoreCells(lh,la,f.rho||0);
  const P=fn=>sumIf(c,fn),T=x=>x.h+x.a;
  const r=result1x2(c);
  G.push({t:"Résultat",rows:[[H,r[0]],["Nul",r[1]],[A,r[2]]]});
  G.push({t:"Double chance",rows:[[H+" ou nul",r[0]+r[1]],[H+" ou "+A,r[0]+r[2]],["Nul ou "+A,r[1]+r[2]]]});
  G.push({t:"Remboursé si nul",rows:[[H,r[0]/(r[0]+r[2])],[A,r[2]/(r[0]+r[2])]]});
  G.push({t:"Total de buts",rows:[.5,1.5,2.5,3.5,4.5,5.5].flatMap(l=>[["Plus de "+String(l).replace(".",","),P(x=>T(x)>l)],["Moins de "+String(l).replace(".",","),P(x=>T(x)<l)]])});
  G.push({t:"Les deux équipes marquent",rows:[["Oui",P(x=>x.h&&x.a)],["Non",P(x=>!(x.h&&x.a))]]});
  G.push({t:"Buts par équipe",rows:[.5,1.5,2.5].flatMap(l=>[[H+" plus de "+String(l).replace(".",","),P(x=>x.h>l)],[A+" plus de "+String(l).replace(".",","),P(x=>x.a>l)]])});
  G.push({t:"Handicap",rows:[.5,1.5,2.5].flatMap(l=>{const s=String(l).replace(".",",");return[[H+" −"+s,P(x=>x.h-l>x.a)],[H+" +"+s,P(x=>x.h+l>x.a)],[A+" −"+s,P(x=>x.a-l>x.h)],[A+" +"+s,P(x=>x.a+l>x.h)]]})});
  G.push({t:"Écart de buts",rows:[[H+" par 1 but",P(x=>x.h-x.a===1)],[H+" par 2 buts",P(x=>x.h-x.a===2)],[H+" par 3 buts ou plus",P(x=>x.h-x.a>=3)],[A+" par 1 but",P(x=>x.a-x.h===1)],[A+" par 2 buts",P(x=>x.a-x.h===2)],[A+" par 3 buts ou plus",P(x=>x.a-x.h>=3)]]});
  G.push({t:"Résultat et buts",rows:[[H+" et plus de 2,5",P(x=>x.h>x.a&&T(x)>2.5)],[H+" et moins de 2,5",P(x=>x.h>x.a&&T(x)<2.5)],["Nul et plus de 2,5",P(x=>x.h===x.a&&T(x)>2.5)],["Nul et moins de 2,5",P(x=>x.h===x.a&&T(x)<2.5)],[A+" et plus de 2,5",P(x=>x.h<x.a&&T(x)>2.5)],[A+" et moins de 2,5",P(x=>x.h<x.a&&T(x)<2.5)]]});
  G.push({t:"Résultat et les deux marquent",rows:[[H+" et oui",P(x=>x.h>x.a&&x.a>0)],[A+" et oui",P(x=>x.a>x.h&&x.h>0)],["Nul et oui",P(x=>x.h===x.a&&x.h>0)],[H+" sans encaisser",P(x=>x.h>x.a&&x.a===0)],[A+" sans encaisser",P(x=>x.a>x.h&&x.h===0)]]});
  G.push({t:"Clean sheet",rows:[[H+" n'encaisse pas",P(x=>x.a===0)],[A+" n'encaisse pas",P(x=>x.h===0)]]});
  G.push({t:"Buts pair ou impair",rows:[["Pair",P(x=>T(x)%2===0)],["Impair",P(x=>T(x)%2===1)]]});
  G.push({t:"Total exact",rows:[0,1,2,3,4].map(n=>[n+" but"+(n>1?"s":""),P(x=>T(x)===n)]).concat([["5 buts ou plus",P(x=>T(x)>=5)]])});
  G.push({t:"Score exact",rows:[...c].sort((a,b)=>b.p-a.p).slice(0,10).map(x=>[x.h+" – "+x.a,x.p])});
  if(!live){
    const a=scoreCells(lh*.44,la*.44,0,0,0,7),b=scoreCells(lh*.56,la*.56,0,0,0,7),ht=result1x2(a),st2=result1x2(b);
    G.push({t:"Mi-temps",rows:[[H,ht[0]],["Nul",ht[1]],[A,ht[2]],["Plus de 0,5 but",sumIf(a,x=>x.h+x.a>.5)],["Plus de 1,5 but",sumIf(a,x=>x.h+x.a>1.5)]]});
    G.push({t:"2e mi-temps",rows:[[H,st2[0]],["Nul",st2[1]],[A,st2[2]],["Plus de 0,5 but",sumIf(b,x=>x.h+x.a>.5)],["Plus de 1,5 but",sumIf(b,x=>x.h+x.a>1.5)]]});
    const hf=[];const s=(x,y)=>x>y?0:x===y?1:2,N=[H,"Nul",A];
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){let p=0;for(const u of a)if(s(u.h,u.a)===i)for(const v of b)if(s(u.h+v.h,u.a+v.a)===j)p+=u.p*v.p;hf.push([N[i]+" / "+N[j],p])}
    G.push({t:"Mi-temps / fin de match",rows:hf});
    if(f.cc&&f.cc[0])G.push({t:"Corners (total)",rows:[7.5,8.5,9.5,10.5,11.5].flatMap(l=>[["Plus de "+String(l).replace(".",","),poisOver(f.cc[0],l)],["Moins de "+String(l).replace(".",","),1-poisOver(f.cc[0],l)]])});
    if(f.cc&&f.cc[1])G.push({t:"Cartons (total)",rows:[2.5,3.5,4.5,5.5].flatMap(l=>[["Plus de "+String(l).replace(".",","),poisOver(f.cc[1],l)],["Moins de "+String(l).replace(".",","),1-poisOver(f.cc[1],l)]])});
  }else{
    const{lh:rl,la:ra}=liveCells(f,st),q=Math.exp(-(rl+ra)),t=rl+ra||1;
    G.splice(1,0,{t:"Prochain but",rows:[[H,(1-q)*rl/t],["Aucun",q],[A,(1-q)*ra/t]]});
  }
  return G}
if(typeof module!=="undefined")module.exports={scoreCells,allMarkets,result1x2,liveCells,poisOver};
