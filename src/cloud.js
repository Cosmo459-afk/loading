import {createClient} from '@supabase/supabase-js';
import config from './config.js';
import cardStyles from './cards.css';
import cardFont from '../assets/fonts/Silkscreen-Bold.ttf';
const frameStyles=document.createElement('style');frameStyles.textContent='@font-face{font-family:LoadingPixel;src:url('+cardFont+') format("truetype");font-style:normal;font-weight:700;font-display:swap}'+cardStyles;document.head.appendChild(frameStyles);
import {collectionDefinitions,collectionCards} from './collections.js';
import {installAudio} from './audio.js';
import {decorateAvatar,badges,slotNames} from './cosmetics.js';
import brandLogo from '../assets/brand/loading-arcade.png';
import couponArt from '../assets/rewards/coupon-level5.png';
import {installRewardUI} from './reward-ui.js';
const lockup=document.querySelector('header > div');lockup.className='brand-lockup';lockup.innerHTML='<img class="brand-logo" src="'+brandLogo+'" alt="LOADING ARCADE" width="1966" height="804">';
const audio=installAudio();
// Replace the provisional catalog with the confirmed RE4 collection.
cards.splice(0,cards.length,...collectionCards);
// Keep the original mascot picker, section navigation and question renderer.
const base={go,showProfile,renderQuestion};
const $=id=>document.getElementById(id);
const returning=new URLSearchParams(location.search).has('code');
const client=createClient(config.url,config.publishableKey,{
  auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const state={session:null,uid:null,version:0,game:null,answers:[],pending:null,busy:false,profileBusy:false,featureBusy:false,signingOut:false,profileLoading:false,profileError:false,creating:false,linkBusy:false,catalog:null,catalogLoading:false,catalogError:false,catalogPromise:null,cosmetics:[],cosmeticBusy:false,owned:[],chests:[],chestBusy:false,community:null,communityBusy:false,communityError:false,visibilityBusy:false,coupon:null,couponError:false,ownedCosmetics:[],lastResult:null};
profile=null; // Never turn a local profile into a verified cloud account.
const rewardUI=installRewardUI({profile:()=>profile,coupon:()=>state.coupon,couponError:()=>state.couponError,uid:()=>state.uid,requestRedemption:async id=>{const {data,error}=await client.rpc('arcade_request_coupon_redemption',{p_coupon_id:id});if(!error&&data?.player_id===state.uid)state.coupon=data;},avatar:p=>decorateAvatar(originalAvatarSVG(p.avatar||0),p.avatar||0,p.cosmetics||{}),brand:brandLogo,art:couponArt});


function message(text){$('cloudNotice').textContent=text;$('cloudNotice').hidden=!text;}
function authMessage(text){$('authMessage').textContent=text;}
function isTemporary(){return state.session?.user?.is_anonymous===true;}
function protectionUI(){
  const panel=$('accountProtection');
  let snoozedUntil=0;
  try{snoozedUntil=Number(localStorage.getItem('loading_arcade_reminder_'+state.uid))||0;}catch{}
  const created=Date.parse(state.session?.user?.created_at||'');
  const due=profile&&(profile.games>=3||(Number.isFinite(created)&&Date.now()-created>=86400000));
  panel.hidden=!(state.uid&&isTemporary()&&due&&Date.now()>=snoozedUntil);
  if(panel.hidden)panel.replaceChildren();
  else panel.innerHTML='<strong>Protegé tu progreso</strong><p>Ya tenés un recorrido en el arcade. Vinculá un correo para recuperar tu jugador si cambiás de dispositivo, cerrás sesión o borrás los datos del navegador. Podés seguir jugando sin hacerlo.</p><div class="actions"><button onclick="openLinkAccount()">GUARDAR MI ACCESO</button><button class="secondary" onclick="snoozeAccountReminder()">MÁS TARDE</button></div>';
}
window.snoozeAccountReminder=function(){
  try{localStorage.setItem('loading_arcade_reminder_'+state.uid,String(Date.now()+86400000));}catch{}
  $('accountProtection').hidden=true;
};
function applyPersonalStyle(){
 const c=profile?.cosmetics||{};
 document.body.dataset.theme=['ocean-theme','amber-theme','violet-theme','jade-theme'].includes(c.theme)?c.theme:'';
 document.body.dataset.personalFont=['pixel-font','terminal-font'].includes(c.font)?c.font:'';
}
function cosmeticOwned(item){return !!profile&&(profile.xp>=item.required_xp||state.ownedCosmetics.includes(item.id));}
function stepEarned(step){return step.kind==='Cosmético'?cosmeticOwned(step):(profile?.xp||0)>=step.at;}
function renderProgressTrack(target){
 if(!target||!profile)return;
 const xp=profile.xp,steps=rewardSteps(),next=steps.find(s=>s.at>xp&&!stepEarned(s));
 target.replaceChildren();
 const list=document.createElement('ol');list.className='progress-route';list.tabIndex=0;list.setAttribute('aria-label','Ruta horizontal de progreso. Desplazá para ver las recompensas.');
 for(const step of steps){
  const item=document.createElement('li');item.className='progress-stop'+(stepEarned(step)?' earned':'')+(step===next?' next':'');
  const button=document.createElement('button');button.type='button';button.className='progress-prize secondary';button.setAttribute('aria-label',step.name+' · '+step.at+' XP · '+(stepEarned(step)?'Desbloqueado':'Pendiente'));
  const icon=document.createElement('span');icon.className='progress-prize-icon';icon.setAttribute('aria-hidden','true');icon.textContent=step.kind==='Cofre'?'▣':step.kind==='Cupón'?'%':({background:'▧',frame:'◇',badge:'✦',font:'Aa',theme:'◒',hat:'♜',glasses:'⌐■-■'})[step.slot]||'✦';
  const title=document.createElement('strong');title.textContent=step.name;
  const value=document.createElement('small');value.textContent=step.at+' XP';
  const status=document.createElement('small');status.className='progress-stop-status';status.textContent=stepEarned(step)?'✓ Desbloqueado':step===next?'Próximo · '+(step.at-xp)+' XP':'Pendiente';
  button.append(icon,title,value,status);button.onclick=()=>step.kind==='Cofre'?openChests():step.kind==='Cupón'?openBenefits():openWardrobe();item.appendChild(button);list.appendChild(item);
 }
 target.appendChild(list);
 requestAnimationFrame(()=>centerProgress(list));
}
function centerProgress(list){
 if(!list?.clientWidth)return;
 const node=list.querySelector('.next');if(node)list.scrollLeft=Math.max(0,node.offsetLeft-list.offsetLeft-list.clientWidth/2+node.offsetWidth/2);
}
async function refreshCommunity(version=state.version){
 if(!state.uid||state.communityBusy)return;
 state.communityBusy=true;state.communityError=false;renderCommunity();
 try{const {data,error}=await client.rpc('arcade_community');if(error)throw error;if(!data||!('me' in data))throw new Error('Community update required');if(version===state.version)state.community=data;}
 catch{if(version===state.version)state.communityError=true;}
 finally{if(version===state.version){state.communityBusy=false;renderCommunity();}}
}
function renderCommunity(){
 const panel=$('homeCommunity');if(!panel)return;
 panel.hidden=!profile;panel.replaceChildren();if(!profile)return;
 const header=document.createElement('div');header.className='eyebrow';header.textContent='COMUNIDAD';const title=document.createElement('h2');title.textContent='Ranking de progreso';panel.append(header,title);
 const note=document.createElement('p');note.className='muted';note.textContent='Por experiencia total. A igual XP, mismo puesto.';panel.appendChild(note);
 if(state.communityError){const text=document.createElement('p');text.textContent='No pudimos cargar el ranking. Volvé a intentarlo.';panel.appendChild(text);}
 else if(state.communityBusy&&!state.community){const text=document.createElement('p');text.textContent='Cargando jugadores…';panel.appendChild(text);}
 else{
  const count=document.createElement('p');count.className='community-count';const n=state.community?.total||0;count.textContent=n+' '+(n===1?'jugador':'jugadores')+' en el arcade';panel.appendChild(count);
  const list=document.createElement('ol');list.className='community-players';list.setAttribute('aria-label','Ranking por experiencia');
  const row=p=>{
   const item=document.createElement('li');item.classList.toggle('is-me',p.is_me);const rank=document.createElement('span');rank.className='community-position';rank.textContent='#'+p.position;
   const avatar=document.createElement('span');avatar.innerHTML=avatarHTML({avatar:p.avatar,cosmetics:p.cosmetics||{}});
   const text=document.createElement('div'),name=document.createElement('strong'),level=document.createElement('small');name.textContent=p.nickname+(p.is_me?' · Vos':'');level.textContent='Nivel '+p.level+' · '+p.xp+' XP';text.append(name,level);item.append(rank,avatar,text);return item;
  };
  for(const p of state.community?.players||[])list.appendChild(row(p));panel.appendChild(list);
  if(state.community?.me&&!state.community.players.some(p=>p.is_me)){const own=document.createElement('ol');own.className='community-players community-own';own.setAttribute('aria-label','Tu puesto');own.appendChild(row(state.community.me));panel.appendChild(own);}
  if(!n){const empty=document.createElement('p');empty.textContent='El ranking aparecerá cuando se creen los primeros jugadores.';panel.appendChild(empty);}
 }
 const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary mini';refresh.disabled=state.communityBusy;refresh.textContent='ACTUALIZAR RANKING';refresh.onclick=()=>refreshCommunity();panel.appendChild(refresh);
}
function unseenCards(){
 if(!state.uid)return [];
 let seen=[];try{seen=JSON.parse(localStorage.getItem('loading_arcade_cards_seen_'+state.uid)||'[]');}catch{}
 if(!Array.isArray(seen))seen=[];
 return state.owned.filter(id=>!seen.includes(id));
}
function badge(n,label){return n?'<span class="pending-dot" aria-label="'+n+' '+label+'">'+n+'</span>':'';}
function renderProfileInventory(){
 const panel=$('profileInventory');if(!panel)return;panel.hidden=!profile;panel.replaceChildren();if(!profile)return;
 const chests=state.chests.filter(c=>!c.opened_at).length,newCards=unseenCards().length,coupon=state.coupon?.id&&!state.coupon.redeemed_at?1:0;
 panel.innerHTML='<h3>Tu inventario</h3><div class="profile-inventory-actions">'+
 '<button class="secondary" onclick="openChests()">MIS COFRES'+badge(chests,'cofres por abrir')+'</button>'+
 '<button class="secondary" onclick="showCollections()">MI COLECCIÓN'+badge(newCards,'coleccionables nuevos')+'</button>'+
 '<button class="secondary" onclick="openWardrobe()">MI ESTILO</button>'+
 '<button class="secondary" onclick="openBenefits()">MI CUPÓN'+badge(coupon,'cupón disponible')+'</button>'+
 '<button class="secondary" onclick="showHistory()">MIS PARTIDAS</button></div>';
}
function updateContinueButton(){
 const next=nextRouteQuiz($('category').value),button=$('continueQuizBtn');
 button.textContent=next?(next.in_progress?'RETOMAR TRIVIA →':'SIGUIENTE TRIVIA →'):'ELEGIR OTRA CONSOLA →';
}
window.continueRoute=async function(){
 await ready;if(!profile)return;
 await refreshQuizzes();if(state.catalogError)return;
 if(nextRouteQuiz($('category').value))await beginQuiz();
 else{const other=$('category').value==='ps1'?'ps2':'ps1';$('category').value=other;base.go('menu');}
};
// Restore the route's current milestone when navigating home from a hidden screen.
document.body.dataset.home=String(!$('home').classList.contains('hidden'));
const homeObserver=new MutationObserver(()=>{
 const visible=!$('home').classList.contains('hidden');document.body.dataset.home=String(visible);
 if(visible){if($('cloudNotice').textContent==='¡Partida guardada!')message('');centerProgress($('homeRewardTrack')?.querySelector('.progress-route'));}
});
homeObserver.observe($('home'),{attributes:true,attributeFilter:['class']});
function accountUI(){
  renderProfileInventory();
  applyPersonalStyle();renderCommunity();
  protectionUI();
  rewardInboxUI();
  const loggedIn=!!state.uid;
  $('sessionStatus').textContent=loggedIn?(profile?'Jugador · '+profile.name:'Tu sesión está conectada'):'Tu aventura empieza con un personaje';
  $('logoutBtn').hidden=!loggedIn;
  $('sessionStatus').parentElement.hidden=!loggedIn;
  $('homeDashboard').classList.toggle('has-player',loggedIn);
  $('homeModeNote').textContent='Tus partidas se guardan desde el inicio. Más adelante podés vincular un correo para recuperar tu jugador en otro dispositivo.';
  $('homeModeNote').hidden=loggedIn;
  $('homeHero').hidden=loggedIn;
  $('homeProgress').hidden=true;
  $('homeSignup').hidden=loggedIn;
  const panel=$('homeAccount');
  panel.hidden=!loggedIn;
  if(!loggedIn){panel.replaceChildren();return;}
  if(state.profileLoading){
    panel.innerHTML='<h2>Tu sesión está abierta</h2><p>Cargando tu jugador…</p>';
    return;
  }
  if(state.profileError){
    panel.innerHTML='<h2>Tu sesión está abierta</h2><p>No pudimos cargar tu progreso. No necesitás registrarte de nuevo.</p><button onclick="openPlayer()">REINTENTAR →</button>';
    return;
  }
  if(!profile){
    panel.innerHTML='<div class="eyebrow">YA ESTÁS DENTRO</div><h2>Completá tu jugador</h2><p>Tu cuenta ya está creada. Solo falta elegir un apodo y tu compañero.</p><button onclick="showProfile()">ELEGIR APODO Y AVATAR →</button>';
    return;
  }
  const xp=profile.xp,level=Math.floor(xp/1800)+1;
  const unopened=state.chests.filter(c=>!c.opened_at).length,remaining=1800-xp%1800,percent=(xp%1800)/18;
  panel.innerHTML='<div class="profile-top">'+avatarHTML(profile)+'<div><div class="eyebrow">TU JUGADOR</div><h2>'+esc(profile.name)+'</h2><p>Nivel '+level+' · '+(isTemporary()?'Sin correo vinculado':'Acceso protegido')+'</p></div><button class="secondary home-exit" onclick="logout()" aria-label="Cerrar sesión" title="Cerrar sesión">↪</button></div>'+
    '<div class="home-mini-stats"><span><strong>'+xp+'</strong> XP totales</span><span><strong>'+profile.unlocked.length+'</strong> coleccionables</span></div>'+
    '<button class="home-play" onclick="openPlayer()">CONTINUAR RUTA →</button>'+
    '<div class="home-shortcuts"><button class="secondary" onclick="showProfile()">MI PERFIL'+badge(unopened+unseenCards().length+(state.coupon?.id&&!state.coupon.redeemed_at?1:0),'pendientes en tu perfil')+'</button><button class="secondary" onclick="showCollections()">MI COLECCIÓN'+badge(unseenCards().length,'coleccionables nuevos')+'</button><button class="secondary" onclick="openWardrobe()">MI ESTILO</button></div>'+
    (isTemporary()?'<button class="text-button home-link" onclick="openLinkAccount()">Vincular correo para proteger mi acceso</button>':'');
  $('homeProgress').hidden=false;
  $('homeProgress').innerHTML='<div class="home-route-heading"><div><div class="eyebrow">PROGRESO</div><h2>'+(level+1===5?'Cupón del 10% · Nivel 5':'Próximo cofre · Nivel '+(level+1))+'</h2></div><span class="home-chest-icon" aria-hidden="true">▣</span></div>'+
    '<p class="home-xp-left">Te faltan <strong>'+remaining+' XP</strong></p>'+
    '<div class="bar" role="progressbar" aria-label="Experiencia hacia el próximo nivel" aria-valuemin="0" aria-valuemax="1800" aria-valuenow="'+(xp%1800)+'"><div class="fill" style="width:'+percent+'%"></div></div>'+
    '<div class="progress-text"><small>Nivel '+level+'</small><small>'+(xp%1800)+' / 1800 XP</small></div>'+
    '<div id="homeRewardTrack"></div>';

  renderProgressTrack($('homeRewardTrack'));
}
function publicError(error){
  if(/Collection complete/i.test(String(error?.message||'')))return 'Ya completaste las cartas disponibles. Tu cofre sigue guardado para futuras colecciones.';
  if(/Chest not found/i.test(String(error?.message||'')))return 'Este cofre no está disponible para tu jugador.';
  if(/Game not found/i.test(String(error?.message||'')))return 'La partida ya no existe; puede pertenecer a la prueba anterior del prototipo.';
  if(error?.code==='PGRST202')return 'Falta actualizar el catálogo de trivias en la base de datos. La cuenta y el progreso están conservados.';
  const text=String(error?.message||'');
  if(/anonymous.*disabled|anonymous.*not.*allowed|anonymous.*not.*enabled/i.test(text))return 'La creación sin correo todavía no está habilitada. Podés entrar con una cuenta existente mientras se habilita esta opción.';
  if(/already.*registered|already.*exists|email.*exists/i.test(text))return 'Ese correo ya tiene una cuenta. No podemos fusionar sus progresos automáticamente. Conservá esta sesión mientras decidimos cómo recuperar tu cuenta anterior.';
  if(/rate|seconds|too many/i.test(text))return 'Esperá unos segundos antes de volver a intentarlo.';
  if(/expired|jwt|refresh token/i.test(text))return 'Tu sesión o enlace venció. Volvé a ingresar con tu correo.';
  if(/Quiz already completed/i.test(text))return 'Ya aprobaste esta trivia. Elegí una nueva para seguir avanzando.';
  if(/Finish active quiz/i.test(text))return 'Tenés una trivia en curso. Volvé a tu ruta para retomarla.';
  if(/Quiz out of order/i.test(text))return 'Primero completá la trivia pendiente. Actualizá tu ruta para continuar.';
  if(/Difficulty locked/i.test(text))return 'Esta dificultad está bloqueada. Completá primero el nivel anterior de esa misma consola.';
  if(/Cosmetic locked/i.test(text))return 'Todavía no alcanzaste los XP necesarios para ese cosmético.';
  if(/not enough/i.test(text))return 'Todavía no hay suficientes preguntas para ese reto. Elegí otra categoría.';
  if(/fetch|network|timeout|connection/i.test(text))return 'No pudimos conectar. Revisá tu conexión y volvé a intentar.';
  return 'No pudimos completar la operación. Volvé a intentar; si sigue ocurriendo, avisá a LOADING.';
}
function unpack(row){return Array.isArray(row)?row[0]:row;}
function adopt(row){
  row=unpack(row);
  if(!row){profile=null;accountUI();return;}
  profile={name:row.nickname,avatar:row.avatar,communityVisible:row.community_visible===true,photo:null,rewardsSeenXP:Number(row.rewards_seen_xp||0),xp:Number(row.xp),games:row.games,featured:row.featured||[],unlocked:[],cosmetics:row.cosmetics||{}};
  syncUnlocks();accountUI();
}
async function loadProfile(uid,version){
  state.profileLoading=true;state.profileError=false;accountUI();
  try{
    const [player,catalog,cosmetics,owned,chests,ownedCosmetics,coupon]=await Promise.all([
      client.from('arcade_profiles').select('*').eq('id',uid).maybeSingle(),
      client.from('arcade_cards').select('id,name,kind,rarity,collection_id,description'),
      client.from('arcade_cosmetics').select('id,slot,name,required_xp'),
      client.from('arcade_owned_cards').select('card_id'),
      client.from('arcade_chests').select('id,level,opened_at,prize_kind,card_id').order('level',{ascending:false}),
      client.from('arcade_owned_cosmetics').select('item_id'),
      client.rpc('arcade_get_coupon')
    ]);
    if(version!==state.version)return;
    if(player.error)throw player.error;
    if(catalog.error)throw catalog.error;
    if(cosmetics.error)throw cosmetics.error;
    if(owned.error)throw owned.error;if(chests.error)throw chests.error;
    state.ownedCosmetics=(ownedCosmetics.data||[]).map(o=>o.item_id);state.coupon=coupon.data?.id?coupon.data:null;state.couponError=!!coupon.error;
    state.cosmetics=cosmetics.data;state.owned=owned.data.map(x=>x.card_id);state.chests=chests.data;
    for(const c of catalog.data){const local=cards.find(x=>x.id===c.id);if(local){local.name=c.name;local.kind=c.kind;local.collection=c.collection_id;local.description=c.description;local.rarityKey=c.rarity;local.rarity=({common:'Común',rare:'Rara',epic:'Épica',legendary:'Legendaria'})[c.rarity]||'Por definir';}}
    adopt(player.data);renderProfileInventory();void refreshCommunity(version);
  }catch(e){if(version===state.version)state.profileError=true;throw e;}
  finally{if(version===state.version){state.profileLoading=false;accountUI();}}
}
function pendingKey(){return 'loading_arcade_pending_'+state.uid;}
function rememberPending(){try{sessionStorage.setItem(pendingKey(),JSON.stringify(state.pending));}catch{message('Mantené esta pestaña abierta hasta confirmar el guardado de la partida.');}}
function forgetPending(){try{sessionStorage.removeItem(pendingKey());}catch{}state.pending=null;$('recoverGame').hidden=true;}
function readPending(){
  try{
    const p=JSON.parse(sessionStorage.getItem(pendingKey())||'null');
    if(p&&p.owner===state.uid&&typeof p.gameId==='string'&&Array.isArray(p.questions)&&p.questions.length===5&&Array.isArray(p.answers)&&p.answers.length===5){state.pending=p;$('recoverGame').hidden=false;}
  }catch{}
}
async function useSession(session){
  const uid=session?.user?.id||null;
  state.session=session;
  if(uid===state.uid)return;
  const version=++state.version;
  state.cosmetics=[];state.owned=[];state.chests=[];state.chestBusy=false;state.catalog=null;state.catalogLoading=false;state.catalogError=false;state.catalogPromise=null;
  state.community=null;state.communityBusy=false;state.communityError=false;wardrobeSlot='all';
  state.uid=uid;state.profileLoading=!!uid;state.profileError=false;state.game=null;state.answers=[];state.pending=null;profile=null;mode='player';
  audio.cancelEffects();rewardUI.clear();state.coupon=null;state.couponError=false;state.ownedCosmetics=[];state.lastResult=null;
  $('recoverGame').hidden=true;
  selectedCollection=null;selectedCard=null;$('cardDetailActions').replaceChildren();$('cardDetailStatus').textContent='';
  if($('cardDetail').open)$('cardDetail').close();$('cardDetailArt').replaceChildren();
  $('historyList').replaceChildren();$('resultReview').replaceChildren();$('chestList').replaceChildren();$('chestPrize').replaceChildren();
  for(const id of ['playerStats','album','albumStatus','rewardTrack','rewardProgress','profilePreview','scoreTitle','scoreSummary','xpSummary','resultDetail','triviaResultProgress','wardrobeItems','wardrobePreview'])$(id).replaceChildren();
  $('nickname').value='';$('photoInput').value='';$('linkEmail').value='';$('linkMessage').textContent='';uploadedPhoto=null;selectedAvatar=0;
  accountUI();
  if(!uid){message('');base.go('home');return;}
  try{await loadProfile(uid,version);if(version===state.version){readPending();message('');}}
  catch(e){if(version===state.version){message(publicError(e));throw e;}}
}
let ready=(async()=>{
  try{
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    await useSession(data.session);
    if(returning&&state.uid){if(profile){mode='player';base.go('home');}else base.showProfile();}
  }catch(e){message(publicError(e));if(returning){base.go('auth');authMessage('No pudimos abrir ese enlace. Pedí uno nuevo y abrilo en este mismo navegador.');}}
  finally{$('createPlayerBtn').disabled=false;accountUI();}
})();
client.auth.onAuthStateChange((event,session)=>{
  // Avoid awaiting another Supabase operation inside the SDK's auth lock.
  if(event==='INITIAL_SESSION')return;
  setTimeout(()=>{
    if(state.signingOut)return;
    if(event==='SIGNED_OUT'){
      void useSession(null);
    }else if(session?.user?.id!==state.uid){
      ready=useSession(session).then(()=>{
        if(state.uid){if(profile){mode='player';base.go('home');}else base.showProfile();}
      }).catch(e=>message(publicError(e)));
    }else{state.session=session;accountUI();}
  },0);
});

async function enterPlayer(edit=false){
  await ready;
  if(!state.uid){base.go('auth');return;}
  const version=state.version;
  try{
    await loadProfile(state.uid,version);
    if(version!==state.version)return;
    message('');
    if(edit||!profile)base.showProfile();else{mode='player';base.go('menu');}
  }catch(e){message(publicError(e));}
}
window.openPlayer=()=>enterPlayer(false);
showProfile=async()=>{await enterPlayer(true);renderProfileInventory();};
window.openAccountPage=async function(id){
  await ready;if(!state.uid){base.go('auth');return;}
  if(!profile){await enterPlayer(true);return;}
  if(id==='collection')selectedCollection=null;
  mode='player';base.go(id);
};
window.createPlayer=async function(){
  await ready;
  if(state.uid){await enterPlayer(false);return;}
  if(state.creating)return;
  state.creating=true;$('createPlayerBtn').disabled=true;message('Creando tu jugador…');
  try{
    const {data,error}=await client.auth.signInAnonymously();
    if(error)throw error;
    ready=useSession(data.session);await ready;
    message('Elegí tu apodo y avatar. No necesitás correo para empezar.');base.showProfile();
  }catch(e){message(publicError(e));}
  finally{state.creating=false;$('createPlayerBtn').disabled=false;}
};
window.openLinkAccount=async function(){
  await ready;
  if(!state.uid){base.go('auth');return;}
  if(!isTemporary()){message('Tu cuenta ya tiene un acceso vinculado.');return;}
  $('linkMessage').textContent='';base.go('linkAccount');
};
window.sendAccountLink=async function(event){
  event.preventDefault();await ready;
  if(!state.uid||!isTemporary()||state.linkBusy)return;
  if(!$('linkEmail').reportValidity())return;
  state.linkBusy=true;$('linkAccountBtn').disabled=true;
  $('linkMessage').textContent='Enviando enlace…';
  try{
    const {error}=await client.auth.updateUser({email:$('linkEmail').value.trim()},{emailRedirectTo:new URL(location.pathname,location.origin).href});
    if(error)throw error;
    $('linkMessage').textContent='Revisá tu correo y abrí el enlace en este mismo navegador. Mientras tanto podés seguir jugando. Vincular conserva tu jugador y sus puntos.';
  }catch(e){$('linkMessage').textContent=publicError(e);}
  finally{state.linkBusy=false;$('linkAccountBtn').disabled=false;}
};
window.sendLogin=async function(event){
  event.preventDefault();
  const email=$('loginEmail').value.trim();
  if(!$('loginEmail').reportValidity())return;
  const button=$('sendLoginBtn');button.disabled=true;
  authMessage('Enviando enlace…');
  try{
    const redirect=new URL(location.pathname,location.origin).href;
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});
    if(error)throw error;
    authMessage('Revisá tu correo y spam. Abrí el enlace en este mismo navegador para entrar o crear tu cuenta.');
  }catch(e){authMessage(publicError(e));}
  finally{button.disabled=false;}
};
window.logout=async function(){
  if(state.busy){message('Esperá a que termine el guardado antes de salir.');return;}
  if(isTemporary()){if(!confirm('Tu jugador todavía no tiene un correo vinculado. Si cerrás sesión no podrás recuperar este progreso. ¿Querés salir igualmente?'))return;}
  else if(state.game||state.pending){if(!confirm('Hay una partida en curso o pendiente. ¿Querés cerrar sesión igualmente?'))return;}
  state.signingOut=true;
  try{
    const {error}=await client.auth.signOut({scope:'local'});
    if(error)throw error;
    // Discard sensitive in-memory UI state; keep old local-only progress untouched.
    await useSession(null);
  }catch(e){message(publicError(e));}
  finally{state.signingOut=false;}
};
startMode=function(){if(state.uid&&profile){void openPlayer();return;}void createPlayer();};
saveProfile=async function(){
  if(state.profileBusy)return;
  await ready;
  if(!state.uid){base.go('auth');return;}
  const name=$('nickname').value.trim();
  if(name.length<2){alert('Elegí un apodo de al menos 2 caracteres.');return;}
  const version=state.version;
  state.profileBusy=true;
  try{
    const {data,error}=await client.rpc('arcade_save_profile',{p_nickname:name,p_avatar:selectedAvatar,p_photo:null});
    if(error)throw error;
    if(version!==state.version)return;
    adopt(data);mode='player';message('Tu jugador está listo. Tus partidas ya se guardan.');base.go('home');
  }catch(e){message(publicError(e));}
  finally{state.profileBusy=false;}
};
// This function is used by v0.3 only; cloud writes always go through RPCs.
persistProfile=function(){return false;};
renderMenu=function(){
  if(!state.uid||!profile){void createPlayer();return;}
  mode='player';$('playerStats').replaceChildren();$('playerStats').classList.add('hidden');
  $('modeLabel').textContent='TU RUTA · QUIZ POR CONSOLA';
  renderQuizCatalog();void refreshQuizzes();
};
// base.go calls the current global renderMenu, so enhancements apply everywhere.
toggleFeatured=async function(id){
  if(state.featureBusy||!state.uid||!profile?.unlocked?.includes(id))return;
  let ids=profile.featured||[];
  if(ids.includes(id))ids=ids.filter(x=>x!==id);
  else if(ids.length>=3){alert('Podés exhibir hasta 3 coleccionables. Quitá uno antes de agregar otro.');return;}
  else ids=[...ids,id];
  const version=state.version;state.featureBusy=true;renderCardActions();
  try{
    const {data,error}=await client.rpc('arcade_feature_cards',{p_ids:ids});
    if(error)throw error;
    if(version===state.version){adopt(data);renderAlbum();message('Coleccionables destacados guardados.');}
  }catch(e){message(publicError(e));}
  finally{state.featureBusy=false;if(version===state.version)renderCardActions();}
};
const tierNames={easy:'Fácil',medium:'Medio',hard:'Difícil',normal:'Fácil',expert:'Difícil'};
function orderedQuizzes(rows){return [...rows].sort((a,b)=>['easy','medium','hard'].indexOf(a.difficulty)-['easy','medium','hard'].indexOf(b.difficulty)||(a.sort_order||0)-(b.sort_order||0)||a.id.localeCompare(b.id));}
function groupQuizzes(cat,level){return orderedQuizzes((state.catalog||[]).filter(q=>!q.legacy&&q.category===cat&&q.difficulty===level));}
function nextRouteQuiz(cat){return (state.catalog||[]).find(q=>q.in_progress)||orderedQuizzes((state.catalog||[]).filter(q=>q.category===cat&&!q.completed))[0];}
function renderQuizCatalog(){
  const cat=$('category').value,progress=$('quizProgress'),overview=$('difficultyOverview');overview.replaceChildren();
  const next=nextRouteQuiz(cat);
  if(next?.in_progress)$('category').value=next.category;
  const consoleKey=$('category').value;
  $('difficulty').value=next?.difficulty||'easy';
  for(const tier of ['easy','medium','hard']){
    const rows=groupQuizzes(consoleKey,tier),done=rows.filter(q=>q.completed).length;
    const item=document.createElement('div');item.className='route-tier'+(next?.difficulty===tier?' current':'');
    item.textContent=tierNames[tier];const count=document.createElement('small');count.textContent=state.catalogLoading?'Cargando…':state.catalogError?'Sin datos':done+' / '+rows.length;
    item.appendChild(count);overview.appendChild(item);
  }
  if(state.catalogLoading)progress.textContent='Cargando tu próxima trivia…';
  else if(state.catalogError)progress.textContent='No pudimos cargar tu ruta. Volvé al inicio y reintentá; tu progreso está conservado.';
  else if(!next)progress.textContent='¡Completaste todas las trivias disponibles de esta consola! Podés jugar en la otra consola mientras llegan nuevos desafíos.';
  else{
    const rows=groupQuizzes(next.category,next.difficulty),position=rows.findIndex(q=>q.id===next.id)+1;
    progress.textContent=next.legacy?'Retomá tu partida de la edición anterior. Tus puntos se conservan.':(next.in_progress?'Retomá tu trivia en curso. ':'')+'Trivia '+position+' de '+rows.length+' · '+tierNames[next.difficulty]+'. Aprobá con 3 de 5 para avanzar. Sin límite de tiempo.';
  }
  $('beginBtn').disabled=state.busy||!state.uid||!profile||state.catalogLoading||state.catalogError||!next||next.unlocked===false;
  $('beginBtn').textContent=!next?'RUTA COMPLETADA ✓':next.in_progress?'RETOMAR TRIVIA →':'JUGAR SIGUIENTE TRIVIA →';
}
window.updateQuizSelection=renderQuizCatalog;
async function refreshQuizzes(){
  if(state.catalogPromise)return state.catalogPromise;
  const version=state.version;
  state.catalogLoading=true;state.catalogError=false;renderQuizCatalog();
  state.catalogPromise=(async()=>{
    try{
      const {data,error}=await client.rpc('arcade_list_quizzes');
      if(error)throw error;
      if(version!==state.version)return;
      if(!Array.isArray(data))throw new Error('Invalid catalog');
      state.catalog=data;
    }catch(e){if(version===state.version){state.catalog=null;state.catalogError=true;message(publicError(e));}}
    finally{if(version===state.version){state.catalogLoading=false;state.catalogPromise=null;renderQuizCatalog();}}
  })();
  return state.catalogPromise;
}
renderQuestion=function(){base.renderQuestion();audio.play('question');$('qMeta').textContent='PREGUNTA '+(idx+1)+' DE '+questions.length+' · '+questions[idx].cat.toUpperCase()+' · '+(tierNames[questions[idx].level]||questions[idx].level).toUpperCase();};
beginQuiz=async function(){
  $('resultReview').replaceChildren();$('triviaResultProgress').textContent='';
  await ready;
  if(!state.uid||!profile){void createPlayer();return;}
  mode='player';
  if(state.pending){message('Guardá la partida pendiente antes de empezar otra.');$('recoverGame').hidden=false;return;}
  if(state.busy)return;
  state.busy=true;const version=state.version;
  const selected=nextRouteQuiz($('category').value);
  const cat=selected?.category,level=selected?.difficulty;
  const button=$('beginBtn');button.disabled=true;
  try{
    if(!selected)throw new Error('Quiz unavailable');
    if(selected?.completed)throw new Error('Quiz already completed');
    if(selected?.unlocked===false)throw new Error('Difficulty locked');
    const {data,error}=await client.rpc('arcade_start_quiz',{p_quiz_id:selected.id});
    if(error)throw error;
    if(version!==state.version)return;
    if(!data?.game_id||data.questions?.length!==5)throw new Error('Invalid game response');
    state.game={id:data.game_id,owner:state.uid,quizId:data.quiz_id||null};state.answers=[];
    questions=data.questions.map(q=>({...q,cat,level}));idx=0;correct=0;message('');base.go('quiz');renderQuestion();
  }catch(e){message(publicError(e));}
  finally{state.busy=false;button.disabled=false;}
};
answer=function(i){
  if(answered||!state.game||!Number.isInteger(i)||i<0||i>3)return;
  audio.play('select');
  answered=true;state.answers[idx]=i;
  document.querySelectorAll('.choice').forEach((button,n)=>{button.disabled=true;if(n===i)button.classList.add('selected-answer');});
  $('feedback').textContent=idx===questions.length-1?'Guardando tu resultado…':'';
  $('nextBtn').classList.add('hidden');
  const position=idx,game=state.game.id,version=state.version;
  setTimeout(()=>{if(version===state.version&&state.game?.id===game&&idx===position&&!$('quiz').classList.contains('hidden'))nextQuestion();},350);
};
nextQuestion=function(){
  if(!answered||state.busy)return;
  if(idx<questions.length-1){idx++;renderQuestion();}
  else void finish();
};
function renderReview(review,prompts){
  const list=$('resultReview');list.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='Revisá tus respuestas';list.appendChild(heading);
  for(const row of review){
    const q=prompts[row.position];if(!q)continue;
    const box=document.createElement('div');box.className='review-item';
    const title=document.createElement('strong');title.textContent=(row.chosen===row.ok?'✓ ':'✕ ')+q.q;
    const solution=document.createElement('p');solution.textContent='Respuesta correcta: '+q.a[row.ok];
    const explanation=document.createElement('p');explanation.textContent=row.why;
    box.append(title,solution,explanation);list.appendChild(box);
  }
}
finish=async function(){
  if(!state.game||state.game.owner!==state.uid||state.answers.length!==5)return;
  state.pending={owner:state.uid,gameId:state.game.id,quizId:state.game.quizId||null,answers:[...state.answers],questions:questions.map(q=>({q:q.q,a:q.a}))};
  rememberPending();
  await submitPending();
};
async function submitPending(){
  const pending=state.pending;
  if(state.busy||!pending||pending.owner!==state.uid)return;
  state.busy=true;const version=state.version;const oldXP=profile?.xp||0;const oldOwned=new Set(state.cosmetics.filter(c=>cosmeticOwned(c)).map(c=>c.id));
  $('nextBtn').disabled=true;$('recoverGame').disabled=true;
  message('Guardando la partida…');
  try{
    const {data,error}=await client.rpc('arcade_submit_game',{p_game_id:pending.gameId,p_answers:pending.answers});
    if(error)throw error;
    if(version!==state.version)return;
    // Fetch the authoritative total instead of incrementing a local counter.
    await loadProfile(state.uid,version);
    if(version!==state.version)return;
    await refreshQuizzes();
    if(version!==state.version)return;
    const completed=(state.catalog||[]).find(q=>q.id===pending.quizId);
    $('triviaResultProgress').textContent='Partida de la edición anterior · Progreso conservado';
    if(completed){const group=groupQuizzes(completed.category,completed.difficulty);$('triviaResultProgress').textContent=group.filter(q=>q.completed).length+' de '+group.length+' trivias completadas · '+completed.category.toUpperCase()+' · '+tierNames[completed.difficulty];}
    correct=data.correct;state.lastResult={correct:data.correct,score:data.score,passed:data.passed,console:completed?.category||$('category').value,difficulty:tierNames[completed?.difficulty||$('difficulty').value]};
    $('scoreTitle').textContent=pending.quizId?(data.passed?'¡TRIVIA APROBADA!':'VOLVÉ A INTENTARLO'): 'PRÁCTICA FINALIZADA';
    $('scoreSummary').textContent=data.correct+' de 5 respuestas correctas';
    $('xpSummary').textContent='+'+data.score+' XP · Total: '+profile.xp+' XP · Guardado en tu cuenta';
    $('resultDetail').textContent=!pending.quizId?'La práctica no entrega XP ni recompensas.':data.passed?'Ganaste 200 XP por aprobar, 100 por acierto y 200 extra si fue perfecta. Esta trivia ya no se puede repetir.':'Necesitás al menos 3 respuestas correctas. No se revelan las soluciones y este intento no entrega XP. Podés volver a intentarlo.';
    const earned=rewardSteps().filter(r=>r.at>oldXP&&r.at<=profile.xp&&!oldOwned.has(r.id));
    if(earned.length)$('resultDetail').textContent+=' ¡Desbloqueaste: '+earned.map(r=>r.name).join(', ')+'!';
    $('progress').style.width='100%';
    if(data.review?.length)renderReview(data.review,pending.questions);else $('resultReview').replaceChildren();
    updateContinueButton();
    celebrateProgress(oldXP,oldOwned);
    if(!earned.length)audio.play(data.passed?'success':'retry');
    forgetPending();state.game=null;state.answers=[];mode='player';message('¡Partida guardada!');base.go('result');
  }catch(e){
    if(version===state.version){if(/Game not found/i.test(String(e?.message||''))){forgetPending();state.game=null;state.answers=[];message(publicError(e)+' Elegí una nueva trivia.');base.go('menu');}else{message(publicError(e)+' Tu partida sigue pendiente: tocá REINTENTAR GUARDADO.');$('recoverGame').hidden=false;}}
  }finally{state.busy=false;$('nextBtn').disabled=false;$('recoverGame').disabled=false;}
}
window.retryCloudGame=async function(){await ready;await submitPending();};
window.showHistory=async function(){
  await ready;if(!state.uid)return;
  mode='player';const version=state.version;base.go('history');$('historyList').textContent='Cargando tus últimas partidas…';
  await refreshQuizzes();if(version!==state.version)return;
  const {data,error}=await client.from('arcade_games').select('id,quiz_id,category,difficulty,started_at,finished_at,correct,score').eq('player_id',state.uid).order('started_at',{ascending:false}).limit(20);
  if(version!==state.version)return;
  $('historyList').replaceChildren();
  if(error){$('historyList').textContent=publicError(error);return;}
  if(!data.length){$('historyList').textContent='Todavía no jugaste partidas con esta cuenta.';return;}
  for(const game of data){
    const box=document.createElement('div');box.className='review-item';
    const date=new Date(game.started_at).toLocaleString('es-AR');
    box.textContent=date+' · '+game.category.toUpperCase()+' · '+(state.catalog?.find(q=>q.id===game.quiz_id)?tierNames[state.catalog.find(q=>q.id===game.quiz_id).difficulty]:(game.quiz_id?'Trivia de catálogo':game.difficulty==='expert'?'Experto (partida libre)':'Normal (partida libre)'))+' · '+(game.finished_at?game.score+' puntos · '+game.correct+'/5':'Sin finalizar');
    $('historyList').appendChild(box);
  }
};
shareScore=()=>rewardUI.shareResult(state.lastResult);
window.openBenefits=async function(){
 await ready;if(!profile){await enterPlayer(true);return;}base.go('benefits');$('couponContent').textContent='Cargando tu cupón…';
 const version=state.version,{data,error}=await client.rpc('arcade_get_coupon');if(version!==state.version)return;
 state.couponError=!!error;state.coupon=data?.id?data:null;await rewardUI.showCoupon();
};


