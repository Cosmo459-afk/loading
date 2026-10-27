// Verify inside the requesting app/browser; never put codes or tokens in URLs or storage.
export function installEmailCodes({client,identity,complete}){
 const pending={};let busy=false;
 for(const context of ['login','link']){
  const form=document.createElement('form');form.hidden=true;form.id=context+'CodeForm';form.innerHTML='<label for="'+context+'Code">Código del correo</label><input id="'+context+'Code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required placeholder="Pegá el código"><button type="submit">CONFIRMAR CÓDIGO</button><p class="muted">Volvé a esta app y pegá el código del correo. No necesitás abrir el enlace.</p>';
  document.getElementById(context==='login'?'loginEmailChoice':'linkEmailChoice').append(form);
  const message=text=>{document.getElementById(context==='login'?'authMessage':'linkMessage').textContent=text;};
  form.onsubmit=async event=>{
   event.preventDefault();const request=pending[context];if(busy||!request||!form.reportValidity())return;
   if(identity()!==request.owner){message('Tu sesión cambió. Solicitá otro código.');return;}
   busy=true;const button=form.querySelector('button');button.disabled=true;message('Verificando código…');
   try{const {data,error}=await client.auth.verifyOtp({email:request.email,token:form.querySelector('input').value.trim(),type:context==='link'?'email_change':'email'});if(error)throw error;if(!data.session)throw Error('Missing session');form.reset();form.hidden=true;delete pending[context];await complete(data.session).catch(()=>message('Acceso confirmado. Recargá la app para cargar tu jugador.'));}
   catch{message('Código incorrecto o vencido. Revisalo o solicitá otro correo.');}
   finally{busy=false;button.disabled=false;}
  };
 }
 return {sent(context,email){pending[context]={email,owner:identity()};const form=document.getElementById(context+'CodeForm');form.reset();form.hidden=false;form.querySelector('input').focus();},reset(){for(const context of ['login','link']){delete pending[context];const form=document.getElementById(context+'CodeForm');form.reset();form.hidden=true;}}};
}
