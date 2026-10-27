// Public release notes: no game answers, undiscovered cards or personal data.
export const updates=[
 {id:'v49-app',date:'27/10/2026',title:'Loading Arcade, a un toque',text:'Ahora podés agregar el Arcade a la pantalla de inicio de tu celular y abrirlo como una app.',details:['Buscá «Instalar app» en Inicio. En iPhone, usá Safari → Compartir → Agregar a inicio.','Necesitás internet para jugar. Tu progreso sigue vinculado a tu cuenta.']},
 {id:'v48-cards',date:'27/10/2026',title:'Más espacio para tus cartas',text:'Tu perfil ahora tiene 4 espacios para exhibir cartas, incluidas las exclusivas que ganaste en el desafío semanal.',details:['Podés elegir, reemplazar y quitar cartas desde Perfil → Mis cartas.','Si ganaste una exclusiva, encontrarás un aviso para exhibirla en tu perfil.']},
 {id:'v47-account',date:'27/10/2026',title:'Tu cuenta, lista para competir',text:'Para comenzar un nuevo intento del desafío semanal necesitás vincular una cuenta verificada.',details:['Podés usar Google o correo desde el registro.','Las trivias normales siguen disponibles con tu personaje, sin registro obligatorio.']}
];
export function installNews({go}){
 const key='loading_arcade_news_read',latest=updates[0],button=document.getElementById('navNews');
 const badge=document.createElement('span');badge.className='news-unread-dot';badge.setAttribute('aria-label','Novedades sin leer');button.append(badge);
 const section=document.createElement('section');section.id='arcadeNews';section.className='hidden news-page';section.setAttribute('aria-labelledby','allNewsTitle');
 section.innerHTML='<p class="eyebrow">LO QUE HAY DE NUEVO</p><h1 id="allNewsTitle" tabindex="-1">NOVEDADES</h1><button class="secondary mini action-quiet" onclick="goBack()">← VOLVER</button>';
 for(const item of updates){const article=document.createElement('article');article.className='news-entry';const date=document.createElement('p');date.className='eyebrow';date.textContent=item.date;const h=document.createElement('h2');h.textContent=item.title;const text=document.createElement('p');text.textContent=item.text;const list=document.createElement('ul');for(const detail of item.details){const li=document.createElement('li');li.textContent=detail;list.append(li);}article.append(date,h,text,list);section.append(article);}
 document.querySelector('main').append(section);
 const sync=()=>{try{badge.hidden=localStorage.getItem(key)===latest.id;}catch{badge.hidden=false;}};sync();
 window.openNews=()=>{go('arcadeNews');badge.hidden=true;try{localStorage.setItem(key,latest.id);}catch{}document.getElementById('allNewsTitle').focus({preventScroll:true});};
 window.addEventListener('storage',event=>{if(event.key===key)sync();});
}
