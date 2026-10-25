const categories={charlas:'Charlas retro',ayuda:'Ayuda y recomendaciones',arcade:'Arcade y desafíos'};
const errorText=e=>['PGRST202','42703','42P01'].includes(e?.code)?'La Comunidad necesita actualizarse para cargar esta sección. Las publicaciones guardadas se conservan.':/Wait 10/.test(e?.message)?'Esperá 10 segundos antes de enviar otro mensaje.':/Wait 60/.test(e?.message)?'Esperá un minuto antes de crear otro tema.':/locked/i.test(e?.message)?'Este tema está cerrado para nuevas respuestas.':/Thread unavailable|Message unavailable|Player unavailable/i.test(e?.message)?'Este contenido ya no está disponible.':'No pudimos completar la acción. Podés reintentar sin duplicar el mensaje.';
export function installForum({rpc,identity,go,visit,avatar}){
 const $=id=>document.getElementById(id);
 const state={scope:'all',author:null,authorName:'',category:'',offset:0,list:null,thread:null,threadId:null,postOffset:0,readBusy:false,writeBusy:false,epoch:0,request:0,nonce:null,payload:null};
 async function call(name,args){const {data,error}=await rpc(name,args);if(error)throw error;return data;}
 function reset(){state.epoch++;state.request++;Object.assign(state,{scope:'all',author:null,authorName:'',category:'',offset:0,list:null,thread:null,threadId:null,postOffset:0,readBusy:false,writeBusy:false,nonce:null,payload:null});for(const id of ['forumTopics','forumMessages','forumNotice','forumThreadNotice','forumThreadTitle','forumThreadCategory'])$(id).replaceChildren();$('forumTopicForm').reset();$('forumReplyForm').reset();$('forumCategory').value='';$('forumTopicSubmit').disabled=false;$('forumReplySubmit').disabled=false;}
 function route(){const params=new URLSearchParams();if(state.scope==='mine')params.set('ver','mis-temas');if(state.scope==='replies')params.set('ver','mis-respuestas');if(state.scope==='author_replies')params.set('ver','respuestas');if(state.category)params.set('categoria',state.category);const base=state.author?'#publicaciones/'+state.author:'#comunidad';const query=params.toString();return base+(query?'?'+query:'');}
 async function open(scope='all',author=null,name='',category=''){if(!identity())return;Object.assign(state,{scope,author,authorName:name,category:Object.prototype.hasOwnProperty.call(categories,category)?category:'',list:null,offset:0});$('forumTopics').replaceChildren();$('forumCategory').value=category;go('community');await list(0);}
 async function resume(){if(!identity())return;go('community');await list();}
 async function compose(){if(!identity())return;$('forumComposeCategory').value=state.category||'charlas';go('forumCompose');}
 async function list(offset=state.offset){
  const epoch=state.epoch,request=++state.request;state.readBusy=true;renderControls();$('forumNotice').textContent='Cargando publicaciones…';
  try{const data=await call('arcade_forum_feed',{p_scope:state.scope,p_author:state.author,p_category:state.category||null,p_offset:offset});if(epoch!==state.epoch||request!==state.request)return;state.list=data;state.offset=offset;if(data.author_name)state.authorName=data.author_name;renderList();$('forumNotice').textContent='';}
  catch(e){if(epoch===state.epoch&&request===state.request){$('forumTopics').replaceChildren();$('forumNotice').textContent=errorText(e);}}
  finally{if(epoch===state.epoch&&request===state.request){state.readBusy=false;renderControls();}}
 }
 function button(text,fn){const b=document.createElement('button');b.type='button';b.className='secondary mini';b.textContent=text;b.onclick=fn;return b;}
 function paging(root,offset,hasMore,size,fn){const nav=document.createElement('div');nav.className='actions forum-pages';for(const [label,next] of [['← ANTERIORES',offset-size],['MÁS →',offset+size]]){if(next<0||next>offset&&!hasMore)continue;nav.appendChild(button(label,()=>fn(next)));}root.appendChild(nav);}
 function renderControls(){
  const own=['mine','replies'].includes(state.scope),author=!!state.author;
  $('communityTitle').textContent=author?'PUBLICACIONES'+(state.authorName?' DE '+state.authorName:''):own?'MIS PUBLICACIONES':'COMUNIDAD';
  $('communityDescription').textContent=author?'Temas y respuestas que este jugador compartió con la comunidad.':own?'Tus temas y las conversaciones donde respondiste quedan guardados acá.':'La actividad del Arcade: publicaciones, conversaciones y jugadores.';
  $('communityFeedTab').setAttribute('aria-pressed',String(!own&&!author));$('communityMineTab').setAttribute('aria-pressed',String(own));
  const root=$('forumScopeTabs');root.replaceChildren();
  if(own||author){for(const [label,scope] of [[own?'MIS TEMAS':'TEMAS',own?'mine':'author'],[own?'MIS RESPUESTAS':'RESPUESTAS',own?'replies':'author_replies']]){const b=button(label,()=>open(scope,state.author,state.authorName,state.category));b.setAttribute('aria-pressed',String(state.scope===scope));root.appendChild(b);}}
  $('forumRefresh').disabled=state.readBusy;
 }
 function renderList(){
  renderControls();const root=$('forumTopics');root.replaceChildren();
  if(!state.list?.threads.length){const empty=document.createElement('p');empty.className='forum-empty';empty.textContent=['replies','author_replies'].includes(state.scope)?'Todavía no hay respuestas para mostrar.':state.scope==='mine'?'Todavía no creaste temas. Cuando publiques uno, quedará guardado acá.':'Todavía no hay publicaciones para mostrar en este espacio.';root.appendChild(empty);}
  for(const t of state.list?.threads||[]){const row=document.createElement('article');row.className='forum-topic';const author=document.createElement('button');author.className='forum-author secondary';const art=document.createElement('span');art.innerHTML=avatar(t);const authorName=document.createElement('strong');authorName.textContent=t.author;author.append(art,authorName);author.onclick=()=>visit(t.author_public_id);const title=document.createElement('button');title.className='forum-topic-title';title.textContent=t.title+(t.locked?' · Cerrado':'');title.onclick=()=>openThread(t.id,0,t.target_post);const excerpt=document.createElement('p');excerpt.className='forum-excerpt';excerpt.textContent=(['replies','author_replies'].includes(state.scope)?(state.scope==='replies'?'Tu respuesta: ':'Respuesta de '+state.authorName+': '):'')+(t.excerpt||(['replies','author_replies'].includes(state.scope)?'Mensaje retirado por su autor.':''));const detail=document.createElement('small');detail.textContent=categories[t.category]+' · '+t.replies+' respuestas · '+new Date(t.updated_at).toLocaleDateString('es-AR');row.append(author,title,excerpt,detail,button(t.target_post?(state.scope==='replies'?'VER MI RESPUESTA':'VER RESPUESTA'):'ABRIR CONVERSACIÓN',()=>openThread(t.id,0,t.target_post)));root.appendChild(row);}
  paging(root,state.offset,state.list?.has_more,20,list);
 }
 async function openThread(id,offset=0,targetPost=null){
  if(!identity())return;const changed=state.threadId!==id;if(changed){$('forumReplyForm').reset();state.thread=null;}
  state.threadId=id;const epoch=state.epoch,request=++state.request;go('forumThread');$('forumThreadNotice').textContent='Cargando conversación…';$('forumReplySubmit').disabled=true;$('forumRecovery').hidden=true;
  $('forumMessages').replaceChildren();$('forumThreadTitle').textContent='Conversación';$('forumThreadCategory').textContent='';$('forumReplyForm').hidden=true;
  try{
   if(targetPost)offset=await call('arcade_forum_locate',{p_thread:id,p_post:targetPost});
   const data=await call('arcade_forum_thread',{p_thread:id,p_offset:offset});if(epoch!==state.epoch||request!==state.request)return;state.thread=data;state.postOffset=offset;renderThread();$('forumThreadNotice').textContent='';
   if(targetPost)requestAnimationFrame(()=>document.getElementById('post-'+targetPost)?.scrollIntoView({block:'center'}));
  }catch(e){if(epoch===state.epoch&&request===state.request){state.thread=null;$('forumMessages').replaceChildren();$('forumThreadNotice').textContent=errorText(e)+' Si acabás de publicar, el mensaje confirmado sigue guardado en Mis publicaciones.';$('forumReplyForm').hidden=true;$('forumRecovery').hidden=false;}}
 }
 function renderThread(){
  const t=state.thread;if(!t)return;$('forumThreadTitle').textContent=t.title;$('forumThreadCategory').textContent=categories[t.category];$('forumReplyForm').hidden=t.locked;$('forumReplySubmit').disabled=state.writeBusy;
  const root=$('forumMessages');root.replaceChildren();if(state.postOffset>0)root.appendChild(button('VER PUBLICACIÓN INICIAL',()=>openThread(t.id)));
  if(!t.posts.length){const empty=document.createElement('p');empty.textContent='Esta conversación no tiene mensajes visibles.';root.appendChild(empty);}
  for(const m of t.posts){const row=document.createElement('article');row.className='forum-post';row.id='post-'+m.id;const author=document.createElement('button');author.className='forum-author secondary';const art=document.createElement('span');art.innerHTML=avatar(m);const name=document.createElement('strong');name.textContent=m.author;author.append(art,name);author.onclick=()=>visit(m.author_public_id);const date=document.createElement('small');date.textContent=new Date(m.created_at).toLocaleString('es-AR');const body=document.createElement('p');body.className='forum-body';body.textContent=m.deleted?'Mensaje retirado por su autor.':m.body;row.append(author,date,body);
   if(!m.deleted){const action=button(m.is_mine?'RETIRAR MENSAJE':m.reported?'REPORTADO':'REPORTAR',()=>act(m));action.disabled=state.writeBusy||m.reported;row.appendChild(action);}root.appendChild(row);}
  if(t.locked){const locked=document.createElement('p');locked.textContent='Tema cerrado. Podés leer la conversación.';root.appendChild(locked);}
  paging(root,state.postOffset,t.has_more,30,n=>openThread(t.id,n));
 }
 async function act(m){
  if(state.writeBusy)return;if(m.is_mine&&!confirm('¿Retirar tu mensaje? Su texto dejará de mostrarse.'))return;
  const epoch=state.epoch,id=state.threadId;state.writeBusy=true;renderThread();
  try{await call(m.is_mine?'arcade_forum_remove':'arcade_forum_report',{p_post:m.id});if(epoch!==state.epoch)return;state.writeBusy=false;if(!$('forumThread').classList.contains('hidden')&&state.threadId===id){await openThread(id,state.postOffset);$('forumThreadNotice').textContent=m.is_mine?'Mensaje retirado.':'Reporte recibido para revisión.';}}
  catch(e){if(epoch===state.epoch&&state.threadId===id)$('forumThreadNotice').textContent=errorText(e);}
  finally{if(epoch===state.epoch){state.writeBusy=false;renderThread();}}
 }
 async function publish(event,isTopic){
  event.preventDefault();if(state.writeBusy||!identity())return;
  const form=$(isTopic?'forumTopicForm':'forumReplyForm');if(!form.reportValidity())return;
  const payload={p_thread:isTopic?null:state.threadId,p_category:isTopic?$('forumComposeCategory').value:null,p_title:isTopic?$('forumTopicTitle').value.trim():null,p_body:$(isTopic?'forumTopicBody':'forumReplyBody').value.trim()};
  const key=JSON.stringify(payload);if(state.payload!==key){state.payload=key;state.nonce=crypto.randomUUID();}
  const epoch=state.epoch;state.writeBusy=true;const b=$(isTopic?'forumTopicSubmit':'forumReplySubmit'),notice=$(isTopic?'forumComposeNotice':'forumThreadNotice');b.disabled=true;notice.textContent='Publicando…';
  try{const data=await call('arcade_forum_publish',{...payload,p_request:state.nonce});if(epoch!==state.epoch)return;state.nonce=null;state.payload=null;if($(isTopic?'forumTopicBody':'forumReplyBody').value.trim()===payload.p_body)form.reset();state.writeBusy=false;
   if(!$(isTopic?'forumCompose':'forumThread').classList.contains('hidden')&&(isTopic||state.threadId===payload.p_thread)){await openThread(data.thread_id,data.post_offset||0);if(state.thread)$('forumThreadNotice').textContent='Publicación guardada. Podés volver a verla en Mis publicaciones.';}}
  catch(e){if(epoch===state.epoch)notice.textContent=errorText(e);}
  finally{if(epoch===state.epoch){state.writeBusy=false;b.disabled=false;}}
 }
 $('forumCategory').onchange=()=>{state.category=$('forumCategory').value;state.list=null;void resume();};
 $('forumRefresh').onclick=()=>list();$('forumThreadRefresh').onclick=()=>state.threadId&&openThread(state.threadId,state.postOffset);
 $('forumTopicForm').onsubmit=e=>publish(e,true);$('forumReplyForm').onsubmit=e=>publish(e,false);$('forumBack').onclick=resume;
 $('communityFeedTab').onclick=()=>open();$('communityMineTab').onclick=()=>open('mine');$('forumNewTopic').onclick=compose;$('forumComposeBack').onclick=resume;
 $('forumMineRecovery').onclick=()=>open('mine');$('forumCopyLink').onclick=async()=>{try{await navigator.clipboard.writeText(new URL(location.pathname,location.origin).href+'#tema/'+state.threadId);$('forumThreadNotice').textContent='Enlace de la conversación copiado.';}catch{$('forumThreadNotice').textContent='Podés copiar el enlace desde la barra de direcciones.';}};
 return {open,resume,compose,openThread,reset,route,threadId:()=>state.threadId};
}
