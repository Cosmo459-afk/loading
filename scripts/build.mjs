import {build} from 'esbuild';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(path.join(root,'content/collections/re4.json'),'utf8'));
const preview=process.env.ARCADE_PREVIEW==='1';
await mkdir(path.join(root,'assets'),{recursive:true});
await mkdir(path.join(root,'dist'),{recursive:true});
for(const dir of ['assets/media','dist/assets/media'])await rm(path.join(root,dir),{recursive:true,force:true});
const manifest=[];
async function publishAsset(file){
 const bytes=await readFile(file),ext=path.extname(file).toLowerCase();
 const digest=createHash('sha256').update(bytes).digest('hex');
 const name=path.basename(file,ext)+'-'+digest.slice(0,16)+ext,url='assets/media/'+name;
 if(!manifest.some(a=>a.url===url)){
  for(const dir of ['assets/media','dist/assets/media']){await mkdir(path.join(root,dir),{recursive:true});await writeFile(path.join(root,dir,name),bytes);}
  manifest.push({url,bytes:bytes.length,sha256:digest,source:path.relative(root,file)});
 }
 return url;
}
const imagePlugin={name:'external-images',setup(b){
 b.onResolve({filter:/^arcade:card-images$/},()=>({path:'card-images',namespace:'arcade'}));
 b.onLoad({filter:/.*/,namespace:'arcade'},async()=>{
  const images={},missing=[];
  for(const card of catalog.cards){try{images[card.id]=await publishAsset(path.join(root,'assets/cards/re4',card.imageFile));}catch(e){if(e.code!=='ENOENT')throw e;missing.push(card.imageFile);}}
  if(missing.length&&!preview)throw new Error('Falta arte de cartas: '+missing.join(', '));
  return {contents:'export default '+JSON.stringify(images),loader:'js'};
 });
 b.onLoad({filter:/\.png$/},async args=>({contents:'export default '+JSON.stringify(await publishAsset(args.path)),loader:'js'}));
}};
await build({loader:{'.ttf':'dataurl','.woff2':'dataurl','.css':'text'},plugins:[imagePlugin],entryPoints:[path.join(root,'src/cloud.js')],outfile:path.join(root,'assets/cloud.bundle.js'),bundle:true,minify:true,format:'iife',platform:'browser',target:['es2020'],legalComments:'inline'});
const notices=await readFile(path.join(root,'THIRD_PARTY_NOTICES.txt'),'utf8');
const socialAsset=await publishAsset(path.join(root,'assets/social/preview-v24.png'));
const html=(await readFile(path.join(root,'index.html'),'utf8')).replaceAll('__SOCIAL_ART__',socialAsset).replace('<!doctype html>','<!doctype html><!--\n'+notices.replace(/-->/g,'-- >')+'\n-->');
const js=await readFile(path.join(root,'assets/cloud.bundle.js'),'utf8');
await writeFile(path.join(root,'dist/index.html'),(preview?html.replace('<body>','<body><div role="status">PREVISUALIZACIÓN · No publicar</div>'):html).replace('<script src="assets/cloud.bundle.js"></script>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'));
await writeFile(path.join(root,'dist/_headers'),'/\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n/index.html\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n/privacidad.html\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n/assets/media/*\n  Cache-Control: public, max-age=31536000, immutable\n  X-Content-Type-Options: nosniff\n');
const privacy=(await readFile(path.join(root,'assets/legal/privacidad.html'),'utf8')).replaceAll('__BRAND_LOGO__',manifest.find(a=>a.source==='assets/brand/loading-arcade.png').url);
await writeFile(path.join(root,'dist/privacidad.html'),privacy);
await writeFile(path.join(root,'dist/asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built lightweight HTML with '+manifest.length+' separately cached images. Upload the ENTIRE site folder.');
