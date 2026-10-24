import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'assets'),{recursive:true});
const catalog=JSON.parse(await readFile(path.join(root,'content/collections/re4.json'),'utf8'));
const preview=process.env.ARCADE_PREVIEW==='1';
const imagePlugin={name:'card-originals',setup(b){
 b.onResolve({filter:/^arcade:card-images$/},()=>({path:'card-images',namespace:'arcade'}));
 b.onLoad({filter:/.*/,namespace:'arcade'},async()=>{
  const images={},files={},missing=[];
  for(const card of catalog.cards){
   try{
    const file=path.join(root,'assets/cards/re4',card.imageFile),bytes=await readFile(file);
    const ext=path.extname(file).toLowerCase(),mime=({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[ext];
    if(!mime||bytes.length<16)throw new Error('Invalid image: '+card.imageFile);
    if(!files[card.imageFile])files[card.imageFile]='data:'+mime+';base64,'+bytes.toString('base64');images[card.id]=card.imageFile;
   }catch(error){if(error.code!=='ENOENT')throw error;missing.push(card.imageFile);}
  }
  if(missing.length&&!preview)throw new Error('Faltan archivos de arte de '+missing.length+' cartas: '+missing.join(', ')+'. Usar build:preview solo para desarrollo.');
  if(missing.length)console.warn('PREVIEW ONLY: '+missing.length+' imágenes pendientes. No distribuir.');
  return {contents:'const files='+JSON.stringify(files)+';export default {'+Object.entries(images).map(([id,file])=>JSON.stringify(id)+':files['+JSON.stringify(file)+']').join(',')+'}',loader:'js'};
 });
}};
await build({loader:{'.ttf':'dataurl','.png':'dataurl','.css':'text'},plugins:[imagePlugin],entryPoints:[path.join(root,'src/cloud.js')],outfile:path.join(root,'assets/cloud.bundle.js'),bundle:true,minify:true,format:'iife',platform:'browser',target:['es2020'],legalComments:'inline'});
const notices=await readFile(path.join(root,'THIRD_PARTY_NOTICES.txt'),'utf8');
const html=(await readFile(path.join(root,'index.html'),'utf8')).replace('<!doctype html>','<!doctype html><!--\n'+notices.replace(/-->/g,'-- >')+'\n-->');
const js=await readFile(path.join(root,'assets/cloud.bundle.js'),'utf8');
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'),(preview?html.replace('<body>','<body><div role="status" style="padding:12px;background:#52361e;text-align:center">PREVISUALIZACIÓN · Imágenes pendientes · No publicar</div>'):html).replace('<script src="assets/cloud.bundle.js"></script>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'));
console.log('Built source bundle and standalone dist/index.html');
