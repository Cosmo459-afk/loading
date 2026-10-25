// SVG sprite images also defer: browsers otherwise fetch href inside hidden screens.
export function installLazyCardImages(){
 const watched=new WeakSet();
 function load(el){
  const src=el.getAttribute('data-card-src');if(!src)return;
  el.removeAttribute('data-card-src');
  el.addEventListener('error',()=>{
   const root=el.closest('.card-art');if(!root||root.querySelector('.image-retry'))return;
   const nested=!!root.closest('button'),retry=document.createElement(nested?'span':'button');if(!nested)retry.type='button';retry.className='image-retry';retry.textContent=nested?'Abrí la carta para reintentar':'REINTENTAR IMAGEN';
   retry.onclick=e=>{e.stopPropagation();retry.remove();el.removeAttribute('href');requestAnimationFrame(()=>el.setAttribute('href',src));};root.appendChild(retry);
  });
  el.addEventListener('load',()=>el.closest('.card-art')?.querySelector('.image-retry')?.remove());
  el.setAttribute('href',src);
 }
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);load(e.target);}},{rootMargin:'100px 0px'}):null;
 function scan(root){if(!(root instanceof Element))return;const targets=[...(root.matches('image[data-card-src]')?[root]:[]),...root.querySelectorAll('image[data-card-src]')];for(const el of targets){if(watched.has(el))continue;watched.add(el);if(observer)observer.observe(el);else load(el);}}
 new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes)scan(node);for(const node of record.removedNodes)if(node instanceof Element){if(node.matches('image[data-card-src]'))observer?.unobserve(node);for(const child of node.querySelectorAll('image[data-card-src]'))observer?.unobserve(child);}}}).observe(document.body,{childList:true,subtree:true});
 scan(document.body);
}
