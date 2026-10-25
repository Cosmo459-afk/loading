// Personalized exports are rendered locally; private coupon codes never enter result images.
const image=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
const blob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Export failed')),'image/png'));
export function installRewardUI({profile,coupon,couponError,uid,requestRedemption,avatar,brand,art}){
 let couponURL=null;
 const $=id=>document.getElementById(id);
 function revoke(){if(couponURL)URL.revokeObjectURL(couponURL);couponURL=null;}
 function clear(){revoke();$('couponContent').replaceChildren();}
 function redemptionText(c){return 'Hola Loading! Quiero canjear mi cupón de 10% de descuento de Loading Arcade. Mi código es '+c.code+'. Mi jugador es '+profile().name+'. Entiendo que es de un solo uso y no acumulable.';}
 async function copy(text){try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
 function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
 async function showCoupon(){
  const c=coupon(),p=profile(),owner=uid(),root=$('couponContent');root.replaceChildren();
  if(!p)return;
  if(couponError()){const note=document.createElement('p');note.textContent='No pudimos cargar tu cupón. Tu progreso sigue guardado. Volvé a intentarlo.';const retry=document.createElement('button');retry.textContent='REINTENTAR';retry.onclick=()=>window.openBenefits();root.append(note,retry);return;}
  if(!c?.id){const note=document.createElement('p');note.textContent='Tu cupón del 10% llega al nivel 5 (7200 XP). En ese nivel recibís el descuento en lugar del cofre; los cofres vuelven desde el nivel 6.';root.appendChild(note);return;}
  const img=document.createElement('img');img.className='coupon-image';img.alt='Cupón personal de Loading Arcade: 10% de descuento, nivel 5, un solo uso, no acumulable y sin vencimiento.';root.appendChild(img);
  const code=document.createElement('p');code.className='coupon-code';code.textContent=c.code;root.appendChild(code);
  const status=document.createElement('p');status.id='couponStatus';status.setAttribute('role','status');status.textContent=c.redeemed_at?'Este cupón ya fue canjeado.':'Tu cupón está guardado en tu perfil. Podés solicitar el canje cuando quieras.';root.appendChild(status);
  const instructions=document.createElement('p');instructions.className='muted';instructions.textContent='Para comprar en la Tienda Nube de Loading. 10% de descuento · Un solo uso · No acumulable · Sin vencimiento. Loading valida el código y confirma el canje por Instagram. Abrir el chat no consume el cupón.';root.appendChild(instructions);
  const catalog=document.createElement('a');catalog.className='button-link secondary';catalog.textContent='VER CATÁLOGO';catalog.href='https://somosloading.mitiendanube.com/';catalog.target='_blank';catalog.rel='noopener noreferrer';root.appendChild(catalog);
  const actions=document.createElement('div');actions.className='actions';
  const redeem=document.createElement('a');redeem.className='button-link';redeem.textContent='CANJEAR CÓDIGO';redeem.href='https://ig.me/m/somosloading';redeem.target='_blank';redeem.rel='noopener noreferrer';
  const text=document.createElement('textarea');text.id='couponMessage';text.readOnly=true;text.rows=5;text.setAttribute('aria-label','Mensaje preparado para Instagram');text.value=redemptionText(c);
  const help=document.createElement('p');help.className='muted';help.textContent='El botón abre directamente el chat de @somosloading y copia este mensaje cuando el navegador lo permite. Si Instagram no lo completa, pegalo en el chat.';
  redeem.onclick=()=>{void copy(text.value).then(ok=>{if(owner===uid())status.textContent=ok?'Mensaje copiado. Pegalo en el chat de Instagram para solicitar el canje.':'Copiá el mensaje de abajo y pegalo en el chat de Instagram.';});void requestRedemption(c.id);};
  const copyButton=document.createElement('button');copyButton.className='secondary';copyButton.textContent='COPIAR MENSAJE';copyButton.onclick=async()=>{const ok=await copy(text.value);if(owner===uid()){status.textContent=ok?'Mensaje copiado.':'Seleccioná el mensaje y copialo manualmente.';if(!ok){text.focus();text.select();}}};
  if(!c.redeemed_at)actions.append(redeem,copyButton);
  const save=document.createElement('button');save.className='secondary';save.textContent='GUARDAR IMAGEN';save.disabled=true;save.onclick=()=>couponURL&&download(couponURL,'loading-cupon-'+c.code+'.png');actions.appendChild(save);root.append(actions,help,text);
  try{
   await document.fonts.ready;const base=await image(art),canvas=document.createElement('canvas');canvas.width=base.naturalWidth;canvas.height=base.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(base,0,0);ctx.textAlign='center';ctx.fillStyle='#d6cde2';ctx.font='700 '+Math.round(canvas.width*.02)+'px sans-serif';ctx.fillText('PARA COMPRAR EN NUESTRA TIENDA NUBE',canvas.width/2,canvas.height*.71,canvas.width*.78);ctx.fillStyle='#f5e6b3';ctx.font='700 '+Math.round(canvas.width*.035)+'px monospace';ctx.fillText(c.code,canvas.width/2,canvas.height*.765,canvas.width*.78);ctx.fillStyle='#d6cde2';ctx.font=Math.round(canvas.width*.019)+'px sans-serif';ctx.fillText(p.name,canvas.width/2,canvas.height*.805,canvas.width*.7);
   const b=await blob(canvas);if(owner!==uid())return;revoke('coupon');couponURL=URL.createObjectURL(b);img.src=couponURL;save.disabled=false;
  }catch{if(owner!==uid())return;img.src=art;status.textContent+=' No pudimos generar la imagen personalizada, pero tu código sigue disponible.';}
 }
 return {showCoupon,clear};
}
