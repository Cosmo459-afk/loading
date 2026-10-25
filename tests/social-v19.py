"""Local-only social integration: idempotent likes, safe forum and streak medals."""
import json,os,urllib.request,uuid
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co';STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)) as r:return json.load(r)
fixture('/_test/reset',{});alice=fixture('/_test/session?user=alice');bob=fixture('/_test/session?user=bob')
for s,n in [(alice,'Alice'),(bob,'Bob')]:fixture('/rest/v1/rpc/arcade_save_profile',{'p_nickname':n,'p_avatar':2},s['access_token'])
for q in ['ps1-easy-01','ps1-medium-01','ps1-hard-01']:
 fixture('/_test/control',{'ageStarts':True});g=fixture('/rest/v1/rpc/arcade_start_quiz',{'p_quiz_id':q},bob['access_token']);keys=fixture('/_test/answers',{'gameId':g['game_id']});fixture('/rest/v1/rpc/arcade_submit_game',{'p_game_id':g['game_id'],'p_answers':keys},bob['access_token'])
players=fixture('/rest/v1/rpc/arcade_list_players',{'p_offset':0},alice['access_token'])['players'];pubBob=next(p['public_id'] for p in players if p['nickname']=='Bob')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':844});errors=[]
 ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(alice))+');')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/dist/index.html');page.wait_for_function('profile?.name==="Alice"');page.evaluate('id=>visitPlayer(id)',pubBob);page.wait_for_selector('.streak-medal.silver');assert page.locator('.streak-medal>span').inner_text()=='3';assert 'Actual: 3' in page.locator('.streak-display').inner_text()
 fixture('/_test/control',{'failLike':True});page.get_by_role('button',name='♡ ME GUSTA',exact=True).click();page.wait_for_function('document.getElementById("likeNotice").textContent.includes("reacción")');page.get_by_role('button',name='♡ ME GUSTA',exact=True).click();page.get_by_role('button',name='♥ TE GUSTA',exact=True).wait_for();assert '1 Me gusta' in page.locator('.profile-social').inner_text();page.evaluate('id=>visitPlayer(id)',pubBob);page.get_by_role('button',name='♥ TE GUSTA',exact=True).wait_for();page.get_by_role('button',name='♥ TE GUSTA',exact=True).click();page.get_by_role('button',name='♡ ME GUSTA',exact=True).wait_for();assert '0 Me gusta' in page.locator('.profile-social').inner_text()
 page.screenshot(path='/workspace/loading/design/insignia-v20-mobile.png',full_page=True)
 page.evaluate('openCommunity()');page.get_by_role('button',name='ENTRAR AL FORO →').click();page.wait_for_selector('#forum:not(.hidden)');assert page.locator('#forumCategory option').count()==3
 page.locator('.forum-compose summary').click();page.locator('#forumTopicTitle').fill('Recuerdos de PlayStation');attack='<img src=x onerror="window.__forumAttack=1">\n¿Cuál fue tu primer juego?';page.locator('#forumTopicBody').fill(attack)
 fixture('/_test/control',{'failForum':True});page.locator('#forumTopicSubmit').click();page.wait_for_function('document.getElementById("forumNotice").textContent.includes("reintentar")');page.locator('#forumTopicSubmit').click();page.wait_for_selector('#forumThread:not(.hidden) .forum-post');assert page.locator('#forumThreadTitle').inner_text()=='Recuerdos de PlayStation';assert page.locator('.forum-body').inner_text()==attack;assert page.evaluate('window.__forumAttack===undefined');assert page.locator('.forum-body img').count()==0
 topics=fixture('/rest/v1/rpc/arcade_forum_list',{'p_category':'charlas','p_offset':0},alice['access_token']);assert len(topics['threads'])==1;thread=topics['threads'][0]['id']
 fixture('/_test/control',{'ageForum':True});reply=fixture('/rest/v1/rpc/arcade_forum_publish',{'p_thread':thread,'p_category':None,'p_title':None,'p_body':'Yo empecé con Crash Bandicoot.','p_request':str(uuid.uuid4())},bob['access_token'])
 page.locator('#forumThreadRefresh').click();page.wait_for_function('document.querySelectorAll(".forum-post").length===2');page.get_by_role('button',name='REPORTAR',exact=True).click();page.wait_for_function('document.getElementById("forumThreadNotice").textContent.includes("Reporte recibido")');assert page.get_by_role('button',name='REPORTADO',exact=True).is_disabled()
 fixture('/_test/control',{'ageForum':True});page.locator('#forumReplyBody').fill('Qué buen comienzo. Yo elegí Resident Evil.');page.locator('#forumReplySubmit').click();page.wait_for_function('document.querySelectorAll(".forum-post").length===3');page.on('dialog',lambda d:d.accept());page.get_by_role('button',name='RETIRAR MENSAJE',exact=True).last.click();page.wait_for_function('document.querySelectorAll(".forum-body")[2].textContent.includes("retirado")')
 page.locator('.forum-author').filter(has_text='Bob').click();page.wait_for_selector('#playerVisit:not(.hidden)');page.get_by_role('button',name='← VOLVER A LA CONVERSACIÓN',exact=True).click();page.wait_for_selector('#forumThread:not(.hidden)')
 page.screenshot(path='/workspace/loading/design/foro-v20-mobile.png',full_page=True)
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#forumBack').click();page.wait_for_selector('#forum:not(.hidden)');page.locator('#forumCategory').select_option('ayuda');page.wait_for_function('document.getElementById("forumTopics").textContent.includes("Todavía no")');assert 'Recuerdos de PlayStation' not in page.locator('#forumTopics').inner_text()
 fixture('/_test/control',{'ageForum':True});page.locator('#forumTopicTitle').fill('Un tema sin interrumpir');page.locator('#forumTopicBody').fill('Este envío termina en segundo plano.')
 with page.expect_response(lambda r:'arcade_forum_publish' in r.url):page.evaluate('document.getElementById("forumTopicForm").requestSubmit();go("home")')
 page.wait_for_function('!document.getElementById("forumTopicSubmit").disabled');assert page.locator('#home').is_visible();assert page.locator('#forumThread').is_hidden()
 assert not errors,errors;browser.close();print('PASS v19 UI: numbered streak tier, like/unlike and failed-response retry, forum topic/reply/report/remove, publish retry without duplication, XSS rendered as text, category isolation and responsive screens.')
