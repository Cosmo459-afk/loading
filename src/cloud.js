import {createClient} from '@supabase/supabase-js';
import config from './config.js';

// Existing v0.3 UI remains responsible for mascot art, album and guest quizzes.
const base={go,showProfile,renderMenu,beginQuiz,renderQuestion,answer,nextQuestion,finish};
const $=id=>document.getElementById(id);
const returning=new URLSearchParams(location.search).has('code');
const client=createClient(config.url,config.publishableKey,{
  auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const state={session:null,uid:null,version:0,game:null,answers:[],pending:null,busy:false,profileBusy:false,featureBusy:false,signingOut:false};
profile=null; // Never turn a local profile into a verified cloud account.

function message(text){$('cloudNotice').textContent=text;$('cloudNotice').hidden=!text;}
function authMessage(text){$('authMessage').textContent=text;}
function accountUI(){
  $('sessionStatus').textContent=state.uid?'Sesión iniciada · progreso en tu cuenta':'Invitado · sin sesión';
  $('logoutBtn').hidden=!state.uid;
}
function publicError(error){
  const text=String(error?.message||'');
  if(/rate|seconds|too many/i.test(text))return 'Esperá unos segundos antes de volver a intentarlo.';
  if(/expired|jwt|refresh token/i.test(text))return 'Tu sesión o enlace venció. Volvé a ingresar con tu correo.';
  if(/not enough/i.test(text))return 'Todavía no hay suficientes preguntas para ese reto. Elegí otra categoría.';
  if(/fetch|network|timeout|connection/i.test(text))return 'No pudimos conectar. Revisá tu conexión y volvé a intentar.';
  return 'No pudimos completar la operación. Volvé a intentar; si sigue ocurriendo, avisá a LOADING.';
}
function unpack(row){return Array.isArray(row)?row[0]:row;}
function adopt(row){
  row=unpack(row);
  if(!row){profile=null;return;}
  profile={name:row.nickname,avatar:row.avatar,photo:row.photo,xp:Number(row.xp),games:row.games,featured:row.featured||[],unlocked:[]};
  syncUnlocks();
}
async function loadProfile(uid,version){
  const [player,catalog]=await Promise.all([
    client.from('arcade_profiles').select('*').eq('id',uid).maybeSingle(),
    client.from('arcade_cards').select('id,name,required_xp')
  ]);
  if(version!==state.version)return;
  if(player.error)throw player.error;
  if(catalog.error)throw catalog.error;
  for(const c of catalog.data){const local=cards.find(x=>x.id===c.id);if(local){local.at=c.required_xp;local.name=c.name;}}
  adopt(player.data);
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
  state.uid=uid;state.game=null;state.answers=[];state.pending=null;profile=null;mode='guest';
  $('recoverGame').hidden=true;
  $('historyList').replaceChildren();$('resultReview').replaceChildren();
  for(const id of ['playerStats','album','albumStatus','rewardTrack','rewardProgress','profilePreview','scoreTitle','scoreSummary','xpSummary','resultDetail'])$(id).replaceChildren();
  $('nickname').value='';$('photoInput').value='';uploadedPhoto=null;selectedAvatar=0;
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
    }else state.session=session;
  },0);
});

window.openPlayer=showProfile=async function(){
  await ready;
  if(!state.uid){base.go('auth');return;}
  const version=state.version;
  try{
    await loadProfile(state.uid,version);
    if(version===state.version)base.showProfile();
  }catch(e){message(publicError(e));}
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
  if(state.game||state.pending){if(!confirm('Hay una partida en curso o pendiente. ¿Querés cerrar sesión igualmente?'))return;}
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
  if(mode==='player'&&profile){
    const notice=$('playerStats').querySelector(':scope > p.muted');
    if(notice)notice.textContent='Progreso guardado en tu cuenta. El ranking global todavía no está disponible.';
    const nav=$('playerStats').querySelector('.nav-extra');
    const btn=document.createElement('button');btn.className='secondary';btn.textContent='MIS PARTIDAS';btn.onclick=()=>showHistory();nav.appendChild(btn);
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
beginQuiz=async function(){
  $('resultReview').replaceChildren();
  if(mode==='guest'){state.game=null;base.beginQuiz();return;}
  await ready;
  if(!state.uid||!profile){void openPlayer();return;}
  if(state.pending){message('Guardá la partida pendiente antes de empezar otra.');$('recoverGame').hidden=false;return;}
  if(state.busy)return;
  state.busy=true;const version=state.version;
  const cat=$('category').value,level=$('difficulty').value;
  const button=$('beginBtn');button.disabled=true;
  try{
    const {data,error}=await client.rpc('arcade_start_game',{p_category:cat,p_difficulty:level});
    if(error)throw error;
    if(version!==state.version)return;
    if(!data?.game_id||data.questions?.length!==5)throw new Error('Invalid game response');
    state.game={id:data.game_id,owner:state.uid};state.answers=[];
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
  state.pending={owner:state.uid,gameId:state.game.id,answers:[...state.answers],questions:questions.map(q=>({q:q.q,a:q.a}))};
  rememberPending();
  await submitPending();
};
async function submitPending(){
  const pending=state.pending;
  if(state.busy||!pending||pending.owner!==state.uid)return;
  state.busy=true;const version=state.version;
  $('nextBtn').disabled=true;$('recoverGame').disabled=true;
  message('Guardando la partida…');
  try{
    const {data,error}=await client.rpc('arcade_submit_game',{p_game_id:pending.gameId,p_answers:pending.answers});
    if(error)throw error;
    if(version!==state.version)return;
    // Fetch the authoritative total instead of incrementing a local counter.
    await loadProfile(state.uid,version);
    if(version!==state.version)return;
    correct=data.correct;
    $('scoreTitle').textContent=data.score+' PUNTOS';
    $('scoreSummary').textContent=data.correct+' de 5 respuestas correctas';
    $('xpSummary').textContent='+'+data.score+' XP · Total: '+profile.xp+' XP · Guardado en tu cuenta';
    $('resultDetail').textContent='100 puntos por acierto y 200 extra por partida perfecta. Revisá tus nuevos cromos desde tu perfil.';
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
  const version=state.version;base.go('history');$('historyList').textContent='Cargando tus últimas partidas…';
  const {data,error}=await client.from('arcade_games').select('id,category,difficulty,started_at,finished_at,correct,score').eq('player_id',state.uid).order('started_at',{ascending:false}).limit(20);
  if(version!==state.version)return;
  $('historyList').replaceChildren();
  if(error){$('historyList').textContent=publicError(error);return;}
  if(!data.length){$('historyList').textContent='Todavía no jugaste partidas con esta cuenta.';return;}
  for(const game of data){
    const box=document.createElement('div');box.className='review-item';
    const date=new Date(game.started_at).toLocaleString('es-AR');
    box.textContent=date+' · '+game.category.toUpperCase()+' · '+(game.difficulty==='expert'?'Experto':'Normal')+' · '+(game.finished_at?game.score+' puntos · '+game.correct+'/5':'Sin finalizar');
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
