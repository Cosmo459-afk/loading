"""Local-only share exports, fallbacks, clean URLs and anonymous profile viewing."""
import json,os,uuid,urllib.request,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token';BASE='http://127.0.0.1:8085/dist/index.html'
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
api('/_test/reset',{});alice=api('/_test/session?user=alice');token=alice['access_token'];api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'RetroPlayer','p_avatar':2},token)
for q in ['ps1-easy-01','ps1-medium-01']:
 api('/_test/control',{'ageStarts':True});g=api('/rest/v1/rpc/arcade_start_quiz',{'p_quiz_id':q},token);keys=api('/_test/answers',{'gameId':g['game_id']});api('/rest/v1/rpc/arcade_submit_game',{'p_game_id':g['game_id'],'p_answers':keys},token)
chest=api('/rest/v1/arcade_chests',token=token)[0];prize=api('/rest/v1/rpc/arcade_open_chest',{'p_chest_id':chest['id']},token);public=api('/rest/v1/rpc/arcade_list_players',{'p_offset':0},token)['players'][0]['public_id']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844});errors=[];requests=[]
 def route(r):r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):]))
 c.route(HOST+'/**',route);c.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(alice))+');window.__shares=[];window.__copied=[];Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true});Object.defineProperty(navigator,"share",{configurable:true,value:async d=>window.__shares.push({text:d.text,url:d.url,files:d.files?.map(f=>({name:f.name,type:f.type,size:f.size}))})});Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async t=>window.__copied.push(t)}});')
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(BASE+'?test=do-not-share#inicio');page.wait_for_selector('#appNav:not([hidden])');assert not any('preview-v24-' in u for u in requests)
 page.locator('#navProfile').click();page.get_by_role('button',name='COMPARTIR MI PERFIL',exact=True).click();page.wait_for_selector('#shareImageBtn:enabled');assert page.locator('#shareLink').input_value().endswith('#jugador/'+public);assert '?test=' not in page.locator('#shareLink').input_value();assert token not in page.locator('#shareMessage').input_value();assert alice['user']['id'] not in page.locator('#shareMessage').input_value();assert page.locator('#sharePreview').evaluate('(e)=>e.naturalWidth')==1080;assert page.locator('#sharePreview').evaluate('(e)=>e.naturalHeight')==1350
 page.locator('#shareCopyLink').click();assert page.evaluate('window.__copied.at(-1)').endswith('#jugador/'+public);page.locator('#shareImageBtn').click();assert page.evaluate('window.__shares.at(-1).files[0].type')=='image/png';page.locator('#shareNativeLink').click();assert page.evaluate('window.__shares.at(-1).url').endswith('#jugador/'+public)
 page.locator('[data-format=story]').click();page.wait_for_selector('#shareImageBtn:enabled');assert page.locator('#sharePreview').evaluate('(e)=>e.naturalHeight')==1920
 # Native-share cancellation should not silently download or report an error.
 page.evaluate('Object.defineProperty(navigator,"share",{configurable:true,value:async()=>{throw new DOMException("Canceled","AbortError")}})');page.locator('#shareImageBtn').click();assert 'No pudimos' not in page.locator('#shareStatus').inner_text()
 page.evaluate('Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>false})');page.locator('#shareImageBtn').click();assert 'GUARDAR IMAGEN' in page.locator('#shareStatus').inner_text()
 page.evaluate('()=>{navigator.clipboard.writeText=async()=>{throw new Error("denied")}}');page.locator('#shareCopyLink').click();page.wait_for_function('document.getElementById("shareStatus").textContent.includes("manualmente")');assert page.locator('#shareLink').evaluate('(e)=>e.selectionStart===0 && e.selectionEnd===e.value.length')
 page.get_by_role('button',name='Cerrar compartir',exact=True).click();page.evaluate('showCollectible('+json.dumps(prize['card_id'])+')');page.wait_for_selector('#cardDetail[open]');page.get_by_role('button',name='COMPARTIR CARTA',exact=True).click();page.wait_for_selector('#shareImageBtn:enabled');assert 'Conseguí' in page.locator('#shareMessage').input_value();assert page.locator('#shareLink').input_value().endswith('#jugador/'+public)
 def export(name):
  encoded=page.locator('#sharePreview').evaluate('async e=>{let b=await(await fetch(e.src)).blob();return await new Promise(r=>{let f=new FileReader();f.onload=()=>r(f.result.split(",")[1]);f.readAsDataURL(b)})}');Path('design/'+name).write_bytes(base64.b64decode(encoded))
 export('carta-compartida-v24.png');page.wait_for_timeout(250);page.screenshot(path='design/compartir-v24-mobile.png',full_page=True)
 with page.expect_download() as dl:page.locator('#downloadShareBtn').click()
 assert dl.value.suggested_filename.endswith('.png');page.get_by_role('button',name='Cerrar compartir',exact=True).click()
 # Finish a real local quiz to share the server-confirmed result, never solutions.
 api('/_test/control',{'ageStarts':True});page.locator('#navTrivia').click();page.wait_for_selector('#beginBtn:enabled');page.locator('#category').select_option('ps1')
 with page.expect_response(lambda r:'arcade_start_quiz' in r.url) as start:page.locator('#beginBtn').click()
 game=start.value.json();answers=api('/_test/answers',{'gameId':game['game_id']})
 for n,answer in enumerate(answers):
  page.wait_for_function('document.getElementById("qMeta").textContent.includes("PREGUNTA '+str(n+1)+' DE 5")');page.locator('button.choice').nth(answer).click()
 page.wait_for_selector('#result:not(.hidden)');page.get_by_role('button',name='COMPARTIR LOGRO',exact=True).click();page.wait_for_selector('#shareImageBtn:enabled');assert '5/5' in page.locator('#shareMessage').input_value();export('resultado-compartido-v24.png');page.get_by_role('button',name='Cerrar compartir',exact=True).click()
 page.evaluate('showHistory()');page.wait_for_selector('#history:not(.hidden) .history-share');page.locator('.history-share').first.click();page.wait_for_selector('#shareImageBtn:enabled');assert '5/5' in page.locator('#shareMessage').input_value();page.get_by_role('button',name='Cerrar compartir',exact=True).click()
 page.get_by_role('button',name='COMPARTIR EL ARCADE',exact=True).click();page.wait_for_selector('#shareImageBtn:enabled');assert page.locator('#shareLink').input_value()=='https://loading-arcade.tienda-somosloading.workers.dev/';assert any('preview-v24-' in u for u in requests)
 for w in [320,390,768,1280]:
  page.set_viewport_size({'width':w,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#shareDialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
 assert page.locator('meta[property="og:image"]').get_attribute('content').startswith('https://');assert '__SOCIAL_ART__' not in page.content();assert page.locator('meta[name="twitter:card"]').get_attribute('content')=='summary_large_image'
 # Recipient without a login can see the safe profile; cannot change it or inspect inventory.
 guest=b.new_context(viewport={'width':390,'height':844});guest.route(HOST+'/**',route);g=guest.new_page();g.on('pageerror',lambda e:errors.append(str(e)));g.goto(BASE+'#jugador/'+public);g.wait_for_selector('#playerVisit:not(.hidden) #visitedPlayer h1');assert 'RetroPlayer' in g.locator('#visitedPlayer').inner_text();assert g.get_by_role('button',name='ME GUSTA',exact=True).count()==0;assert g.locator('.visited-showcase .album-thumb').count()==0;assert g.get_by_role('button',name='ENTRAR AL ARCADE PARA PARTICIPAR',exact=True).count()==1;g.wait_for_timeout(250);g.screenshot(path='design/perfil-compartido-v24-mobile.png',full_page=True)
 api('/rest/v1/rpc/arcade_feature_cards',{'p_ids':[prize['card_id']]},token);g.reload();g.wait_for_selector('.visited-showcase .album-thumb');assert g.locator('.visited-showcase .album-thumb').count()==1;api('/rest/v1/rpc/arcade_feature_cards',{'p_ids':[]},token);g.reload();g.wait_for_selector('.visited-empty');assert g.locator('.visited-showcase .album-thumb').count()==0
 assert not errors,errors;b.close()
print('PASS v24: profile/result/owned-card/site PNG exports, feed/story, native share stubs, cancellation/download/copy fallbacks, clean public links, metadata, anonymous safe profile and responsive dialogs.')
