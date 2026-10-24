import {createClient} from '@supabase/supabase-js';
import config from './config.js';

// Existing v0.3 UI remains responsible for mascot art, album and guest quizzes.
const base={go,showProfile,renderMenu,beginQuiz,renderQuestion,answer,nextQuestion,finish};
const $=id=>document.getElementById(id);
const returning=new URLSearchParams(location.search).has('code');
const client=createClient(config.url,config.publishableKey,{
  auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const state={session:null,uid:null,version:0,game:null,answers:[],pending:null,busy:false,profileBusy:false,featureBusy:false,signingOut:false,profileLoading:false,profileError:false,creating:false,linkBusy:false,catalog:null,catalogLoading:false,catalogError:false,catalogPromise:null,cosmetics:[],cosmeticBusy:false};
profile=null; // Never turn a local profile into a verified cloud account.

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
function accountUI(){
  protectionUI();
  const loggedIn=!!state.uid;
  $('sessionStatus').textContent=loggedIn?(profile?(isTemporary()?'Jugador temporal · ':'Sesión iniciada · ')+profile.name:'Sesión iniciada · tu cuenta está conectada'):'Invitado · sin sesión';
  $('logoutBtn').hidden=!loggedIn;
  $('homeModeNote').textContent=loggedIn?(isTemporary()?'Tu progreso ya se guarda. Podés vincular un correo más adelante para recuperar tu acceso desde otro dispositivo.':'Tu progreso se guarda en tu cuenta. El ranking global todavía no está disponible.'):'Probá una partida rápida o creá un jugador sin correo. Después podés vincularlo para recuperar tu acceso desde otro dispositivo.';
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
  const xp=profile.xp,level=Math.floor(xp/1000)+1;
  const sorted=rewardSteps();
  const next=sorted.find(c=>c.at>xp);
  const previous=[...sorted].reverse().find(c=>c.at<=xp)?.at||0;
  const percent=next?Math.min(100,Math.max(0,(xp-previous)/(next.at-previous)*100)):100;
  panel.innerHTML='<div class="profile-top">'+avatarHTML(profile)+
    '<div><div class="eyebrow">QUÉ BUENO VERTE DE NUEVO</div><h2>'+esc(profile.name)+
    '</h2><p>Nivel '+level+' · '+(isTemporary()?'Acceso temporal en este navegador':'Sesión iniciada')+'</p></div></div>'+
    '<div class="home-numbers"><div class="home-number"><strong>'+xp+'</strong><small>XP acumulados</small></div>'+
    '<div class="home-number"><strong>'+profile.games+'</strong><small>Partidas</small></div>'+
    '<div class="home-number"><strong>'+profile.unlocked.length+'/'+cards.length+'</strong><small>Cromos</small></div></div>'+
    '<p class="home-reward">'+(next?'Próxima recompensa: <strong>'+esc(next.name)+'</strong> · te faltan '+(next.at-xp)+' XP.':'¡Completaste la colección actual!')+'</p>'+
    '<div class="bar" role="progressbar" aria-label="Progreso hacia la próxima recompensa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(percent)+'"><div class="fill" style="width:'+percent+'%"></div></div>'+
    (isTemporary()?'<p class="muted">Tu progreso se guarda. <button class="text-button" onclick="openLinkAccount()">Vincular un correo para recuperarlo</button></p>':'')+
    '<div class="actions"><button onclick="openPlayer()">SEGUIR JUGANDO →</button><button class="secondary" onclick="showProfile()">EDITAR PERFIL</button><button class="secondary" onclick="showHistory()">MIS PARTIDAS</button><button class="secondary" onclick="openAccountPage(\'collection\')">MIS CROMOS</button></div>';
}
function publicError(error){
  if(error?.code==='PGRST202')return 'Falta actualizar el catálogo de trivias en la base de datos. La cuenta y el progreso están conservados.';
  const text=String(error?.message||'');
  if(/anonymous.*disabled|anonymous.*not.*allowed|anonymous.*not.*enabled/i.test(text))return 'La creación sin correo todavía no está habilitada. Mientras tanto podés jugar una partida rápida o entrar con tu cuenta actual.';
  if(/already.*registered|already.*exists|email.*exists/i.test(text))return 'Ese correo ya tiene una cuenta. No podemos fusionar sus progresos automáticamente. Conservá esta sesión mientras decidimos cómo recuperar tu cuenta anterior.';
  if(/rate|seconds|too many/i.test(text))return 'Esperá unos segundos antes de volver a intentarlo.';
  if(/expired|jwt|refresh token/i.test(text))return 'Tu sesión o enlace venció. Volvé a ingresar con tu correo.';
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
  profile={name:row.nickname,avatar:row.avatar,photo:row.photo,xp:Number(row.xp),games:row.games,featured:row.featured||[],unlocked:[],cosmetics:row.cosmetics||{}};
  syncUnlocks();accountUI();
}
async function loadProfile(uid,version){
  state.profileLoading=true;state.profileError=false;accountUI();
  try{
    const [player,catalog,cosmetics]=await Promise.all([
      client.from('arcade_profiles').select('*').eq('id',uid).maybeSingle(),
      client.from('arcade_cards').select('id,name,required_xp,kind,rarity'),
      client.from('arcade_cosmetics').select('id,slot,name,required_xp')
    ]);
    if(version!==state.version)return;
    if(player.error)throw player.error;
    if(catalog.error)throw catalog.error;
    if(cosmetics.error)throw cosmetics.error;state.cosmetics=cosmetics.data;
    for(const c of catalog.data){const local=cards.find(x=>x.id===c.id);if(local){local.at=c.required_xp;local.name=c.name;local.kind=c.kind;local.rarity=({common:'Común',rare:'Rara',epic:'Épica',legendary:'Legendaria'})[c.rarity]||'Por definir';}}
    adopt(player.data);
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
  state.cosmetics=[];state.catalog=null;state.catalogLoading=false;state.catalogError=false;state.catalogPromise=null;
  state.uid=uid;state.profileLoading=!!uid;state.profileError=false;state.game=null;state.answers=[];state.pending=null;profile=null;mode='guest';
  $('recoverGame').hidden=true;
  $('historyList').replaceChildren();$('resultReview').replaceChildren();
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
    if(returning&&state.uid){if(profile){mode='player';base.go('menu');}else base.showProfile();}
  }catch(e){message(publicError(e));if(returning){base.go('auth');authMessage('No pudimos abrir ese enlace. Pedí uno nuevo y abrilo en este mismo navegador.');}}
  finally{accountUI();}
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
        if(state.uid){if(profile){mode='player';base.go('menu');}else base.showProfile();}
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
showProfile=()=>enterPlayer(true);
window.openAccountPage=async function(id){
  await ready;if(!state.uid){base.go('auth');return;}
  if(!profile){await enterPlayer(true);return;}
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
startMode=function(m){
  if(m==='player'){void openPlayer();return;}
  mode='guest';state.game=null;state.answers=[];base.go('menu');
};
saveProfile=async function(){
  if(state.profileBusy)return;
  await ready;
  if(!state.uid){base.go('auth');return;}
  const name=$('nickname').value.trim();
  if(name.length<2){alert('Elegí un apodo de al menos 2 caracteres.');return;}
  const version=state.version;
  state.profileBusy=true;
  try{
    const {data,error}=await client.rpc('arcade_save_profile',{p_nickname:name,p_avatar:selectedAvatar,p_photo:uploadedPhoto});
    if(error)throw error;
    if(version!==state.version)return;
    adopt(data);mode='player';message('Perfil guardado en tu cuenta.');base.go('menu');
  }catch(e){message(publicError(e));}
  finally{state.profileBusy=false;}
};
// This function is used by v0.3 only; cloud writes always go through RPCs.
persistProfile=function(){return false;};
renderMenu=function(){
  base.renderMenu();
  renderQuizCatalog();void refreshQuizzes();
  if(mode==='player'&&profile){
    const notice=$('playerStats').querySelector(':scope > p.muted');
    if(notice)notice.textContent='Progreso guardado en tu cuenta. El ranking global todavía no está disponible.';
    const nav=$('playerStats').querySelector('.nav-extra');
    const btn=document.createElement('button');btn.className='secondary';btn.textContent='MIS PARTIDAS';btn.onclick=()=>showHistory();nav.appendChild(btn);
    const wardrobe=document.createElement('button');wardrobe.className='secondary';wardrobe.textContent='VESTUARIO';wardrobe.onclick=()=>openWardrobe();nav.appendChild(wardrobe);
  }
};
// base.go calls the current global renderMenu, so enhancements apply everywhere.
toggleFeatured=async function(id){
  if(state.featureBusy||!state.uid||!profile?.unlocked?.includes(id))return;
  let ids=profile.featured||[];
  if(ids.includes(id))ids=ids.filter(x=>x!==id);
  else if(ids.length>=3){alert('Podés exhibir hasta 3 cromos. Quitá uno antes de agregar otro.');return;}
  else ids=[...ids,id];
  const version=state.version;state.featureBusy=true;
  try{
    const {data,error}=await client.rpc('arcade_feature_cards',{p_ids:ids});
    if(error)throw error;
    if(version===state.version){adopt(data);renderAlbum();message('Cromos destacados guardados.');}
  }catch(e){message(publicError(e));}
  finally{state.featureBusy=false;}
};
const tierNames={easy:'Fácil',medium:'Medio',hard:'Difícil',normal:'Fácil',expert:'Difícil'};
function groupQuizzes(cat,level){return (state.catalog||[]).filter(q=>q.category===cat&&q.difficulty===level);}
function renderQuizCatalog(){
  const cat=$('category').value,level=$('difficulty').value,guest=mode==='guest',mix=cat==='mix';
  const progress=$('quizProgress'),picker=$('quizPicker'),overview=$('difficultyOverview');
  picker.hidden=guest||mix;
  overview.hidden=mix;
  overview.replaceChildren();
  if(!mix){
    for(const tier of ['easy','medium','hard']){
      const rows=groupQuizzes(cat,tier),done=rows.filter(q=>q.completed).length;
      const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(tier===level));
      b.append(document.createTextNode(tierNames[tier]));
      const count=document.createElement('small');count.textContent=state.catalogLoading?'Cargando…':state.catalogError?'Sin datos':!rows.length?'Próximamente':rows.every(q=>q.unlocked===false)?'Bloqueado':guest?rows.length+' disponibles':done+' / '+rows.length;
      b.append(count);b.onclick=()=>{$('difficulty').value=tier;renderQuizCatalog();};overview.appendChild(b);
    }
  }
  const rows=groupQuizzes(cat,level),done=rows.filter(q=>q.completed).length;
  const locked=!mix&&rows.length>0&&rows.every(q=>q.unlocked===false);
  const mixLocked=mix&&level!=='easy'&&(guest||!['ps1','ps2'].every(c=>groupQuizzes(c,level).length>0&&groupQuizzes(c,level).every(q=>q.unlocked)));
  const chosen=$('quizSelect').value;$('quizSelect').replaceChildren();
  for(const q of rows){const option=document.createElement('option');option.value=q.id;option.disabled=q.unlocked===false;option.textContent=(q.completed?'✓ ':'')+q.title+(q.completed?' · completada':'');$('quizSelect').appendChild(option);}
  if(rows.some(q=>q.id===chosen))$('quizSelect').value=chosen;
  else if(rows.some(q=>!q.completed))$('quizSelect').value=rows.find(q=>!q.completed).id;
  if(mix&&mixLocked){progress.textContent='Mix avanzado bloqueado: completá los niveles anteriores de las consolas incluidas.';}
  else if(mix){progress.textContent='Modo libre: partida aleatoria que no modifica el contador de trivias por consola.';}
  else if(state.catalogLoading){progress.textContent='Cargando trivias y progreso…';}
  else if(state.catalogError){progress.textContent='No pudimos cargar el catálogo. Volvé al inicio y reintentá; tu progreso está conservado.';}
  else if(!rows.length){progress.textContent='Todavía no hay trivias publicadas en '+tierNames[level]+'. Próximamente.';}
  else if(locked){progress.textContent='Bloqueado: completá todas las trivias '+(level==='medium'?'fáciles':'medias')+' de esta consola para abrir '+tierNames[level]+'.';}
  else if(guest){progress.textContent=rows.length+' '+(rows.length===1?'trivia disponible':'trivias disponibles')+'. La partida rápida es aleatoria; creá un jugador para completar el catálogo y guardar tu progreso.';}
  else{progress.textContent=done+' de '+rows.length+' trivias completadas · '+(cat==='ps1'?'PlayStation 1':'PlayStation 2')+' · '+tierNames[level]+'. Repetir una trivia no aumenta este contador.';}
  $('beginBtn').disabled=state.busy||locked||mixLocked||(guest?level!=='easy':mix?false:state.catalogLoading||state.catalogError||!rows.length);
  $('beginBtn').textContent=guest||mix?'EMPEZAR PARTIDA LIBRE →':'JUGAR TRIVIA →';
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
renderQuestion=function(){base.renderQuestion();$('qMeta').textContent='PREGUNTA '+(idx+1)+' DE '+questions.length+' · '+questions[idx].cat.toUpperCase()+' · '+(tierNames[questions[idx].level]||questions[idx].level).toUpperCase();};
beginQuiz=async function(){
  $('resultReview').replaceChildren();$('triviaResultProgress').textContent='';
  if(mode==='guest'){state.game=null;base.beginQuiz();return;}
  await ready;
  if(!state.uid||!profile){void openPlayer();return;}
  if(state.pending){message('Guardá la partida pendiente antes de empezar otra.');$('recoverGame').hidden=false;return;}
  if(state.busy)return;
  state.busy=true;const version=state.version;
  const cat=$('category').value,level=$('difficulty').value;
  const button=$('beginBtn');button.disabled=true;
  try{
    const mix=cat==='mix';
    const selected=(state.catalog||[]).find(q=>q.id===$('quizSelect').value&&q.category===cat&&q.difficulty===level);
    if(!mix&&!selected)throw new Error('Quiz unavailable');
    if(selected?.unlocked===false)throw new Error('Difficulty locked');
    const {data,error}=mix?await client.rpc('arcade_start_game',{p_category:cat,p_difficulty:level==='hard'?'expert':'normal'}):await client.rpc('arcade_start_quiz',{p_quiz_id:selected.id});
    if(error)throw error;
    if(version!==state.version)return;
    if(!data?.game_id||data.questions?.length!==5)throw new Error('Invalid game response');
    state.game={id:data.game_id,owner:state.uid,quizId:data.quiz_id||null};state.answers=[];
    questions=data.questions.map(q=>({...q,cat,level}));idx=0;correct=0;message('');base.go('quiz');renderQuestion();
  }catch(e){message(publicError(e));}
  finally{state.busy=false;button.disabled=false;}
};
answer=function(i){
  if(mode==='guest'){base.answer(i);return;}
  if(answered||!state.game||!Number.isInteger(i)||i<0||i>3)return;
  answered=true;state.answers[idx]=i;
  document.querySelectorAll('.choice').forEach((button,n)=>{button.disabled=true;if(n===i)button.classList.add('selected-answer');});
  $('feedback').textContent='Respuesta elegida. Al terminar verás los aciertos y las explicaciones.';
  $('nextBtn').classList.remove('hidden');
  $('nextBtn').textContent=idx===questions.length-1?'GUARDAR Y VER RESULTADO →':'SIGUIENTE →';
};
nextQuestion=function(){
  if(!answered||state.busy)return;
  if(mode==='guest'){base.nextQuestion();return;}
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
  if(mode==='guest'){base.finish();return;}
  if(!state.game||state.game.owner!==state.uid||state.answers.length!==5)return;
  state.pending={owner:state.uid,gameId:state.game.id,quizId:state.game.quizId||null,answers:[...state.answers],questions:questions.map(q=>({q:q.q,a:q.a}))};
  rememberPending();
  await submitPending();
};
async function submitPending(){
  const pending=state.pending;
  if(state.busy||!pending||pending.owner!==state.uid)return;
  state.busy=true;const version=state.version;const oldXP=profile?.xp||0;
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
    if(completed){const group=groupQuizzes(completed.category,completed.difficulty);$('triviaResultProgress').textContent=group.filter(q=>q.completed).length+' de '+group.length+' trivias completadas · '+completed.category.toUpperCase()+' · '+tierNames[completed.difficulty];}
    correct=data.correct;
    $('scoreTitle').textContent=data.score+' PUNTOS';
    $('scoreSummary').textContent=data.correct+' de 5 respuestas correctas';
    $('xpSummary').textContent='+'+data.score+' XP · Total: '+profile.xp+' XP · Guardado en tu cuenta';
    $('resultDetail').textContent='100 puntos por acierto y 200 extra por partida perfecta. Revisá tus nuevos cromos desde tu perfil.';
    const earned=rewardSteps().filter(r=>r.at>oldXP&&r.at<=profile.xp);
    if(earned.length)$('resultDetail').textContent+=' ¡Desbloqueaste: '+earned.map(r=>r.name).join(', ')+'!';
    $('progress').style.width='100%';
    renderReview(data.review,pending.questions);
    forgetPending();state.game=null;state.answers=[];mode='player';message('Partida guardada en Supabase.');base.go('result');
  }catch(e){
    if(version===state.version){message(publicError(e)+' Tu partida sigue pendiente: tocá REINTENTAR GUARDADO.');$('recoverGame').hidden=false;}
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
// Guest sharing remains available even when clipboard permissions are denied.
shareScore=async function(){
  const text='Conseguí '+correct+'/5 en LOADING ARCADE 🎮 ¿Podés superarme?';
  try{
    if(navigator.share){await navigator.share({title:'LOADING ARCADE',text});return;}
    if(navigator.clipboard){await navigator.clipboard.writeText(text);message('Resultado copiado.');return;}
  }catch(e){if(e.name==='AbortError')return;}
  prompt('Copiá tu resultado:',text);
};


function rewardSteps(){
  return [...cards.map(c=>({...c,kind:'Cromo'})),...state.cosmetics.map(c=>({...c,at:c.required_xp,kind:'Cosmético'}))].sort((a,b)=>a.at-b.at||a.name.localeCompare(b.name));
}
const originalAvatarSVG=avatarSVG;
avatarSVG=function(n){
  let svg=decodeURIComponent(originalAvatarSVG(n).split(',')[1]);
  const style=profile?.cosmetics||{};
  if(style.background==='violet-grid')svg=svg.replace('fill="#1c1c30"','fill="#3b224d"');
  if(style.background==='night-sky')svg=svg.replace('fill="#1c1c30"','fill="#102c49"').replace('<path d="M0 96','<path d="M14 14h3v3h-3zM106 19h3v3h-3zM14 84h3v3h-3zM111 82h3v3h-3z" fill="#e1c6ff"/><path d="M0 96');
  let overlay='';const y=n===4?28:50;
  if(style.glasses){const color=style.glasses==='pink-glasses'?'#ff83d3':'#83e7ff';overlay+='<g stroke="'+color+'" stroke-width="4" fill="#283461" fill-opacity=".5"><rect x="30" y="'+y+'" width="25" height="21" rx="4"/><rect x="73" y="'+y+'" width="25" height="21" rx="4"/><path d="M55 '+(y+9)+'H73" fill="none"/></g>';}
  if(style.hat==='retro-cap')overlay+='<path d="M29 34L35 16 65 10 90 17 97 35 55 37Z" fill="#984a76"/><path d="M23 34L97 34 107 43 43 43Z" fill="#2845c5"/><path d="M60 16H69V29H60Z" fill="#f4d4eb"/>';
  if(style.hat==='gold-crown')overlay+='<path d="M32 35L26 12 47 23 64 7 80 23 102 12 96 35Z" fill="#e7bd63"/><path d="M32 35H96V42H32Z" fill="#a77b31"/><path d="M59 24L64 18 69 24 64 31Z" fill="#984a76"/>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('</svg>',overlay+'</svg>'));
};
window.openWardrobe=async function(){
  await ready;if(!profile){await enterPlayer(true);return;}mode='player';renderWardrobe();base.go('wardrobe');
};
function renderWardrobe(){
  if(!profile)return;
  $('wardrobePreview').innerHTML=avatarHTML(profile);
  $('wardrobeItems').replaceChildren();
  for(const item of state.cosmetics){
    const owned=profile.xp>=item.required_xp,selected=profile.cosmetics[item.slot]===item.id;
    const box=document.createElement('div');box.className='panel cosmetic-item';
    const label=document.createElement('strong');label.textContent=item.name;
    const detail=document.createElement('p');detail.className='muted';detail.textContent=item.required_xp+' XP · '+(owned?'Desbloqueado':'Te faltan '+(item.required_xp-profile.xp)+' XP');
    const button=document.createElement('button');button.className='secondary';button.disabled=!owned||state.cosmeticBusy;button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'QUITAR':owned?'EQUIPAR':'BLOQUEADO';button.onclick=()=>equipCosmetic(item.slot,selected?null:item.id);
    box.append(label,detail,button);$('wardrobeItems').appendChild(box);
  }
}
async function equipCosmetic(slot,id){
  if(state.cosmeticBusy||!profile)return;state.cosmeticBusy=true;renderWardrobe();const version=state.version;
  try{const {data,error}=await client.rpc('arcade_equip_cosmetic',{p_slot:slot,p_item:id});if(error)throw error;if(version===state.version){adopt(data);message('Estilo guardado en tu jugador.');}}
  catch(e){message(publicError(e));}
  finally{state.cosmeticBusy=false;renderWardrobe();}
}
renderRewards=function(){
 const xp=profile?.xp||0,steps=rewardSteps(),next=steps.find(x=>x.at>xp);
 $('rewardProgress').textContent=xp+' XP · '+(next?'Próximo desbloqueo: '+next.name+' ('+(next.at-xp)+' XP restantes)':'Completaste las recompensas actuales.');
 $('rewardTrack').replaceChildren();
 for(const step of steps){const row=document.createElement('div');row.className='milestone '+(xp>=step.at?'earned':'');const title=document.createElement('strong');title.textContent=step.at+' XP · '+step.name;const detail=document.createElement('small');detail.textContent=step.kind+' · '+(xp>=step.at?'✓ Desbloqueado':'Pendiente');row.append(title,detail);$('rewardTrack').appendChild(row);}
};
