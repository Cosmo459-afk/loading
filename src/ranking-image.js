import village from '../assets/social/weekly-village.png';
import logo from '../assets/brand/loading-arcade.png';
export async function drawRanking(ctx,h,item){
 const image=new Image();image.src=village;await image.decode();
 const scale=Math.max(1080/image.width,h/image.height);ctx.drawImage(image,(1080-image.width*scale)/2,(h-image.height*scale)/2,image.width*scale,image.height*scale);
 ctx.fillStyle='rgba(5,8,10,.48)';ctx.fillRect(0,0,1080,h);
 const story=h===1920;
 function label(value,x,y,size=28,color='#fff',align='left',max=900){ctx.font='600 '+size+'px LoadingSans,sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(value),x,y,max);}
 const brand=new Image();brand.src=logo;await brand.decode();const lw=story?650:570,ly=story?150:45,lh=lw*brand.height/brand.width;ctx.drawImage(brand,(1080-lw)/2,ly,lw,lh);
 const titleY=ly+lh+42;
 label('DESAFÍO SEMANAL',540,titleY,story?39:34,'#fff','center');
 const game=/resident evil 4|re4/i.test(item.challenge.game+' '+item.challenge.title)?'Resident Evil 4 - (2005)':item.challenge.game||item.challenge.title;
 label(game,540,titleY+49,story?37:33,'#fff','center');
 label('TOP 10 · '+(item.final?'RESULTADO FINAL':'RANKING PARCIAL'),540,titleY+91,23,'#d8c9eb','center');
 const y0=titleY+150,rowH=story?77:53;
 ctx.fillStyle='rgba(6,9,12,.77)';ctx.fillRect(60,y0-35,960,rowH*10+72);
 label('#',84,y0,20,'#bfbcc4');label('JUGADOR',145,y0,20,'#bfbcc4');label('ACIERTOS',665,y0,19,'#bfbcc4','center');label('PUNTOS',805,y0,19,'#bfbcc4','center');label('TIEMPO',980,y0,19,'#bfbcc4','right');
 item.top.slice(0,10).forEach((p,i)=>{const y=y0+53+i*rowH;ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(80,y+18);ctx.lineTo(1000,y+18);ctx.stroke();label(String(p.place).padStart(2,'0'),84,y,27,p.place===1?'#e2c781':'#d0c5de');
 let name=String(p.nickname);ctx.font='600 28px LoadingSans,sans-serif';while(ctx.measureText(name).width>425&&name.length>1)name=name.slice(0,-2)+'…';label(name,145,y,28);label(p.correct+'/20',665,y,27,'#fff','center');label(p.points,805,y,26,'#fff','center');label((p.elapsed_ms/1000).toFixed(2)+' s',980,y,24,'#dedad3','right');});
 if(!item.top.length)label('Todavía no hay resultados finalizados.',540,y0+90,27,'#fff','center');
 const stamp=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}).format(new Date(item.captured));
 const foot=y0+rowH*10+77;
 label('Actualizado: '+stamp+' · Argentina',540,foot,19,'#e0dad3','center');
 label('¿Creés que podés hacerlo mejor?',540,foot+57,story?39:34,'#fff','center');
 // The area below the question stays empty for Instagram's link sticker.
 ctx.strokeStyle='#7754ae';ctx.lineWidth=2;ctx.strokeRect(35,35,1010,h-70);
}
