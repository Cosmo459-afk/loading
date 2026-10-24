import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const pkg=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
const minor=Number(pkg.version.split('.')[1]);
const tag='v'+(minor<10?'0':'')+minor;
const archive='loading-arcade-'+tag+'.zip';
const html=await readFile(new URL('dist/index.html',root),'utf8');
if(Buffer.byteLength(html)>25*1024*1024)throw new Error('Standalone HTML exceeds the static asset size budget.');
if(html.includes('PREVISUALIZACIÓN · Imágenes pendientes · No publicar'))throw new Error('Do not package a preview. Run npm run build with all art assets first.');
const originals=JSON.parse(await readFile(new URL('content/collections/re4-image-provenance.json',root),'utf8'));
if(originals.images.length!==14)throw new Error('Expected 14 RE4 source records');
for(const image of originals.images){
 const bytes=await readFile(new URL('assets/cards/re4/'+image.file,root));
 if(createHash('sha256').update(bytes).digest('hex')!==image.sha256)throw new Error('Reference original changed: '+image.file);
}
const art=JSON.parse(await readFile(new URL('content/collections/re4-art-provenance-v10.json',root),'utf8'));
for(const board of art.boards){const bytes=await readFile(new URL('assets/cards/re4/'+board.file,root));if(createHash('sha256').update(bytes).digest('hex')!==board.sha256)throw new Error('Artwork changed: '+board.file);}
const catalog=JSON.parse(await readFile(new URL('content/collections/re4.json',root),'utf8'));
if(catalog.cards.length!==14)throw new Error('Expected 14 RE4 collectibles');
for(const file of new Set(catalog.cards.map(c=>c.imageFile))){
 const bytes=await readFile(new URL('assets/cards/re4/'+file,root));
 if(!html.includes(bytes.toString('base64')))throw new Error('Artwork not embedded: '+file);
}
const result=spawnSync('python',['-c',`from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(${JSON.stringify(root.pathname)})
archive=${JSON.stringify(archive)}
with ZipFile(root/archive,'w',ZIP_DEFLATED) as z:
 for source,target in [('dist/index.html','index.html'),('README.md','README.md'),('THIRD_PARTY_NOTICES.txt','THIRD_PARTY_NOTICES.txt')]:
  z.write(root/source,'loading-arcade/'+target)
with ZipFile(root/archive) as z:
 assert z.testzip() is None
 assert z.read('loading-arcade/index.html')==(root/'dist/index.html').read_bytes()
print('Release ZIP verified: '+archive+'; 14 collectible artworks embedded; standalone HTML, instructions and licenses only.')
`],{stdio:'inherit'});
if(result.status!==0)throw new Error('Package verification failed');
