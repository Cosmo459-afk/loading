export function installPWA(){
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let prompt=null,registration=null,reloading=false;
 const entry=document.createElement('button');entry.id='installArcade';entry.className='secondary mini';entry.textContent='INSTALAR LOADING ARCADE';entry.hidden=standalone();
 const footer=document.querySelector('footer');footer.prepend(entry);
 const home=document.createElement('div');home.className='home-install-app';home.id='homeInstallArcade';home.hidden=standalone();home.innerHTML='<p><strong>Tu arcade, a un toque</strong>Agregalo a la pantalla de inicio de tu celular.</p><button class="secondary mini">INSTALAR APP</button>';document.getElementById('home').append(home);home.querySelector('button').onclick=()=>entry.click();
 const hideInstalled=()=>{entry.hidden=standalone();home.hidden=standalone();};
 const dialog=document.createElement('dialog');dialog.id='installArcadeDialog';dialog.setAttribute('aria-label','Instalar Loading Arcade');
 dialog.innerHTML='<form method="dialog"><button class="secondary mini action-quiet" aria-label="Cerrar instalación">CERRAR ×</button></form><h2>Tu arcade, a mano</h2><p>Agregá Loading Arcade a la pantalla de inicio de tu celular. Necesitás internet para jugar.</p><button id="installArcadeNative" hidden>INSTALAR</button><div id="installArcadeHelp"></div><p class="muted" id="installArcadeStatus" role="status"></p>';
 document.body.append(dialog);const native=dialog.querySelector('#installArcadeNative'),help=dialog.querySelector('#installArcadeHelp'),status=dialog.querySelector('#installArcadeStatus');
 function render(){native.hidden=!prompt;help.innerHTML=prompt?'':/iPad|iPhone|iPod/.test(navigator.userAgent)?'<p><strong>En Safari:</strong> tocá Compartir y después «Agregar a inicio» o «Añadir a pantalla de inicio».</p>':'<p><strong>En Android:</strong> abrí el menú de Chrome (⋮) y elegí «Instalar aplicación» o «Agregar a la pantalla principal».</p><p><strong>En computadora:</strong> usá la opción de instalar en Chrome o Edge, si aparece.</p>';if(!prompt)help.innerHTML+='<p class="muted">Si llegaste desde Instagram o Facebook, abrí este sitio en Safari o Chrome desde el menú del navegador.</p>';}
 entry.onclick=()=>{render();status.textContent='';dialog.showModal();};
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;hideInstalled();render();});
 native.onclick=async()=>{const current=prompt;if(!current)return;prompt=null;native.disabled=true;try{await current.prompt();const result=await current.userChoice;status.textContent=result.outcome==='accepted'?'Seguí las indicaciones del navegador para terminar.':'Podés instalarlo más adelante desde este botón.';}catch{status.textContent='Usá la opción de instalar desde el menú del navegador.';}finally{native.disabled=false;render();}};
 window.addEventListener('appinstalled',()=>{entry.hidden=true;home.hidden=true;prompt=null;if(dialog.open)dialog.close();});
 matchMedia('(display-mode: standalone)').addEventListener?.('change',hideInstalled);
 if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
 const update=document.createElement('button');update.id='updateArcade';update.className='secondary mini';update.textContent='ACTUALIZAR LOADING ARCADE';update.hidden=true;footer.prepend(update);
 const playing=()=>!!document.querySelector('#quiz:not(.hidden),#weeklyPlay:not(.hidden),#chestOpening:not(.hidden)');
 const refreshButton=()=>{update.disabled=playing();update.title=update.disabled?'Terminá la partida antes de actualizar.':'';};
 new MutationObserver(refreshButton).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['class','hidden','open']});
 update.onclick=()=>{if(playing()||!registration?.waiting)return;reloading=true;update.disabled=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});};
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
 const waiting=()=>{update.hidden=!(registration?.waiting&&registration?.active);refreshButton();};
 const register=async()=>{try{registration=await navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'});waiting();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(['installed','activated','redundant'].includes(worker.state))waiting();});});}catch{/* Installation never blocks normal gameplay. */}};
 if(document.readyState==='complete')void register();else window.addEventListener('load',register,{once:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void registration?.update().catch(()=>{});});
}
