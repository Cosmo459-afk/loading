"""v20 lazy-media/mobile/admin integration. Every Supabase call uses local fixture."""
import json,os,urllib.request,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co';STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)) as r:return json.load(r)
fixture('/_test/reset',{});alice=fixture('/_test/session?user=alice');bob=fixture('/_test/session?user=bob')
for s,n in [(alice,'Alice'),(bob,'Bob')]:fixture('/rest/v1/rpc/arcade_save_profile',{'p_nickname':n,'p_avatar':2},s['access_token'])
for q in ['ps1-easy-01','ps1-medium-01']:
 fixture('/_test/control',{'ageStarts':True});g=fixture('/rest/v1/rpc/arcade_start_quiz',{'p_quiz_id':q},alice['access_token']);keys=fixture('/_test/answers',{'gameId':g['game_id']});fixture('/rest/v1/rpc/arcade_submit_game',{'p_game_id':g['game_id'],'p_answers':keys},alice['access_token'])
chest=fixture('/rest/v1/arcade_chests',token=alice['access_token'])[0];fixture('/rest/v1/rpc/arcade_open_chest',{'p_chest_id':chest['id']},alice['access_token'])
fixture('/_test/control',{'grantXP':7200});coupon=fixture('/rest/v1/rpc/arcade_get_coupon',{},alice['access_token'])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':844});errors=[];media=[]
 ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(alice))+');')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:media.append(r.url) if '/assets/media/' in r.url else None);page.goto(BASE+'/dist/index.html');page.wait_for_function('profile?.xp===7200')
 assert Path('dist/index.html').stat().st_size<750*1024;assert all('loading-arcade-' in u for u in media),media;assert page.locator('#adminEntry').is_hidden()
 page.evaluate('openAdmin()');assert page.locator('#adminBody').inner_text()==''
 page.evaluate('showCollections()');page.wait_for_selector('#collection:not(.hidden)');assert all('loading-arcade-' in u for u in media)
 page.locator('#collectionOverview button').click();page.wait_for_selector('.album-thumb');page.locator('.album-thumb').scroll_into_view_if_needed();page.wait_for_function('!!document.querySelector("#album image")?.getAttribute("href")');assert any(any(k in u for k in ['common-a-','common-b-','epic-','legendary-']) for u in media);assert not any('coupon-level5' in u for u in media)
 page.locator('.album-thumb').click();page.wait_for_selector('#cardDetail[open]');page.wait_for_function('!!document.querySelector("#cardDetail image")?.getAttribute("href")');page.get_by_role('button',name='Cerrar detalle').click()
 page.evaluate('openBenefits()');page.wait_for_function('document.querySelector(".coupon-image")?.naturalWidth===1536');assert any('coupon-level5' in u for u in media)
 fixture('/_test/admin-enable',{});page.reload();page.wait_for_function('profile!==null');page.locator('#navProfile').click();page.wait_for_selector('#adminEntry:not([hidden])');page.locator('#adminEntry').click();page.wait_for_selector('.admin-metrics');assert 'Jugadores' in page.locator('#adminBody').inner_text()
 page.get_by_role('button',name='Cupones',exact=True).click();page.wait_for_selector('#adminBody .admin-row');assert coupon['code'] in page.locator('#adminBody').inner_text();page.on('dialog',lambda d:d.accept());page.get_by_role('button',name='CONFIRMAR CANJE',exact=True).click();page.wait_for_function('document.getElementById("adminNotice").textContent.includes("Canje confirmado")');assert fixture('/rest/v1/rpc/arcade_get_coupon',{},alice['access_token'])['redeemed_at']
 page.get_by_role('button',name='Trivias',exact=True).click();page.get_by_role('button',name='CREAR TRIVIA',exact=True).click();page.wait_for_selector('#adminQuizForm');controls=page.locator('#adminQuizForm input,#adminQuizForm textarea,#adminQuizForm select');assert controls.count()>30
 # Fill one five-question draft through the UI, not by sending private data to production.
 form=page.locator('#adminQuizForm');inputs=form.locator('input');inputs.nth(0).fill('Trivia de prueba del administrador');inputs.nth(1).fill('99')
 textareas=form.locator('textarea')
 for i in range(5):
  textareas.nth(i*3).fill('¿Cuál es la opción correcta en la pregunta '+str(i+1)+'?');textareas.nth(i*3+1).fill('La fuente de prueba indica la primera opción.');textareas.nth(i*3+2).fill('Sección local de pruebas, dato verificado para el test.')
  for j in range(4):inputs.nth(2+i*5+j).fill('Opción '+str(j+1))
  inputs.nth(2+i*5+4).fill('https://example.invalid/manual')
 page.get_by_role('button',name='GUARDAR BORRADOR',exact=True).click();page.get_by_role('button',name='EDITAR BORRADOR',exact=True).wait_for();publish=page.get_by_role('button',name='PUBLICAR',exact=True);assert publish.is_disabled();page.locator('.admin-confirm input').check();publish.click();page.wait_for_function('document.getElementById("adminNotice").textContent.includes("publicada")')
 listing=fixture('/rest/v1/rpc/arcade_admin_quizzes',{'p_offset':0},alice['access_token']);q=next(q for q in listing['quizzes'] if q['title']=='Trivia de prueba del administrador');assert q['published'];assert any(q['id']==x['id'] for x in fixture('/rest/v1/rpc/arcade_list_quizzes',{},bob['access_token']))
 # User-generated reports are literal text even in privileged UI.
 topic=fixture('/rest/v1/rpc/arcade_forum_publish',{'p_thread':None,'p_category':'charlas','p_title':'Tema para moderación','p_body':'<img src=x onerror="window.__adminAttack=1">','p_request':str(uuid.uuid4())},bob['access_token']);fixture('/rest/v1/rpc/arcade_forum_report',{'p_post':topic['post_id']},alice['access_token'])
 page.get_by_role('button',name='Foro',exact=True).click();page.get_by_role('button',name='OCULTAR MENSAJE',exact=True).wait_for();assert page.evaluate('window.__adminAttack===undefined');assert page.locator('.admin-text img').count()==0;page.get_by_role('button',name='OCULTAR MENSAJE',exact=True).click();page.wait_for_function('document.getElementById("adminNotice").textContent.includes("Moderación guardada")')
 page.get_by_role('button',name='Resumen',exact=True).click();page.wait_for_selector('.admin-metrics');page.screenshot(path='/workspace/loading/design/admin-v21-mobile.png',full_page=True)
 for w in [320,390,768,1280]:
  page.set_viewport_size({'width':w,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 fixture('/_test/admin-enable',{'revoke':True});page.get_by_role('button',name='ACTUALIZAR',exact=True).click();page.wait_for_function('document.getElementById("adminNotice").textContent.includes("no tiene acceso")');assert page.locator('#adminEntry').is_hidden();assert page.locator('.admin-metrics').count()==0
 assert not errors,errors;browser.close();print('PASS v20 UI: tiny HTML; no art/coupon requests before needed; external images and canvas export; owner-only admin, draft form/review/publication, coupon one-use, XSS-safe moderation, revocation and responsive screens.')
