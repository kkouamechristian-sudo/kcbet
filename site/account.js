/* Comptes visiteurs avec Supabase : inscription, connexion, mot de passe oublie, journal de paris sauvegarde en ligne. */
const ACC={sb:null,user:null,ready:false,mode:"signup",msg:""};
const accOn=()=>!!(window.CFG&&CFG.supabaseUrl&&CFG.supabaseAnonKey);
function accRender(){
  const box=$("acc-box"),btn=$("t-acc");
  if(btn)btn.textContent=ACC.user?T("Mon compte","My account"):T("S'inscrire","Sign up");
  const j=$("join");if(j){let hid=false;try{hid=localStorage.getItem("kc-join-x")==="1"}catch(e){}j.hidden=!!ACC.user||hid}
  if(!accOn()){box.innerHTML=`<p class="lead">${T("Les inscriptions ouvrent très bientôt. Vous pourrez créer un compte gratuit pour retrouver votre journal de paris sur tous vos appareils.","Sign-ups open very soon. You will be able to create a free account to find your betting log on all your devices.")}</p>`;return}
  if(!ACC.ready){box.innerHTML=`<p class="lead">${T("Chargement…","Loading…")}</p>`;return}
  const m=ACC.msg?`<p class="verdict" role="status">${ACC.msg}</p>`:"";
  if(ACC.user){box.innerHTML=`<div class="figures"><div class="fig"><b>${esc(ACC.user.email)}</b><span>${T("Connecté","Signed in")}</span></div><div class="fig"><b>${bets.length}</b><span>${T("paris dans votre journal, sauvegardés en ligne","bets in your log, saved online")}</span></div></div>
    <div class="chips"><a class="act" href="#journal" style="text-decoration:none">${T("Ouvrir mon journal","Open my log")}</a><button class="ghost" type="button" id="acc-out">${T("Se déconnecter","Sign out")}</button><button class="ghost" type="button" id="acc-wipe">${T("Effacer mes paris en ligne","Erase my online bets")}</button></div>
    <p class="lead">${T("Pour supprimer complètement votre compte, écrivez-nous depuis votre adresse e-mail : voir la page Confidentialité.","To delete your account completely, write to us from your e-mail address: see the Privacy page.")}</p>${m}`;return}
  if(ACC.mode==="recover"){box.innerHTML=`<form class="formgrid" id="acc-form"><label class="field">${T("Nouveau mot de passe","New password")}<input id="acc-pass" type="password" autocomplete="new-password" minlength="8" required></label><button class="act" type="submit">${T("Enregistrer","Save")}</button></form>${m}`;return}
  const up=ACC.mode==="signup",fg=ACC.mode==="forgot";
  box.innerHTML=`<div class="chips" role="tablist"><button class="chip" type="button" data-mode="signup" aria-pressed="${up}">${T("Créer un compte","Create account")}</button><button class="chip" type="button" data-mode="login" aria-pressed="${ACC.mode==="login"}">${T("Se connecter","Sign in")}</button></div>
   <form class="formgrid" id="acc-form" novalidate>
    <label class="field">E-mail<input id="acc-mail" type="email" autocomplete="email" required></label>
    ${fg?"":`<label class="field">${T("Mot de passe","Password")}${up?` <small>${T("(8 caractères minimum)","(8 characters minimum)")}</small>`:""}<input id="acc-pass" type="password" autocomplete="${up?"new-password":"current-password"}" minlength="8" required></label>`}
    ${up?`<label class="check"><input id="acc-age" type="checkbox" required> ${T("J'ai 18 ans ou plus","I am 18 or older")}</label><label class="check"><input id="acc-rgpd" type="checkbox" required> ${T("J'accepte la","I accept the")} <a href="#confidentialite">${T("politique de confidentialité","privacy policy")}</a></label>`:""}
    <button class="act" type="submit">${up?T("Créer mon compte","Create my account"):fg?T("Recevoir le lien","Send me the link"):T("Se connecter","Sign in")}</button>
   </form>
   ${ACC.mode==="login"?`<button class="ghost" type="button" data-mode="forgot">${T("Mot de passe oublié ?","Forgot password?")}</button>`:fg?`<button class="ghost" type="button" data-mode="login">${T("Retour à la connexion","Back to sign in")}</button>`:""}${m}`}
