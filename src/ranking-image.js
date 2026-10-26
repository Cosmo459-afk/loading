import village from '../assets/social/weekly-village.png';
import logo from '../assets/brand/loading-arcade.png';
import posterFont from '../assets/fonts/LoadingPoster.ttf';
let posterReady;
function loadPoster(){return posterReady??=(async()=>{const font=new FontFace('LoadingPoster','url('+posterFont+')');await font.load();document.fonts.add(font);})();}
export async function drawRanking(ctx,h,item){
 await loadPoster();
 const image=new Image();image.src=village;await image.decode();
 const scale=Math.max(1080/image.width,h/image.height);ctx.drawImage(image,(1080-image.width*scale)/2,(h-image.height*scale)/2,image.width*scale,image.height*scale);
 ctx.fillStyle='rgba(5,8,10,.48)';ctx.fillRect(0,0,1080,h);
 const story=h===1920;
 function label(value,x,y,size=28,color='#fff',align='left',max=900){ctx.font='600 '+size+'px LoadingSans,sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(value),x,y,max);}
 function headline(value,y,size,color='#fff'){ctx.font=size+'px LoadingPoster,sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(value,540,y,940);}
 const brand=new Image();brand.src=logo;await brand.decode();const lw=story?470:380,ly=story?150:45,lh=lw*brand.height/brand.width;ctx.drawImage(brand,(1080-lw)/2,ly,lw,lh);
 const titleY=ly+lh+58;
 headline('DESAFÍO SEMANAL',titleY,story?65:53);
 const game=/resident evil 4|re4/i.test(item.challenge.game+' '+item.challenge.title)?'Resident Evil 4 - (2005)':item.challenge.game||item.challenge.title;
 headline(game.toUpperCase(),titleY+66,story?53:43);
 headline('TOP 10',titleY+112,story?33:27,'#d8c9eb');
 const y0=titleY+151,rowH=story?91:65,count=10;
 ctx.fillStyle='rgba(6,9,12,.79)';ctx.fillRect(60,y0,960,rowH*count+20);
 const players=item.top.slice(0,10);
 players.forEach((p,i)=>{const y=y0+rowH*i,mid=y+rowH/2;
  label(String(p.place).padStart(2,'0'),117,mid+(story?12:10),story?34:28,p.place===1?'#e2c781':'#d0c5de','center',70);
  const size=story?42:34,max=590;ctx.font='600 '+size+'px LoadingSans,sans-serif';let name=String(p.nickname);
  while(ctx.measureText(name).width>max&&name.length>1)name=name.slice(0,-2)+'…';
  label(name,180,mid+(story?14:11),size,'#fff','left',max);
  label((p.elapsed_ms/1000).toFixed(2)+' s',907,mid-(story?7:4),story?31:25,'#dedad3','center',180);
  label(p.correct+'/20 aciertos',907,mid+(story?29:24),story?28:23,'#dedad3','center',180);
  ctx.strokeStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.moveTo(85,y+rowH);ctx.lineTo(995,y+rowH);ctx.stroke();
 });
 if(!players.length)label('Todavía no hay jugadores en estos puestos.',540,y0+85,34,'#fff','center');
 const stamp=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}).format(new Date(item.captured));
 const foot=y0+rowH*count+66;
 label('Actualizado: '+stamp+' · Argentina',540,foot,story?25:21,'#e0dad3','center');
 headline('¿CREÉS QUE PODÉS',foot+(story?79:62),story?59:46);
 headline('HACERLO MEJOR?',foot+(story?149:119),story?67:52);
 // Empty area below for Instagram's link sticker.
 ctx.strokeStyle='#7754ae';ctx.lineWidth=2;ctx.strokeRect(35,35,1010,h-70);
}
