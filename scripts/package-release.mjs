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
const art=JSON.parse(await readFile(new URL('content/collections/re4-art-provenance-v13.json',root),'utf8'));
for(const board of art.boards){const bytes=await readFile(new URL('assets/cards/re4/'+board.file,root));if(createHash('sha256').update(bytes).digest('hex')!==board.sha256)throw new Error('Artwork changed: '+board.file);}
const weeklyArt=await readFile(new URL('assets/cards/weekly/ada-wong-exclusive.png',root)),weeklyMeta=JSON.parse(await readFile(new URL('assets/cards/weekly/provenance.json',root),'utf8'));if(createHash('sha256').update(weeklyArt).digest('hex')!==weeklyMeta.sha256)throw new Error('Weekly art differs from provenance');
const catalog=JSON.parse(await readFile(new URL('content/collections/re4.json',root),'utf8'));
if(catalog.cards.length!==14)throw new Error('Expected 14 RE4 collectibles');
if(Buffer.byteLength(html)>750*1024)throw new Error('Initial HTML exceeds the lightweight budget');
const manifest=JSON.parse(await readFile(new URL('dist/asset-manifest.json',root),'utf8'));
for(const asset of manifest){
 const bytes=await readFile(new URL('dist/'+asset.url,root));
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256||!html.includes(asset.url))throw new Error('Missing/changed external asset: '+asset.url);
 if(html.includes(bytes.toString('base64')))throw new Error('Heavy image embedded in HTML: '+asset.url);
}
for(const source of ['assets/brand/loading-arcade.png','assets/rewards/coupon-level5.png',...new Set(catalog.cards.map(c=>'assets/cards/re4/'+c.imageFile))])if(!manifest.some(a=>a.source===source))throw new Error('Missing deployed artwork: '+source);
for(const [file,record] of [['assets/brand/loading-arcade.png','assets/brand/provenance.json'],['assets/rewards/coupon-level5.png','assets/rewards/provenance.json']]){const bytes=await readFile(new URL(file,root)),meta=JSON.parse(await readFile(new URL(record,root),'utf8'));if(createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw new Error('Approved artwork changed: '+file);}
if(html.includes('manual_sha256')||html.includes('ps1-easy-v15-01'))throw new Error('Private trivia bank must not be bundled');
const result=spawnSync('python',['-c',`from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(${JSON.stringify(root.pathname)})
archive=${JSON.stringify(archive)}
with ZipFile(root/archive,'w',ZIP_DEFLATED) as z:
 for file in sorted((root/'dist').rglob('*')):
  if file.is_file() and file.name!='asset-manifest.json':
   z.write(file,'loading-arcade/sitio/'+str(file.relative_to(root/'dist')))
 z.write(root/'content/weekly/re4-recuerdos-original-revisada.encrypted.json','loading-arcade/banco-semanal/re4-recuerdos-original-revisada.encrypted.json')
 for file in ['README.md','THIRD_PARTY_NOTICES.txt','docs/registro-v46.md']:
  z.write(root/file,'loading-arcade/'+file)
with ZipFile(root/archive) as z:
 assert z.testzip() is None
 assert z.read('loading-arcade/sitio/index.html')==(root/'dist/index.html').read_bytes()
 assert z.read('loading-arcade/sitio/privacidad.html')==(root/'dist/privacidad.html').read_bytes()
 assert b'__BRAND_LOGO__' not in z.read('loading-arcade/sitio/privacidad.html')
 assert len([n for n in z.namelist() if '/assets/media/' in n])==9
 assert not any(n.endswith('.sql') or (n.endswith('.json') and '/banco-semanal/' not in n) for n in z.namelist())
 assert b'ciphertext' in z.read('loading-arcade/banco-semanal/re4-recuerdos-original-revisada.encrypted.json')
 assert b'correct_index' not in z.read('loading-arcade/banco-semanal/re4-recuerdos-original-revisada.encrypted.json')
print('Release ZIP verified: upload entire sitio folder; lightweight HTML and nine hashed images, encrypted weekly bank outside sitio, instructions and licenses.')
`],{stdio:'inherit'});
if(result.status!==0)throw new Error('Package verification failed');
