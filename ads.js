/* Espaces publicitaires : AdSense si un compte est configure, sinon annonces maison qui renvoient vers la page Publicite. */
const ADS_ON=!!(window.CFG&&CFG.adsenseClient);
if(ADS_ON){const s=document.createElement("script");s.async=true;s.crossOrigin="anonymous";s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(CFG.adsenseClient);document.head.appendChild(s)}
function adSlot(place){
  if(ADS_ON){const slot=(CFG.adsenseSlots||{})[place]||"";
    return `<div class="ad ad-${place}" data-adsense="1"><span class="ad-lab">${T("Publicité","Advertisement")}</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(CFG.adsenseClient)}"${slot?` data-ad-slot="${esc(slot)}"`:""} data-ad-format="auto" data-full-width-responsive="true"></ins></div>`}
  return `<a class="ad ad-${place} ad-house" href="#publicite"><span class="ad-lab">${T("Espace publicitaire","Ad space")}</span><b>${T("Votre marque ici","Your brand here")}</b><span>${T("Touchez les parieurs de kcbet chaque jour. Voir les offres →","Reach kcbet's bettors every day. See the offers →")}</span></a>`}
function fillAds(root){(root||document).querySelectorAll("[data-ad]:not([data-filled])").forEach(el=>{el.innerHTML=adSlot(el.dataset.ad);el.dataset.filled="1"});
  if(ADS_ON)(root||document).querySelectorAll("ins.adsbygoogle:not([data-pushed])").forEach(i=>{i.dataset.pushed="1";try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}})}
function renderPub(){const c=(window.CFG&&CFG.contact)||{},wa=String(c.whatsapp||"").replace(/[^\d+]/g,"");
  $("p-contact").innerHTML=wa||c.email?`${wa?`<p>WhatsApp : <b class="sel">${esc(c.whatsapp)}</b> · <a href="https://wa.me/${esc(wa.replace("+",""))}" target="_blank" rel="noopener">${T("Écrire sur WhatsApp","Message on WhatsApp")}</a></p>`:""}${c.email?`<p>E-mail : <b class="sel">${esc(c.email)}</b></p>`:""}`:`<p class="lead">${T("Le contact pour les annonceurs sera bientôt affiché ici.","The advertiser contact will be shown here soon.")}</p>`}
fillAds();renderPub();if(typeof renderMatches==="function")renderMatches();
new MutationObserver(()=>fillAds()).observe(document.querySelector(".wrap"),{childList:true,subtree:true});
