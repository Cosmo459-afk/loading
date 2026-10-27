// Only configured official providers are offered. Credentials live in Supabase, never here.
export function installRegistration({client,config,identity,rememberReturn}){
 let providers=null,reading=null,busy=false;
 const $=id=>document.getElementById(id);
 function message(context,text){$(context==='link'?'linkMessage':'authMessage').textContent=text;}
 function failure(error){const code=String(error?.code||''),m=String(error?.message||'');if(/identity_already_exists|email_exists|already linked|already registered/i.test(code+' '+m))return 'Ese acceso ya pertenece a otro jugador. No cambiamos tu jugador actual ni fusionamos sus puntos. Podés usar otro acceso o ingresar por separado a tu cuenta existente.';if(/manual_linking_disabled|Manual linking/i.test(code+' '+m))return 'La vinculación con redes todavía no está habilitada. Usá correo por ahora.';if(/provider.*disabled|Unsupported provider/i.test(m))return 'Este proveedor todavía no está habilitado. Podés usar correo.';return 'No pudimos iniciar ese acceso. Tu jugador actual se conserva; volvé a intentarlo o usá correo.';}
 async function social(provider,context){
  if(busy||!providers?.[provider])return;busy=true;document.querySelectorAll('.social-access-button').forEach(b=>b.disabled=true);message(context,'Abriendo '+(provider==='google'?'Google':'Facebook')+'…');rememberReturn();
  try{
   const options={redirectTo:new URL(location.pathname,location.origin).href,skipBrowserRedirect:true};
   // Linking preserves the current UID, profile, cards and progress. Never fall back to account switching.
   const result=identity()?await client.auth.linkIdentity({provider,options}):await client.auth.signInWithOAuth({provider,options});
   if(result.error)throw result.error;if(!result.data?.url)throw new Error('Missing authorization URL');const url=new URL(result.data.url);if(url.protocol!=='https:')throw new Error('Invalid authorization URL');location.assign(url.href);
  }catch(error){message(context,failure(error));}
  finally{busy=false;document.querySelectorAll('.social-access-button').forEach(b=>b.disabled=false);}
 }
 function render(context,failed=false){
  const root=$(context==='link'?'linkProviders':'loginProviders'),choice=$(context==='link'?'linkEmailChoice':'loginEmailChoice');root.replaceChildren();const enabled=['google','facebook'].filter(p=>providers?.[p]);
  for(const provider of enabled){const button=document.createElement('button');button.type='button';button.className='secondary social-access-button';button.dataset.provider=provider;button.textContent='CONTINUAR CON '+provider.toUpperCase();button.onclick=()=>social(provider,context);root.appendChild(button);}
  choice.open=!enabled.length;
  if(failed){const retry=document.createElement('button');retry.type='button';retry.className='secondary action-quiet';retry.textContent='CARGAR OTRAS OPCIONES';retry.onclick=()=>refresh(true);root.appendChild(retry);}
 }
 async function refresh(force=false){
  if(reading)return reading;if(providers&&!force){render('login');render('link');return;}
  reading=(async()=>{try{const response=await fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Settings unavailable');const settings=await response.json();providers={google:settings.external?.google===true,facebook:settings.external?.facebook===true};render('login');render('link');}catch{render('login',true);render('link',true);}finally{reading=null;}})();return reading;
 }
 return {refresh};
}
