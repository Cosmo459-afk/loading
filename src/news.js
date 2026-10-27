// Public release notes: no game answers, undiscovered cards or personal data.
export const updates=[
 {id:'v49-app',date:'27/10/2026',title:'Loading Arcade, a un toque',text:'Ahora podés agregar el Arcade a la pantalla de inicio de tu celular y abrirlo como una app.',details:['Buscá «Instalar app» en Inicio. En iPhone, usá Safari → Compartir → Agregar a inicio.','Necesitás internet para jugar. Tu progreso sigue vinculado a tu cuenta.']},
 {id:'v48-cards',date:'27/10/2026',title:'Más espacio para tus cartas',text:'Tu perfil ahora tiene 4 espacios para exhibir cartas, incluidas las exclusivas que ganaste en el desafío semanal.',details:['Podés elegir, reemplazar y quitar cartas desde Perfil → Mis cartas.','Si ganaste una exclusiva, encontrarás un aviso para exhibirla en tu perfil.']},
 {id:'v47-account',date:'27/10/2026',title:'Tu cuenta, lista para competir',text:'Para comenzar un nuevo intento del desafío semanal necesitás vincular una cuenta verificada.',details:['Podés usar Google o correo desde el registro.','Las trivias normales siguen disponibles con tu personaje, sin registro obligatorio.']}
];
export function installNews(){
 const key='loading_arcade_news_read',latest=updates[0];
 const section=document.createElement('section');section.id='arcadeNews';section.className='home-news';section.setAttribute('aria-labelledby','arcadeNewsTitle');
 const heading=document.createElement('h2');heading.id='arcadeNewsTitle';heading.textContent='Novedades';
 const badge=document.createElement('span');badge.className='news-unread';badge.textContent='NUEVO';badge.setAttribute('aria-label','Novedades sin leer');
 const top=document.createElement('div');top.className='home-news-heading';top.append(heading,badge);
 const title=document.createElement('strong');title.textContent=latest.title;const summary=document.createElement('p');summary.textContent=latest.text;
 const open=document.createElement('button');open.id='openArcadeNews';open.className='secondary mini action-quiet';open.textContent='VER NOVEDADES';section.append(top,title,summary,open);
 const home=document.getElementById('home'),install=document.getElementById('homeInstallArcade');home.insertBefore(section,install);
 const dialog=document.createElement('dialog');dialog.id='arcadeNewsDialog';dialog.setAttribute('aria-labelledby','allNewsTitle');dialog.innerHTML='<form method="dialog"><button class="secondary mini action-quiet" aria-label="Cerrar novedades">CERRAR ×</button></form><h2 id="allNewsTitle">Novedades del Arcade</h2>';
 for(const item of updates){const article=document.createElement('article');article.className='news-entry';const date=document.createElement('p');date.className='eyebrow';date.textContent=item.date;const h=document.createElement('h3');h.textContent=item.title;const text=document.createElement('p');text.textContent=item.text;const list=document.createElement('ul');for(const detail of item.details){const li=document.createElement('li');li.textContent=detail;list.append(li);}article.append(date,h,text,list);dialog.append(article);}
 document.body.append(dialog);
 const sync=()=>{try{badge.hidden=localStorage.getItem(key)===latest.id;}catch{badge.hidden=false;}};sync();
 open.onclick=()=>{dialog.showModal();badge.hidden=true;try{localStorage.setItem(key,latest.id);}catch{}};
 window.addEventListener('storage',event=>{if(event.key===key)sync();});
}