function rewardSteps(){
 const levels=Math.max(Math.floor((profile?.xp||0)/1800)+2,Math.ceil(Math.max(0,...state.cosmetics.map(c=>c.required_xp))/1800));
 return [...state.cosmetics.map(c=>({...c,at:c.required_xp,kind:'Cosmético'})),...Array.from({length:levels},(_,i)=>({id:'chest-level-'+(i+2),at:(i+1)*1800,name:i+2===5?'Cupón 10% · Tienda Nube':'Cofre · Nivel '+(i+2),kind:i+2===5?'Cupón':'Cofre'}))].sort((a,b)=>a.at-b.at||a.name.localeCompare(b.name));
}
// Inventory is authoritative: XP never unlocks cards directly.
syncUnlocks=function(){
 if(!profile)return;
 profile.unlocked=[...state.owned];
 profile.featured=(profile.featured||[]).filter((id,i,a)=>state.owned.includes(id)&&a.indexOf(id)===i).slice(0,3);
};
const originalAvatarSVG=avatarSVG;
avatarSVG=n=>decorateAvatar(originalAvatarSVG(n),n,profile?.cosmetics||{});
avatarHTML=function(p){
 const n=Number.isInteger(p.avatar)&&mascots[p.avatar]?p.avatar:0,style=p.cosmetics||profile?.cosmetics||{};
 const frame=['pixel-frame','gold-frame','holo-frame','pulse-frame','champion-frame'].includes(style.frame)?style.frame:'';
 return '<span class="avatar-shell '+frame+'"><img class="avatar-art" src="'+decorateAvatar(originalAvatarSVG(n),n,style)+'" alt="'+esc(mascots[n].animal+' '+mascots[n].name)+'">'+(badges[style.badge]?'<span class="avatar-badge" aria-label="Emblema">'+badges[style.badge]+'</span>':'')+'</span>';
};
window.openWardrobe=async function(){
  await ready;if(!profile){await enterPlayer(true);return;}mode='player';renderWardrobe();base.go('wardrobe');
};
let wardrobeSlot='all';
window.filterWardrobe=function(slot){if(slot==='all'||slotNames[slot]){wardrobeSlot=slot;renderWardrobe();}};
function renderWardrobe(){
  if(!profile)return;
  $('cosmeticCategory').value=wardrobeSlot;
  $('wardrobePreview').innerHTML=avatarHTML(profile);
  $('wardrobeItems').replaceChildren();
  for(const item of [...state.cosmetics].filter(c=>wardrobeSlot==='all'||c.slot===wardrobeSlot).sort((a,b)=>a.required_xp-b.required_xp)){
    const owned=cosmeticOwned(item),selected=profile.cosmetics[item.slot]===item.id;
    const box=document.createElement('div');box.className='panel cosmetic-item';
    const label=document.createElement('strong');label.textContent=item.name;
    const detail=document.createElement('p');detail.className='muted';detail.textContent=item.required_xp+' XP · '+(owned?'Desbloqueado':'Te faltan '+(item.required_xp-profile.xp)+' XP');
    const button=document.createElement('button');button.className='secondary';button.disabled=!owned||state.cosmeticBusy;button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'QUITAR':owned?'EQUIPAR':'BLOQUEADO';button.onclick=()=>equipCosmetic(item.slot,selected?null:item.id);
    const preview=document.createElement('div');preview.className='cosmetic-preview';
    if(['background','glasses','hat','frame','badge'].includes(item.slot))preview.innerHTML=avatarHTML({...profile,cosmetics:{...profile.cosmetics,[item.slot]:item.id}});
    else if(item.slot==='theme'){preview.classList.add('theme-preview',item.id);preview.innerHTML='<span>LOADING ARCADE</span><i></i><i></i>';}
    else{preview.classList.add('font-preview',item.id);preview.textContent='Player 01';}
    const type=document.createElement('small');type.textContent=slotNames[item.slot]||'Cosmético';
    box.append(preview,type,label,detail,button);$('wardrobeItems').appendChild(box);
  }
}
async function equipCosmetic(slot,id){
  if(state.cosmeticBusy||!profile)return;state.cosmeticBusy=true;renderWardrobe();const version=state.version;
  try{const {data,error}=await client.rpc('arcade_equip_cosmetic',{p_slot:slot,p_item:id});if(error)throw error;if(version===state.version){adopt(data);audio.play('cosmetic');message('Estilo guardado en tu jugador.');}}
  catch(e){message(publicError(e));}
  finally{state.cosmeticBusy=false;renderWardrobe();}
}
renderRewards=function(){
 const xp=profile?.xp||0,steps=rewardSteps(),next=steps.find(x=>x.at>xp&&!stepEarned(x));
 if(profile)void acknowledgeRewards(xp);
 $('rewardProgress').textContent='Nivel '+(Math.floor(xp/1800)+1)+' · '+(xp%1800)+'/1800 XP · '+state.chests.filter(c=>!c.opened_at).length+' cofres disponibles. '+(next?'Próximo desbloqueo: '+next.name+' ('+(next.at-xp)+' XP restantes)':'Completaste las recompensas actuales.');
 renderProgressTrack($('rewardTrack'));
};

