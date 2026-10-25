// Add consistent feedback to existing application-owned status nodes.
// Do not inspect or modify user-authored forum content.
export function installPolish(){
 const selectors=['#cloudNotice','#forumNotice','#forumThreadNotice','#forumComposeNotice','#adminNotice','#chestOpeningStatus','#cardDetailStatus','#shareStatus','#likeNotice'];
 const update=()=>{for(const selector of selectors){const el=document.querySelector(selector);if(!el)continue;const text=el.textContent.trim();let kind='';if(/no pudimos|no se pudo|error|falló|no tenés conexión|no se guardó/i.test(text))kind='error';else if(/cargando|guardando|publicando|conectando|preparando|abriendo|enviando/i.test(text))kind='loading';else if(/guardad[oa]|publicad[oa]|copiado|recibido|canje confirmado|retirado\./i.test(text))kind='success';if(kind)el.dataset.uiState=kind;else delete el.dataset.uiState;}};
 update();const observer=new MutationObserver(update);observer.observe(document.querySelector('main'),{childList:true,subtree:true,characterData:true});
}
