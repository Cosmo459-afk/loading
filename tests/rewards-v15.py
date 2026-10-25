"""v15 local-only coupon, privacy, share image, 96-pack route and tap progression."""
import json,os,urllib.request
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co';STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)) as r:return json.load(r)
fixture('/_test/reset',{});fixture('/_test/seed-v15',{})
alice=fixture('/_test/session?user=alice');bob=fixture('/_test/session?user=bob')
for s,n in [(alice,'Alice'),(bob,'Bob')]:fixture('/rest/v1/rpc/arcade_save_profile',{'p_nickname':n,'p_avatar':2},s['access_token'])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);errors=[]
 ctx=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
 ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(alice))+');')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/dist/index.html');page.wait_for_function('profile!==null')
 page.evaluate('openBenefits()');page.wait_for_selector('#benefits:not(.hidden)');assert 'nivel 5' in page.locator('#couponContent').inner_text();assert page.locator('#couponContent a').count()==0
 fixture('/_test/control',{'grantXP':7200});page.reload();page.wait_for_function('profile?.xp===7200');page.evaluate('openBenefits()')
 page.wait_for_function('document.querySelector(".coupon-image")?.naturalWidth===1536')
 code=page.locator('.coupon-code').inner_text();assert code.startswith('LD5-');assert 'Tienda Nube' in page.locator('#couponContent').inner_text()
 assert page.get_by_role('link',name='VER CATÁLOGO').get_attribute('href')=='https://somosloading.mitiendanube.com/'
 assert page.get_by_role('link',name='CANJEAR CÓDIGO').get_attribute('href')=='https://ig.me/m/somosloading'
 assert code in page.locator('#couponMessage').input_value() and 'Alice' in page.locator('#couponMessage').input_value()
 # Trigger click handler without navigating or contacting Instagram.
 page.get_by_role('link',name='CANJEAR CÓDIGO').evaluate('(a)=>a.onclick()')
 page.wait_for_function('document.getElementById("couponStatus").textContent.includes("mensaje")||document.getElementById("couponStatus").textContent.includes("Mensaje")')
 c=fixture('/rest/v1/rpc/arcade_get_coupon',{},alice['access_token']);assert c['requested_at'] and c['redeemed_at'] is None
 with page.expect_download() as d:page.get_by_role('button',name='GUARDAR IMAGEN',exact=True).click()
 d.value.save_as('/tmp/loading-v15-coupon.png');assert Image.open('/tmp/loading-v15-coupon.png').size==(1536,1024)
 page.screenshot(path='/tmp/loading-v15-coupon-mobile.png',full_page=True)
 page.evaluate('showCollections()');page.wait_for_selector('#collection:not(.hidden)');assert page.locator('#collectionOverview').inner_text().count('Próximamente')==3;assert page.locator('#album .game-card').count()==0
 page.evaluate("go('menu')");page.wait_for_function('!document.getElementById("beginBtn").disabled');assert 'Trivia 1 de 16' in page.locator('#quizProgress').inner_text();assert 'Resident Evil' not in page.locator('#menu').inner_text()
 page.locator('#beginBtn').click();page.wait_for_selector('#quiz:not(.hidden)');g=fixture('/rest/v1/arcade_games',token=alice['access_token'])[0];keys=fixture('/_test/answers',{'gameId':g['id']})
 for i,a in enumerate(keys):
  assert page.evaluate('idx')==i;assert page.locator('#nextBtn').is_hidden()
  # Two synchronous taps must record one answer, never skip a question.
  page.evaluate('a=>{answer(a);answer((a+1)%4)}',a)
  if i<4:page.wait_for_function('n=>idx===n',arg=i+1)
 page.wait_for_selector('#result:not(.hidden)');assert page.locator('#scoreSummary').inner_text()=='5 de 5 respuestas correctas';assert page.evaluate('profile.xp')==8100
 page.get_by_role('button',name='COMPARTIR LOGRO').click();page.wait_for_function('!document.getElementById("downloadShareBtn").disabled')
 with page.expect_download() as d:page.locator('#downloadShareBtn').click()
 d.value.save_as('/tmp/loading-v15-achievement.png');assert Image.open('/tmp/loading-v15-achievement.png').size==(1080,1350)
 assert code not in page.locator('#shareDialog').inner_text();page.locator('#shareDialog [aria-label="Cerrar imagen"]').click()
 fixture('/_test/redeem-coupon',{'code':code});page.reload();page.wait_for_function('profile!==null');page.evaluate('openBenefits()');page.wait_for_selector('.coupon-code');assert 'ya fue canjeado' in page.locator('#couponStatus').inner_text();assert page.get_by_role('link',name='CANJEAR CÓDIGO').count()==0
 # Switching accounts removes old coupon and image.
 page.evaluate('s=>localStorage.setItem('+json.dumps(STORE)+',JSON.stringify(s))',bob);page.reload();page.wait_for_function('profile?.name==="Bob"');page.evaluate('openBenefits()');page.wait_for_selector('#benefits:not(.hidden)');assert code not in page.content();assert page.locator('#sharePreview').get_attribute('src') is None
 assert not errors,errors
 browser.close();print('PASS v15 browser: personal coupon, Tienda Nube/catalog/DM+message, merchant-only consumption; exported PNGs; private account switch; 16-pack hidden-title route, double-tap guard and automatic last-answer save; upcoming mystery collections.')