async function accLoad(){
  if(!accOn())return accRender();
  try{
    await new Promise((ok,ko)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";s.onload=ok;s.onerror=ko;document.head.appendChild(s)});
    ACC.sb=supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true}});
    ACC.sb.auth.onAuthStateChange((ev,ses)=>{ACC.user=ses&&ses.user||null;if(ev==="PASSWORD_RECOVERY"){ACC.mode="recover";location.hash="compte"}if(ev==="SIGNED_IN")accSync();accRender()});
    const{data}=await ACC.sb.auth.getSession();ACC.user=data.session&&data.session.user||null;ACC.ready=true;if(ACC.user)accSync();
  }catch(e){ACC.ready=true;ACC.msg=T("Le service de comptes est injoignable. Réessayez plus tard.","The account service is unreachable. Try again later.")}
  accRender()}
async function accSync(){if(!ACC.sb||!ACC.user)return;
  const{data,error}=await ACC.sb.from("journal").select("id,data");if(error)return;
  const cloud=new Map(data.map(r=>[r.id,r.data]));
  const local=bets.filter(b=>!cloud.has(b.id));
  if(local.length)await ACC.sb.from("journal").upsert(local.map(b=>({id:b.id,data:b})));
  bets=[...cloud.values(),...local];store.set("jc-bets",bets);renderJournal();accRender()}
window.cloudSave=b=>{if(ACC.sb&&ACC.user)ACC.sb.from("journal").upsert({id:b.id,data:b}).then(()=>{})};
window.cloudDel=id=>{if(ACC.sb&&ACC.user)ACC.sb.from("journal").delete().eq("id",id).then(()=>{})};
$("acc-box").addEventListener("click",async e=>{const m=e.target.closest("[data-mode]");if(m){ACC.mode=m.dataset.mode;ACC.msg="";accRender();return}
  if(e.target.id==="acc-out"){await ACC.sb.auth.signOut();ACC.msg=T("Vous êtes déconnecté. Votre journal reste dans ce navigateur.","You are signed out. Your log stays in this browser.");accRender()}
  if(e.target.id==="acc-wipe"){if(!e.target.dataset.sure){e.target.dataset.sure="1";e.target.textContent=T("Confirmer l'effacement","Confirm erase");return}
    const{error}=await ACC.sb.from("journal").delete().eq("user_id",ACC.user.id);ACC.msg=error?T("L'effacement a échoué.","Erasing failed."):T("Vos paris en ligne sont effacés. Ceux de ce navigateur restent.","Your online bets are erased. Those in this browser remain.");accRender()}});
$("acc-box").addEventListener("submit",async e=>{e.preventDefault();const sb=ACC.sb,mail=$("acc-mail")&&$("acc-mail").value.trim(),pass=$("acc-pass")&&$("acc-pass").value;ACC.msg="";
  const back=location.origin+location.pathname+"#compte";let r;
  if(ACC.mode==="signup"){if(!/^\S+@\S+\.\S+$/.test(mail)){ACC.msg=T("Entrez une adresse e-mail valide.","Enter a valid e-mail address.");return accRender()}
    if(!pass||pass.length<8){ACC.msg=T("Choisissez un mot de passe de 8 caractères au moins.","Choose a password of at least 8 characters.");return accRender()}
    if(!$("acc-age").checked||!$("acc-rgpd").checked){ACC.msg=T("Cochez les deux cases pour créer un compte.","Tick both boxes to create an account.");return accRender()}
    r=await sb.auth.signUp({email:mail,password:pass,options:{emailRedirectTo:back}});ACC.msg=r.error?esc(r.error.message):T("Compte créé. Ouvrez l'e-mail de confirmation pour l'activer.","Account created. Open the confirmation e-mail to activate it.")}
  else if(ACC.mode==="login"){r=await sb.auth.signInWithPassword({email:mail,password:pass});ACC.msg=r.error?T("E-mail ou mot de passe incorrect, ou compte pas encore confirmé.","Wrong e-mail or password, or account not confirmed yet."):""}
  else if(ACC.mode==="forgot"){r=await sb.auth.resetPasswordForEmail(mail,{redirectTo:back});ACC.msg=r.error?esc(r.error.message):T("Si un compte existe, un lien de réinitialisation vient d'être envoyé.","If an account exists, a reset link has just been sent.")}
  else if(ACC.mode==="recover"){r=await sb.auth.updateUser({password:pass});ACC.msg=r.error?esc(r.error.message):T("Mot de passe modifié.","Password changed.");if(!r.error)ACC.mode="login"}
  accRender()});
$("join").addEventListener("click",e=>{const b=e.target.closest("[data-join]");if(!b)return;if(b.dataset.join==="x"){$("join").hidden=true;try{localStorage.setItem("kc-join-x","1")}catch(e){}}else{ACC.mode="signup";ACC.msg="";accRender()}});
accLoad();
