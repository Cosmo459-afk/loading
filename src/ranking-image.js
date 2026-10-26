import village from '../assets/social/weekly-village.png';
export async function drawRanking(ctx,h,item){
 const image=new Image();image.src=village;await image.decode();
 const scale=Math.max(1080/image.width,h/image.height);ctx.drawImage(image,(1080-image.width*scale)/2,(h-image.height*scale)/2,image.width*scale,image.height*scale);
 ctx.fillStyle='rgba(5,8,10,.48)';ctx.fillRect(0,0,1080,h);
 const top=h===1920?220:95,bottom=h===1920?170:70;
 function label(value,x,y,size=28,color='#fff',align='left',max=900){ctx.font='600 '+size+'px LoadingSans,sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(value),x,y,max);}
 label('LOADING ARCADE',540,top,25,'#d8c9eb','center');
 label('TOP 10',540,top+82,72,'#fff','center');
 label(item.challenge.game||item.challenge.title,540,top+133,35,'#fff','center');
 label(item.challenge.title,540,top+173,23,'#d7d5d1','center');
 label(item.final?'RESULTADO FINAL':'RANKING PARCIAL',540,top+216,22,'#d8c9eb','center');
 const y0=top+285,rowH=h===1920?100:69;
 ctx.fillStyle='rgba(6,9,12,.77)';ctx.fillRect(60,y0-35,960,rowH*10+92);
 label('#',84,y0,20,'#bfbcc4');label('JUGADOR',145,y0,20,'#bfbcc4');label('ACIERTOS',665,y0,19,'#bfbcc4','center');label('PUNTOS',805,y0,19,'#bfbcc4','center');label('TIEMPO',980,y0,19,'#bfbcc4','right');
 item.top.slice(0,10).forEach((p,i)=>{const y=y0+53+i*rowH;ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(80,y+18);ctx.lineTo(1000,y+18);ctx.stroke();label(String(p.place).padStart(2,'0'),84,y,27,p.place===1?'#e2c781':'#d0c5de');
 let name=String(p.nickname);ctx.font='600 28px LoadingSans,sans-serif';while(ctx.measureText(name).width>425&&name.length>1)name=name.slice(0,-2)+'…';label(name,145,y,28);label(p.correct+'/20',665,y,27,'#fff','center');label(p.points,805,y,26,'#fff','center');label((p.elapsed_ms/1000).toFixed(2)+' s',980,y,24,'#dedad3','right');});
 if(!item.top.length)label('Todavía no hay resultados finalizados.',540,y0+90,27,'#fff','center');
 const stamp=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'}).format(new Date(item.captured));
 label('Actualizado: '+stamp+' · Argentina',540,h-bottom-74,21,'#e0dad3','center');
 label('Más aciertos · Menor tiempo · Finalización más temprana',540,h-bottom-38,19,'#c9c5c5','center');
 label('@somosloading · Jugá gratis en Loading Arcade',540,h-bottom+8,24,'#fff','center');
 ctx.strokeStyle='#7754ae';ctx.lineWidth=2;ctx.strokeRect(35,35,1010,h-70);
}
