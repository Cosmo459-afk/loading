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
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),inApp=/Instagram|FBAN|FBAV/.test(navigator.userAgent);
 const guides=[
 ['ios-safari','iPhone / iPad · Safari',['Abrí Loading Arcade en Safari.','Tocá Compartir (cuadrado con flecha hacia arriba).','Elegí «Agregar a inicio» o «Añadir a pantalla de inicio» y confirmá «Agregar».']],
 ['ios-chrome','iPhone / iPad · Chrome u otro navegador',['Tocá «Copiar enlace».','Abrí Safari y pegá el enlace en la barra de direcciones.','Tocá Compartir → Agregar a inicio → Agregar.']],
 ['android','Android · Chrome',['Abrí Loading Arcade en Chrome.','Tocá «Instalar» si aparece, o abrí el menú ⋮.','Elegí «Instalar aplicación» o «Agregar a pantalla principal» y confirmá.']],
 ['samsung','Android · Samsung Internet',['Abrí el sitio en Samsung Internet.','Tocá el menú ☰.','Elegí «Añadir página a» → «Pantalla de inicio». Si no aparece, abrí el enlace en Chrome.']],
 ['in-app','Desde Instagram o Facebook',['Abrí el menú ⋯ del navegador donde estás viendo el sitio.','Elegí «Abrir en el navegador». Si no aparece, copiá el enlace.','En iPhone, abrilo en Safari. En Android, en Chrome. Luego seguí la guía correspondiente.']],
 ['desktop','Computadora · Chrome o Edge',['Abrí Loading Arcade en Chrome o Edge.','Buscá el ícono de instalar junto a la dirección, o la opción de instalar en el menú ⋮.','Confirmá la instalación. Si no aparece esa opción, podés seguir jugando desde la web.']]
 ];
 const recommended=inApp?'in-app':ios?(/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)?'ios-chrome':'ios-safari'):/SamsungBrowser/.test(navigator.userAgent)?'samsung':/Android/.test(navigator.userAgent)?'android':'desktop';
 function render(){native.hidden=!prompt;help.replaceChildren();for(const [id,label,steps] of guides){const details=document.createElement('details');details.open=id===recommended;const summary=document.createElement('summary');summary.textContent=label;const list=document.createElement('ol');for(const step of steps){const li=document.createElement('li');li.textContent=step;list.append(li);}details.append(summary,list);help.append(details);}}
 const copy=document.createElement('button');copy.id='copyInstallLink';copy.className='secondary mini';copy.textContent='COPIAR ENLACE';help.before(copy);copy.onclick=async()=>{const url=new URL('./',location.href).href;try{await navigator.clipboard.writeText(url);status.textContent='Enlace copiado. Pegalo en '+(ios?'Safari.':'Chrome.');}catch{status.textContent='Copiá este enlace: '+url;}};

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
