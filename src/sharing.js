import {drawRanking} from './ranking-image.js';
// All exports contain public presentation data only; never sessions, email or coupon codes.
export const PUBLIC_SITE='https://loading-arcade.tienda-somosloading.workers.dev/';
const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/png'));
export function installSharing({profile,avatar,brand,siteArt,owned}){
 const $=id=>document.getElementById(id);let current=null,format='feed',url=null,fileBlob=null,epoch=0;
 const profileLink=p=>p?.publicId?PUBLIC_SITE+'#jugador/'+encodeURIComponent(p.publicId):PUBLIC_SITE;
 const publicPlayer=p=>({name:p.name,publicId:p.publicId,avatar:p.avatar||0,cosmetics:{...p.cosmetics},level:p.level||Math.floor((p.xp||0)/1800)+1,best:Number(p.bestPerfectStreak)||0});
 function release(){if(url)URL.revokeObjectURL(url);url=null;fileBlob=null;}
 function clear(){epoch++;current=null;release();$('sharePreview').removeAttribute('src');$('shareMessage').value='';if($('shareDialog').open)$('shareDialog').close();}
 function text(ctx,value,x,y,max,size=32,color='#eef2ff',weight=600){ctx.fillStyle=color;ctx.font=weight+' '+size+'px LoadingSans,sans-serif';ctx.textAlign='center';ctx.fillText(value,x,y,max);}
 function lines(ctx,value,x,y,width,size=28,maxLines=3,color='#b9c5df'){ctx.font='500 '+size+'px LoadingSans,sans-serif';const words=String(value).split(/\s+/),rows=[];let row='';for(const word of words){const next=row?row+' '+word:word;if(ctx.measureText(next).width>width&&row){rows.push(row);row=word;}else row=next;}if(row)rows.push(row);for(let n=0;n<Math.min(rows.length,maxLines);n++)text(ctx,rows[n],x,y+n*size*1.45,width,size,color,500);}
 function frame(ctx,h){const g=ctx.createLinearGradient(0,0,1080,h);g.addColorStop(0,'#24213b');g.addColorStop(.5,'#0d1525');g.addColorStop(1,'#21152e');ctx.fillStyle=g;ctx.fillRect(0,0,1080,h);ctx.strokeStyle='#6b5983';ctx.lineWidth=2;ctx.strokeRect(42,42,996,h-84);ctx.fillStyle='#83d9f5';ctx.fillRect(82,78,65,4);ctx.fillStyle='#e5a1d4';ctx.fillRect(933,h-82,65,4);}
 async function render(){
  if(!current)return;const request=++epoch,item=current;release();$('sharePreview').removeAttribute('src');$('shareImageBtn').disabled=true;$('downloadShareBtn').disabled=true;$('shareStatus').textContent='Preparando tu imagen…';
  for(const b of $('shareFormats').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.format===format));
  try{
   await document.fonts.ready;const h=format==='story'?1920:1350,canvas=document.createElement('canvas');canvas.width=1080;canvas.height=h;const ctx=canvas.getContext('2d');frame(ctx,h);
   if(item.kind==='ranking'){await drawRanking(ctx,h,item);}else{
   const logo=await load(brand);const lw=740;ctx.drawImage(logo,170,100,lw,lw*logo.naturalHeight/logo.naturalWidth);
   const mid=format==='story'?650:480;
   if(item.kind==='site'){
    const art=await load(siteArt),w=920,ah=w*art.naturalHeight/art.naturalWidth;ctx.drawImage(art,80,mid,w,ah);text(ctx,'VENÍ A JUGAR',540,h-280,900,52,'#f3e8fa',800);lines(ctx,'Creá tu personaje y empezá tu ruta retro.',540,h-215,850,29);
   }else if(item.kind==='card'){
    const c=item.card,edge={common:'#7ea8f5',epic:'#e395d6',legendary:'#eccb75',exclusive:'#74e9b5'}[c.rarityKey]||'#7ea8f5';const w=format==='story'?680:480,x=(1080-w)/2,y=format==='story'?500:460;ctx.fillStyle='#080d17';ctx.fillRect(x-12,y-62,w+24,w+285);ctx.strokeStyle=edge;ctx.lineWidth=4;ctx.strokeRect(x-12,y-62,w+24,w+285);text(ctx,c.name,540,y-24,w-20,31,'#f4edf5',800);
    const art=await load(c.image),crop=c.crop||[0,0,...c.referenceSize];ctx.drawImage(art,...crop,x,y,w,w);text(ctx,c.game,540,y+w+45,w-15,25,edge,700);lines(ctx,c.description||'',540,y+w+88,w-30,23,3);text(ctx,c.rarity.toUpperCase()+' · '+(c.exclusive?'PERFECT SCORE':String(c.ordinal).padStart(2,'0')+'/14'),540,y+w+193,w-10,23,edge,700);text(ctx,item.player.name+' · MI COLECCIÓN',540,h-150,900,24,'#c2cee3');
   }else{
    const p=item.player,mascot=await load(avatar(p));const size=format==='story'?300:225;ctx.drawImage(mascot,(1080-size)/2,mid,size,size);text(ctx,p.name,540,mid+size+75,900,48,'#f4edf5',800);
    if(item.kind==='result'){const r=item.result;text(ctx,r.correct+'/'+(r.total||5),540,mid+size+230,900,122,'#e5a1d4',800);text(ctx,r.total===20?'DESAFÍO SEMANAL FINALIZADO':r.passed?'¡TRIVIA COMPLETADA!':'TRIVIA FINALIZADA',540,mid+size+295,900,32);text(ctx,(r.console==='ps1'?'PlayStation 1':'PlayStation 2')+' · '+r.difficulty+' · +'+r.score+' XP',540,mid+size+345,900,27,'#bac8e2');}
    else{text(ctx,'NIVEL '+p.level,540,mid+size+180,900,67,'#e5a1d4',800);text(ctx,p.best?'Mejor racha · '+p.best+' trivias perfectas':'MI PERFIL RETRO',540,mid+size+245,900,29,'#bac8e2');text(ctx,'¿COMPARTIMOS LA PARTIDA?',540,h-215,900,32,'#83d9f5');}
   }
   text(ctx,'LOADING ARCADE · DEMOSTRÁ CUÁNTO SABÉS',540,h-100,940,24,'#e5cce5',700);text(ctx,new URL(PUBLIC_SITE).hostname,540,h-60,940,20,'#acbad5',500);
   }
   const result=await png(canvas);if(request!==epoch||current!==item)return;fileBlob=result;url=URL.createObjectURL(result);$('sharePreview').src=url;$('shareImageBtn').disabled=false;$('downloadShareBtn').disabled=false;$('shareStatus').textContent='Imagen lista. Compartila o guardala para subirla a tus redes.';
  }catch{if(request===epoch)$('shareStatus').textContent='No pudimos generar la imagen. Podés copiar el enlace o volver a intentarlo.';}
 }
 function open(item){current=item;format='feed';$('shareHeading').textContent={ranking:'Compartir top 10 semanal',site:'Compartir Loading Arcade',profile:'Compartir perfil',result:'Compartir mi resultado',card:'Compartir mi carta'}[item.kind];$('shareMessage').value=item.text+'\n'+item.link;$('shareLink').value=item.link;$('shareHelp').textContent=item.kind==='card'?'La imagen muestra la carta que elegiste. El enlace lleva a tu perfil y no cambia las cartas que exhibís.':'Elegí publicación o historia. En Instagram podés subir la imagen y pegar el enlace como sticker.';if(!$('shareDialog').open)$('shareDialog').showModal();void render();}
 function shareSite(){open({kind:'site',link:PUBLIC_SITE,text:'Demostrá cuánto sabés. Trivias retro, coleccionables y comunidad en Loading Arcade.'});}
 function shareProfile(value=profile()){if(!value)return;const p=publicPlayer(value);open({kind:'profile',player:p,link:profileLink(p),text:p.name+' · Nivel '+p.level+' en Loading Arcade. Visitá el perfil y vení a jugar.'});}
 function shareResult(result){if(!profile()||!result)return;const p=publicPlayer(profile());open({kind:'result',player:p,result:{...result},link:profileLink(p),text:'Conseguí '+result.correct+'/'+(result.total||5)+' en una trivia de '+(result.console==='ps1'?'PlayStation 1':'PlayStation 2')+' en Loading Arcade. ¿Cuánto sabés vos?'});}
 function shareCard(card){if(!profile()||!owned(card?.id))return;const p=publicPlayer(profile());open({kind:'card',player:p,card:{...card},link:profileLink(p),text:'Conseguí '+card.name+' · '+card.rarity+' de '+card.game+' en Loading Arcade. Descubrí tu próxima carta.'});}
 function shareRanking(hub){if(!hub?.challenge)return;const captured=hub.server_now||new Date().toISOString(),c=hub.challenge;open({kind:'ranking',challenge:{...c},top:(hub.top||[]).slice(0,10).map(p=>({place:p.place,nickname:p.nickname,correct:p.correct,points:p.points,elapsed_ms:p.elapsed_ms})),captured,final:c.status==='closed'||Date.parse(c.ends_at)<=Date.parse(captured),link:PUBLIC_SITE,text:'Top 10 de '+c.title+' en Loading Arcade. ¿Te sumás al desafío?'});}
 function download(){if(!url||!current)return;const a=document.createElement('a');a.href=url;a.download='loading-arcade-'+current.kind+'-'+format+'.png';a.click();}
 async function copy(value,field){try{await navigator.clipboard.writeText(value);$('shareStatus').textContent='Copiado. Ya podés pegarlo donde quieras.';}catch{$(field).focus();$(field).select();$('shareStatus').textContent='Seleccionamos el texto. Copialo manualmente.';}}
 $('shareCopyLink').onclick=()=>copy($('shareLink').value,'shareLink');$('shareCopyMessage').onclick=()=>copy($('shareMessage').value,'shareMessage');$('downloadShareBtn').onclick=download;$('shareRetry').onclick=()=>render();
 $('shareImageBtn').onclick=async()=>{if(!fileBlob||!current)return;const file=new File([fileBlob],'loading-arcade-'+current.kind+'.png',{type:'image/png'});try{if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:'Loading Arcade',text:current.text+'\n'+current.link});else $('shareStatus').textContent='Este navegador no permite compartir imágenes directamente. Usá GUARDAR IMAGEN y COPIAR TEXTO.';}catch(e){if(e.name!=='AbortError')$('shareStatus').textContent='No pudimos compartir directamente. Podés guardar la imagen y copiar el texto.';}};
 $('shareNativeLink').onclick=async()=>{if(!current)return;try{if(navigator.share)await navigator.share({title:'Loading Arcade',text:current.text,url:current.link});else await copy(current.link,'shareLink');}catch(e){if(e.name!=='AbortError')$('shareStatus').textContent='Podés usar COPIAR ENLACE para compartirlo.';}};
 for(const b of $('shareFormats').querySelectorAll('button'))b.onclick=()=>{if(format!==b.dataset.format){format=b.dataset.format;void render();}};
 $('shareDialog').addEventListener('close',()=>{epoch++;release();$('sharePreview').removeAttribute('src');current=null;});
 return {shareSite,shareProfile,shareResult,shareCard,shareRanking,clear};
}
