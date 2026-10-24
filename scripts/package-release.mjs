import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('dist/index.html',root),'utf8');
if(html.includes('PREVISUALIZACIÓN · Imágenes pendientes · No publicar'))throw new Error('Do not package a preview. Run npm run build with all originals first.');
const provenance=JSON.parse(await readFile(new URL('content/collections/re4-image-provenance.json',root),'utf8'));
if(provenance.images.length!==14)throw new Error('Expected 14 RE4 image records');
for(const image of provenance.images){
 const bytes=await readFile(new URL('assets/cards/re4/'+image.file,root));
 if(createHash('sha256').update(bytes).digest('hex')!==image.sha256)throw new Error('Original changed: '+image.file);
 if(!html.includes(bytes.toString('base64')))throw new Error('Original not embedded: '+image.file);
}
const result=spawnSync('python',['-c',`from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(${JSON.stringify(root.pathname)})
with ZipFile(root/'loading-arcade-v09.zip','w',ZIP_DEFLATED) as z:
 for source,target in [('dist/index.html','index.html'),('README.md','README.md'),('THIRD_PARTY_NOTICES.txt','THIRD_PARTY_NOTICES.txt')]:
  z.write(root/source,'loading-arcade/'+target)
with ZipFile(root/'loading-arcade-v09.zip') as z:
 assert z.testzip() is None
 assert z.read('loading-arcade/index.html')==(root/'dist/index.html').read_bytes()
print('Release v0.9 ZIP verified: 14 exact original images embedded; standalone HTML, instructions and licenses only.')
`],{stdio:'inherit'});
if(result.status!==0)throw new Error('Package verification failed');
