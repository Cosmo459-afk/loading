const categories={charlas:'Charlas retro',ayuda:'Ayuda y recomendaciones',arcade:'Arcade y desafíos'};
const errorText=e=>/Wait 10/.test(e?.message)?'Esperá 10 segundos antes de enviar otro mensaje.':/Wait 60/.test(e?.message)?'Esperá un minuto antes de crear otro tema.':/locked/i.test(e?.message)?'Este tema está cerrado para nuevas respuestas.':/Thread unavailable|Message unavailable|Player unavailable/i.test(e?.message)?'Este contenido ya no está disponible.':'No pudimos completar la acción. Podés reintentar sin duplicar el mensaje.';
export function installForum({rpc,identity,go,visit,avatar}){
 const $=id=>document.getElementById(id);
 const state={category:'charlas',offset:0,list:null,thread:null,threadId:null,postOffset:0,readBusy:false,writeBusy:false,epoch:0,request:0,nonce:null,payload:null};
 async function call(name,args){const {data,error}=await rpc(name,args);if(error)throw error;return data;}
 function reset(){state.epoch++;state.request++;Object.assign(state,{category:'charlas',offset:0,list:null,thread:null,threadId:null,postOffset:0,readBusy:false,writeBusy:false,nonce:null,payload:null});for(const id of ['forumTopics','forumMessages','forumNotice','forumThreadNotice'])$(id).replaceChildren();$('forumTopicForm').reset();$('forumReplyForm').reset();$('forumCategory').value='charlas';$('forumTopicSubmit').disabled=false;$('forumReplySubmit').disabled=false;}
 async function open(){if(!identity())return;go('forum');await list(0);}
 async function list(offset=state.offset){
  const epoch=state.epoch,request=++state.request;state.readBusy=true;$('forumNotice').textContent='Cargando temas…';
  try{const data=await call('arcade_forum_list',{p_category:state.category,p_offset:offset});if(epoch!==state.epoch||request!==state.request)return;state.list=data;state.offset=offset;renderList();$('forumNotice').textContent='';}
  catch(e){if(epoch===state.epoch&&request===state.request){$('forumNotice').textContent=errorText(e);}}
  finally{if(epoch===state.epoch&&request===state.request)state.readBusy=false;}
 }
 function paging(root,offset,hasMore,size,fn){const nav=document.createElement('div');nav.className='actions forum-pages';for(const [label,next] of [['← ANTERIORES',offset-size],['MÁS →',offset+size]]){if(next<0||next>offset&&!hasMore)continue;const b=document.createElement('button');b.className='secondary mini';b.textContent=label;b.onclick=()=>fn(next);nav.appendChild(b);}root.appendChild(nav);}
 function renderList(){
  const root=$('forumTopics');root.replaceChildren();
  if(!state.list?.threads.length){const empty=document.createElement('p');empty.textContent='Todavía no hay temas en esta categoría. Podés abrir el primero.';root.appendChild(empty);}
  for(const t of state.list?.threads||[]){const row=document.createElement('article');row.className='forum-topic';const title=document.createElement('button');title.className='forum-topic-title';title.textContent=t.title+(t.locked?' · Cerrado':'');title.onclick=()=>openThread(t.id);const author=document.createElement('button');author.className='text-button';author.textContent='Por '+t.author;author.onclick=()=>visit(t.author_public_id);const detail=document.createElement('small');detail.textContent=t.replies+' respuestas · '+new Date(t.updated_at).toLocaleDateString('es-AR');row.append(title,author,detail);root.appendChild(row);}
  paging(root,state.offset,state.list?.has_more,20,list);
 }
 async function openThread(id,offset=0){
  if(!identity())return;const changed=state.threadId!==id;if(changed){$('forumReplyForm').reset();state.thread=null;state.nonce=null;state.payload=null;}
  state.threadId=id;const epoch=state.epoch,request=++state.request;go('forumThread');$('forumThreadNotice').textContent='Cargando conversación…';$('forumReplySubmit').disabled=true;
  if(changed){$('forumMessages').replaceChildren();$('forumThreadTitle').textContent='Conversación';$('forumThreadCategory').textContent='';}
  try{const data=await call('arcade_forum_thread',{p_thread:id,p_offset:offset});if(epoch!==state.epoch||request!==state.request)return;state.thread=data;state.postOffset=offset;renderThread();$('forumThreadNotice').textContent='';}
  catch(e){if(epoch===state.epoch&&request===state.request){state.thread=null;$('forumMessages').replaceChildren();$('forumThreadNotice').textContent=errorText(e);$('forumReplyForm').hidden=true;}}
 }
 function renderThread(){
  const t=state.thread;if(!t)return;$('forumThreadTitle').textContent=t.title;$('forumThreadCategory').textContent=categories[t.category];$('forumReplyForm').hidden=t.locked;$('forumReplySubmit').disabled=state.writeBusy;
  const root=$('forumMessages');root.replaceChildren();
  for(const m of t.posts){const row=document.createElement('article');row.className='forum-post';const author=document.createElement('button');author.className='forum-author secondary';const art=document.createElement('span');art.innerHTML=avatar(m);const name=document.createElement('strong');name.textContent=m.author;author.append(art,name);author.onclick=()=>visit(m.author_public_id);const date=document.createElement('small');date.textContent=new Date(m.created_at).toLocaleString('es-AR');const body=document.createElement('p');body.className='forum-body';body.textContent=m.deleted?'Mensaje retirado por su autor.':m.body;row.append(author,date,body);
   if(!m.deleted){const action=document.createElement('button');action.className='secondary mini';action.textContent=m.is_mine?'RETIRAR MENSAJE':m.reported?'REPORTADO':'REPORTAR';action.disabled=state.writeBusy||m.reported;action.onclick=()=>act(m);row.appendChild(action);}root.appendChild(row);}
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
  const payload={p_thread:isTopic?null:state.threadId,p_category:state.category,p_title:isTopic?$('forumTopicTitle').value.trim():null,p_body:$(isTopic?'forumTopicBody':'forumReplyBody').value.trim()};
  const key=JSON.stringify(payload);if(state.payload!==key){state.payload=key;state.nonce=crypto.randomUUID();}
  const epoch=state.epoch;state.writeBusy=true;const button=$(isTopic?'forumTopicSubmit':'forumReplySubmit'),notice=$(isTopic?'forumNotice':'forumThreadNotice');button.disabled=true;notice.textContent='Publicando…';
  try{const data=await call('arcade_forum_publish',{...payload,p_request:state.nonce});if(epoch!==state.epoch)return;state.nonce=null;state.payload=null;if($(isTopic?'forumTopicBody':'forumReplyBody').value.trim()===payload.p_body)form.reset();state.writeBusy=false;if(!$(isTopic?'forum':'forumThread').classList.contains('hidden')&&(isTopic||state.threadId===payload.p_thread))await openThread(data.thread_id,data.post_offset||0);}
  catch(e){if(epoch===state.epoch)notice.textContent=errorText(e);}
  finally{if(epoch===state.epoch){state.writeBusy=false;button.disabled=false;}}
 }
 $('forumCategory').onchange=()=>{state.category=$('forumCategory').value;state.list=null;$('forumTopics').replaceChildren();void list(0);};
 $('forumRefresh').onclick=()=>list();$('forumThreadRefresh').onclick=()=>state.threadId&&openThread(state.threadId,state.postOffset);
 $('forumTopicForm').onsubmit=e=>publish(e,true);$('forumReplyForm').onsubmit=e=>publish(e,false);$('forumBack').onclick=()=>{go('forum');void list();};
 return {open,reset};
}