function rewardInboxUI(){
 const show=!!(state.uid&&profile);
 $('rewardInbox').hidden=!show;
 const seen=profile?.rewardsSeenXP||0,xp=profile?.xp||0;
 const unopened=state.chests.filter(c=>!c.opened_at).length;
 $('rewardBadge').textContent=unopened?'● '+unopened+' '+(unopened===1?'COFRE':'COFRES'):'● NUEVAS';
 $('rewardBadge').hidden=!(show&&(unopened||Math.floor(xp/1800)>Math.floor(seen/1800)||rewardSteps().some(r=>r.at>seen&&r.at<=xp)));
 if(!show)$('levelToast').hidden=true;
}
let toastTimer;
function celebrateProgress(oldXP,oldOwned=new Set()){
 const xp=profile.xp,level=Math.floor(xp/1800)+1;
 const gained=rewardSteps().filter(r=>r.at>oldXP&&r.at<=xp&&!oldOwned.has(r.id));
 if(Math.floor(oldXP/1800)<Math.floor(xp/1800)||gained.length){
  audio.play(Math.floor(oldXP/1800)<Math.floor(xp/1800)?'level':'cosmetic');
  $('levelToast').textContent=(Math.floor(oldXP/1800)<Math.floor(xp/1800)?'¡Subiste al nivel '+level+'! ':'¡Nueva recompensa! ')+(gained.length?gained.map(r=>r.name).join(' · ')+'. ':'')+'Revisá tus recompensas y cofres.';
  $('levelToast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('levelToast').hidden=true;},6500);
 }
 rewardInboxUI();
}
async function acknowledgeRewards(xp){
 if(!state.uid||xp<=(profile?.rewardsSeenXP||0))return;
 const version=state.version;
 const {data,error}=await client.rpc('arcade_ack_rewards',{p_xp:xp});
 if(version!==state.version)return;
 if(error){message('No pudimos marcar las recompensas como vistas. Podés seguir jugando.');return;}
 // Do not overwrite a newer XP total returned by another request.
 profile.rewardsSeenXP=Number(unpack(data).rewards_seen_xp);rewardInboxUI();
}

let selectedCollection=null,selectedCard=null;
function mysteryCardMarkup(){return '<div class="mystery-card" role="img" aria-label="Coleccionable por descubrir"><span>LOADING</span><strong aria-hidden="true">?</strong><small>POR DESCUBRIR</small></div>';}
function cardMarkup(c,locked=false){
 if(locked)return mysteryCardMarkup();
 const rarity=c.rarityKey||({Común:'common','Épica':'epic','Legendaria':'legendary'})[c.rarity]||'common';
 let artwork;
 if(c.image){
  const [w,h]=c.referenceSize,box=c.crop||[0,0,w,h];
  artwork='<svg class="card-image" viewBox="'+box.join(' ')+'" role="img" aria-label="'+esc(c.name)+'"><defs><clipPath id="crop-'+c.id+'"><rect x="'+box[0]+'" y="'+box[1]+'" width="'+box[2]+'" height="'+box[3]+'"/></clipPath></defs><image clip-path="url(#crop-'+c.id+')" href="'+c.image+'" width="'+w+'" height="'+h+'" preserveAspectRatio="none"/></svg>';
 }else artwork='<span class="pending-art">Imagen original pendiente</span>';
 return '<article class="game-card rarity-'+rarity+(locked?' card-locked':'')+'"><div class="card-top"><span class="card-brand">LOADING<small>ARCHIVO RETRO</small></span><span class="card-number">'+String(c.ordinal||0).padStart(3,'0')+'</span></div><div class="card-art">'+artwork+'</div><div class="card-caption"><h3>'+esc(c.name)+'</h3><span class="card-game">'+esc(c.game)+'</span><p>'+esc(c.description||c.game)+'</p></div><div class="card-footer"><span class="rarity-label">'+esc(c.rarity)+(locked?' 🔒':'')+'</span><span class="card-serial">'+String(c.ordinal||0).padStart(2,'0')+'/14</span></div></article>';
}
cardHTML=function(c,equipped=false,locked=false){if(locked||!profile?.unlocked?.includes(c.id))return mysteryCardMarkup();return '<div class="featured-card'+(equipped?' equipped':'')+'">'+cardMarkup(c)+'</div>';};
window.showCollections=async function(){
 await ready;if(!state.uid||!profile){await enterPlayer(true);return;}
 selectedCollection=null;mode='player';base.go('collection');
};
window.selectCollection=function(id){
 if(id===null){selectedCollection=null;base.go('collection');return;}
 const collection=collectionDefinitions.find(c=>c.id===id&&c.status!=='waiting-images');if(!collection||!profile)return;
 selectedCollection=id;renderAlbum();base.go('collectionAlbum');
};
renderAlbum=function(){
 const list=$('album');list.replaceChildren();$('collectionOverview').replaceChildren();$('collectionMystery').replaceChildren();
 if(!profile){$('albumStatus').textContent='Creá tu jugador para guardar coleccionables.';return;}
 syncUnlocks();
 for(const collection of collectionDefinitions){
  if(collection.status==='waiting-images'){const note=document.createElement('div');note.className='collection-summary secondary';const title=document.createElement('strong');title.textContent=collection.title;const detail=document.createElement('p');detail.textContent='Próximamente · '+collection.edition;note.append(title,detail);$('collectionOverview').appendChild(note);continue;}
  const items=cards.filter(c=>c.collection===collection.id),owned=items.filter(c=>profile.unlocked.includes(c.id));
  const button=document.createElement('button');button.className='collection-summary secondary';button.dataset.collection=collection.id;button.setAttribute('aria-controls','collectionAlbum');
  const title=document.createElement('strong');title.textContent=collection.title;
  const count=document.createElement('span');count.className='collection-count';count.textContent=owned.length+' de '+items.length+' descubiertos';
  const action=document.createElement('small');action.textContent='ABRIR ÁLBUM →';button.append(title,count,action);button.onclick=()=>selectCollection(collection.id);$('collectionOverview').appendChild(button);
 }
 const collection=collectionDefinitions.find(c=>c.id===selectedCollection);if(!collection)return;
 $('collectionHeading').textContent=collection.title;
 const items=cards.filter(c=>c.collection===selectedCollection),discovered=items.filter(c=>profile.unlocked.includes(c.id)),missing=items.length-discovered.length;
 try{let seen=JSON.parse(localStorage.getItem('loading_arcade_cards_seen_'+state.uid)||'[]');if(!Array.isArray(seen))seen=[];localStorage.setItem('loading_arcade_cards_seen_'+state.uid,JSON.stringify([...new Set([...seen,...discovered.map(c=>c.id)])]));}catch{}
 accountUI();renderProfileInventory();
 $('albumStatus').textContent=discovered.length+' de '+items.length+' descubiertos · '+profile.featured.length+' de 3 destacados';
 $('collectionMystery').textContent=missing?'Abrí una carta conseguida para verla y elegir si exhibirla. Las pendientes mantienen su identidad oculta.':'¡Colección completa! Abrí una carta para verla y elegir si exhibirla.';
 for(const [key,label] of [['common','Comunes'],['epic','Épicas'],['legendary','Legendarias']]){
  const total=items.filter(c=>c.rarityKey===key),owned=total.filter(c=>profile.unlocked.includes(c.id));
  const section=document.createElement('section');section.className='album-rarity album-'+key;
  const heading=document.createElement('h2');heading.textContent=label;
  const counter=document.createElement('p');counter.className='muted';counter.textContent=owned.length+' de '+total.length+' · '+(total.length-owned.length)+' por descubrir';
  const grid=document.createElement('div');grid.className='album-mini-grid';
  for(const c of owned){
   const button=document.createElement('button');button.className='album-thumb';button.setAttribute('aria-label','Abrir carta: '+c.name);button.innerHTML=cardMarkup(c);button.onclick=()=>showCollectible(c.id);grid.appendChild(button);
  }
  for(let i=owned.length;i<total.length;i++){
   const slot=document.createElement('div');slot.className='album-locked';slot.setAttribute('role','img');slot.setAttribute('aria-label','Carta '+label.toLowerCase()+' por descubrir');slot.innerHTML='<span aria-hidden="true">?</span><small>POR DESCUBRIR</small>';grid.appendChild(slot);
  }
  section.append(heading,counter,grid);list.appendChild(section);
 }
};
function renderCardActions(){
 const actions=$('cardDetailActions');actions.replaceChildren();$('cardDetailStatus').textContent='';
 if(!selectedCard||!profile?.unlocked.includes(selectedCard))return;
 const featured=profile.featured.includes(selectedCard),button=document.createElement('button');button.textContent=featured?'QUITAR DEL PERFIL':'EXHIBIR';button.disabled=state.featureBusy;button.setAttribute('aria-pressed',String(featured));const id=selectedCard;button.onclick=()=>toggleFeatured(id);actions.appendChild(button);
 $('cardDetailStatus').textContent=featured?'Esta carta está exhibida en tu perfil.':profile.featured.length+' de 3 espacios de exhibición ocupados.';
}
window.showCollectible=function(id){
 const c=cards.find(c=>c.id===id);if(!c||!profile?.unlocked?.includes(id))return;
 selectedCard=id;$('cardDetailArt').innerHTML=cardMarkup(c);renderCardActions();if(!$('cardDetail').open)$('cardDetail').showModal();
};

window.openChests=async function(){
 await ready;if(!state.uid||!profile){await enterPlayer(true);return;}
 const version=state.version;mode='player';
 try{await loadProfile(state.uid,version);if(version!==state.version)return;renderChests();base.go('chests');}
 catch(e){message(publicError(e));}
};
function renderChests(){
 $('chestBalance').textContent=state.chests.filter(c=>!c.opened_at).length+' cofres por abrir';
 $('chestList').replaceChildren();
 const pending=state.chests.filter(c=>!c.opened_at);
 if(!pending.length){$('chestList').textContent='No tenés cofres pendientes. Los próximos llegan al subir de nivel. Tus cartas obtenidas están en Mi colección.';return;}
 for(const chest of pending){
  const box=document.createElement('div');box.className='panel chest-row';
  const title=document.createElement('strong');title.textContent='Cofre del nivel '+chest.level;
  const button=document.createElement('button');button.disabled=state.chestBusy||(!chest.opened_at&&state.owned.length>=cards.length);button.textContent=state.owned.length>=cards.length?'COLECCIÓN COMPLETA':'ABRIR COFRE';button.onclick=()=>openChest(chest.id);
  box.append(title,button);$('chestList').appendChild(box);
 }
}
function revealChest(result,isNew=false){
 audio.cancelEffects();if(isNew)audio.play(result.prize_kind);
 const box=$('chestPrize');box.replaceChildren();$('chestStage').className='chest-stage revealed';
 $('chestOpeningTitle').textContent=isNew?'¡Nuevo coleccionable!':'Tu coleccionable';
 $('chestStage').dataset.rarity=result.prize_kind;
 const card=cards.find(c=>c.id===result.card_id);
 if(card)box.innerHTML=cardMarkup(card);
 $('chestOpeningStatus').textContent=isNew&&card?'Se agregó a tu colección de '+card.game+'.':'Conseguido en el cofre del nivel '+result.level+'.';
 $('chestReturn').hidden=false;$('chestRetry').hidden=true;mode='player';base.go('chestOpening');
}
window.openChest=async function(id){
 if(state.chestBusy||!state.uid||!profile)return;
 state.chestBusy=true;const version=state.version;
 audio.cancelEffects();audio.play('chest');
 $('chestStage').className='chest-stage opening';delete $('chestStage').dataset.rarity;$('chestPrize').replaceChildren();$('chestOpeningTitle').textContent='Abriendo tu cofre…';$('chestOpeningStatus').textContent='¿Qué habrá adentro?';$('chestReturn').hidden=true;$('chestRetry').hidden=true;base.go('chestOpening');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{
  const [response]=await Promise.all([client.rpc('arcade_open_chest',{p_chest_id:id}),new Promise(resolve=>setTimeout(resolve,reduced?0:1500))]);
  if(version!==state.version)return;if(response.error)throw response.error;
  revealChest(response.data,true);
  try{await loadProfile(state.uid,version);}catch(e){if(version===state.version)message('Tu premio está guardado. Volvé a Mis cofres para actualizar tus cofres y la colección.');}
 }catch(e){
  if(version===state.version){audio.cancelEffects();$('chestStage').className='chest-stage';$('chestOpeningTitle').textContent='Tu cofre está guardado';$('chestOpeningStatus').textContent=publicError(e)+' Reintentá para ver el premio confirmado, sin gastar otro cofre.';$('chestRetry').hidden=false;$('chestRetry').onclick=()=>openChest(id);$('chestReturn').hidden=false;}
 }finally{if(version===state.version)state.chestBusy=false;}
};
