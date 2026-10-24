// Original procedural effects only. No music, downloaded recordings or game soundtracks.
const STORAGE='loading_arcade_audio_v1';
const defaults={effects:true,effectsVolume:55};
const midi=n=>440*2**((n-69)/12);
export function installAudio(){
 let settings={...defaults},ctx,effectsBus,started=false;
 const voices=new Set();
 try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');for(const k of ['effects'])if(typeof saved?.[k]==='boolean')settings[k]=saved[k];for(const k of ['effectsVolume'])if(Number.isFinite(saved?.[k]))settings[k]=Math.max(0,Math.min(100,saved[k]));}catch{}
 const panel=document.createElement('details');panel.className='audio-settings';panel.innerHTML='<summary>♪ EFECTOS</summary><div class="audio-controls"><label><input id="audioEffects" type="checkbox"> Efectos</label><label class="audio-volume">Volumen de efectos<input id="audioEffectsVolume" type="range" min="0" max="100" step="5"></label><button id="audioPreview" class="secondary" type="button">PROBAR SONIDO</button><small id="audioStatus" role="status">El audio comienza al interactuar.</small></div>';
 document.querySelector('header').after(panel);
 const controls={effects:panel.querySelector('#audioEffects'),effectsVolume:panel.querySelector('#audioEffectsVolume')};
 for(const [key,input] of Object.entries(controls)){
  if(input.type==='checkbox')input.checked=settings[key];else input.value=settings[key];
  input.addEventListener('input',()=>{settings[key]=input.type==='checkbox'?input.checked:Number(input.value);try{localStorage.setItem(STORAGE,JSON.stringify(settings));}catch{}apply();});
 }
 function status(){panel.querySelector('#audioStatus').textContent=!window.AudioContext&&!window.webkitAudioContext?'Este navegador no admite audio.':!started?'El audio comienza al interactuar.':!settings.effects?'Audio desactivado.':'Preferencias guardadas en este dispositivo.';}
 function note(bus,freq,at,duration,volume=.1,type='triangle',endFreq=null){
  if(!ctx||ctx.state!=='running'||document.hidden)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,at);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,at+duration);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(bus);const voice={osc,gain,bus};voices.add(voice);osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(voice);};osc.start(at);osc.stop(at+duration+.02);
 }
 function clearVoices(bus){for(const v of [...voices])if(!bus||v.bus===bus){try{v.osc.stop();}catch{}v.osc.disconnect();v.gain.disconnect();voices.delete(v);}}
 function chestTexture(at){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.6),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.7+.3*Math.sin(i*.009));
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(180,at);filter.frequency.exponentialRampToValueAtTime(1100,at+.5);filter.Q.value=2;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.2,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+.6);source.connect(filter);filter.connect(gain);gain.connect(effectsBus);
  const voice={osc:source,gain,bus:effectsBus};voices.add(voice);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();voices.delete(voice);};source.start(at);source.stop(at+.61);
 }
 function apply(){
  status();if(!ctx)return;
  effectsBus.gain.setTargetAtTime(settings.effects?settings.effectsVolume/100*.6:0,ctx.currentTime,.015);
  if(!settings.effects)clearVoices(effectsBus);
 }
 function unlock(){
  if(document.hidden)return;
  try{
   if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){status();return;}ctx=new Audio();effectsBus=ctx.createGain();effectsBus.gain.value=0;const master=ctx.createDynamicsCompressor();master.threshold.value=-12;master.ratio.value=8;effectsBus.connect(master);master.connect(ctx.destination);ctx.onstatechange=()=>{if(ctx.state==='running')apply();};}
   started=true;status();if(ctx.state!=='running')ctx.resume().then(apply).catch(()=>{panel.querySelector('#audioStatus').textContent='Tocá de nuevo para activar el audio.';});else apply();
  }catch{panel.querySelector('#audioStatus').textContent='No pudimos iniciar el audio. Podés seguir jugando.';}
 }
 function play(cue){
  if(!settings.effects||!ctx||ctx.state!=='running'||document.hidden)return;
  const now=ctx.currentTime+.01;
  if(cue==='chest'){chestTexture(now);note(effectsBus,110,now,.2,.3,'sine',42);}
  const patterns={tap:[[76,0,.07]],select:[[72,0,.08],[79,.07,.12]],question:[[76,0,.1],[79,.09,.14]],success:[[72,0,.15],[76,.12,.15],[79,.24,.25]],retry:[[67,0,.14],[64,.15,.22]],cosmetic:[[79,0,.12],[84,.1,.22]],level:[[72,0,.16],[76,.12,.16],[79,.24,.16],[84,.38,.5]],chest:[[45,0,.25],[52,.24,.22],[57,.48,.2],[64,.72,.16],[69,.94,.18],[76,1.14,.22]],common:[[72,0,.16],[76,.1,.18],[79,.22,.38]],epic:[[72,0,.15],[76,.1,.15],[79,.2,.15],[84,.32,.5]],legendary:[[72,0,.18],[79,.14,.18],[84,.28,.2],[88,.44,.2],[91,.62,.65]]};
  for(const [pitch,delay,length] of patterns[cue]||patterns.tap)note(effectsBus,midi(pitch),now+delay,length,cue==='tap'?.08:.15,cue==='chest'?'triangle':'square');
  // A bell-like treasure shimmer accompanies confirmed card revelations only.
  if(['common','epic','legendary'].includes(cue))for(let i=0;i<7;i++)note(effectsBus,midi(88+[0,7,4,12,7,16,12][i]),now+.06*i,.24,.065,'sine');
 }
 document.addEventListener('pointerdown',unlock,{passive:true});
 document.addEventListener('keydown',e=>{if(['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))unlock();});
 document.addEventListener('click',e=>{const button=e.target.closest('button,summary');if(button&&!button.disabled&&!panel.contains(button)&&!button.classList.contains('choice'))play('tap');});
 panel.querySelector('#audioPreview').onclick=()=>{unlock();play('success');};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearVoices();if(ctx?.state==='running')ctx.suspend().catch(()=>{});}else if(started)unlock();});
 window.addEventListener('pagehide',()=>{clearVoices();ctx?.suspend().catch(()=>{});});
 window.addEventListener('pageshow',()=>{if(started&&!document.hidden)unlock();});
 status();return {play,cancelEffects:()=>clearVoices(effectsBus)};
}
