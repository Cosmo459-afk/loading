"""Local-only regression for separated navigation, persistent topics and author activity."""
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
# Existing posts from before this UI, including a category that used to be hidden by default.
old=fixture('/rest/v1/rpc/arcade_forum_publish',{'p_thread':None,'p_category':'ayuda','p_title':'Mi tema anterior sigue guardado','p_body':'Esta publicación debe seguir visible después de actualizar.','p_request':str(uuid.uuid4())},alice['access_token'])
bobs=fixture('/rest/v1/rpc/arcade_forum_publish',{'p_thread':None,'p_category':'arcade','p_title':'Un desafío para conversar','p_body':'Una conversación de Bob.','p_request':str(uuid.uuid4())},bob['access_token'])
fixture('/_test/control',{'ageForum':True});fixture('/rest/v1/rpc/arcade_forum_publish',{'p_thread':bobs['thread_id'],'p_category':None,'p_title':None,'p_body':'Esta es mi respuesta guardada.','p_request':str(uuid.uuid4())},alice['access_token'])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':844});errors=[]
 ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(alice))+');')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/dist/index.html');page.wait_for_selector('#appNav:not([hidden])');assert page.locator('#appNav>button').count()==3;assert page.locator('#homeAccount .home-shortcuts').count()==0
 page.locator('#navProfile').click();page.wait_for_selector('#player:not(.hidden)');assert page.locator('#profile').is_hidden();assert page.locator('#navProfile').get_attribute('aria-current')=='page';assert page.locator('#player').get_by_role('button',name='COMUNIDAD',exact=True).count()==0
 page.locator('#navTrivia').click();page.wait_for_selector('#menu:not(.hidden)');assert page.locator('#navTrivia').get_attribute('aria-current')=='page'
 page.locator('#navCommunity').click();page.wait_for_selector('#community:not(.hidden) .forum-topic');assert page.locator('.forum-topic').count()==2;assert 'Mi tema anterior' in page.locator('#forumTopics').inner_text();assert page.locator('#forumCategory').input_value()==''
 page.get_by_role('button',name='MIS PUBLICACIONES',exact=True).click();page.wait_for_function('document.querySelectorAll(".forum-topic").length===1');assert 'Mi tema anterior' in page.locator('#forumTopics').inner_text();assert 'desafío para conversar' not in page.locator('#forumTopics').inner_text()
 page.get_by_role('button',name='MIS RESPUESTAS',exact=True).click();page.wait_for_function('document.getElementById("forumTopics").textContent.includes("Un desafío")');page.get_by_role('button',name='VER MI RESPUESTA',exact=True).click();page.wait_for_selector('#forumThread:not(.hidden) .forum-post');assert 'Esta es mi respuesta guardada.' in page.locator('#forumMessages').inner_text();assert '#tema/' in page.url
 page.reload();page.wait_for_selector('#forumThread:not(.hidden) .forum-post');assert 'Esta es mi respuesta guardada.' in page.locator('#forumMessages').inner_text()
 page.locator('#forumBack').click();page.wait_for_selector('#community:not(.hidden)');page.locator('#communityFeedTab').click();page.wait_for_function('document.querySelectorAll(".forum-topic").length===2')
 page.locator('#forumNewTopic').click();page.wait_for_selector('#forumCompose:not(.hidden)');page.locator('#forumComposeCategory').select_option('arcade');page.locator('#forumTopicTitle').fill('Mi publicación nueva se encuentra fácilmente');page.locator('#forumTopicBody').fill('El mensaje se guarda aunque falle la primera lectura.');fixture('/_test/control',{'ageForum':True,'failThreadRead':True});page.locator('#forumTopicSubmit').click();page.wait_for_selector('#forumRecovery:not([hidden])');assert 'sigue guardado' in page.locator('#forumThreadNotice').inner_text();new_url=page.url
 page.locator('#forumMineRecovery').click();page.wait_for_selector('#community:not(.hidden) .forum-topic');assert 'Mi publicación nueva' in page.locator('#forumTopics').inner_text();page.get_by_role('button',name='Mi publicación nueva se encuentra fácilmente',exact=True).click();page.wait_for_selector('#forumThread:not(.hidden) .forum-post');assert 'El mensaje se guarda' in page.locator('#forumOpening').inner_text()
 page.goto(new_url);page.wait_for_selector('#forumThread:not(.hidden) .forum-post');assert 'El mensaje se guarda' in page.locator('#forumOpening').inner_text();page.screenshot(path='/workspace/loading/design/tema-v21-mobile.png',full_page=True)
 page.locator('#navProfile').click();page.wait_for_selector('#player:not(.hidden)');page.locator('#navCommunity').click();page.wait_for_selector('#community:not(.hidden) .forum-topic');page.go_back();page.wait_for_selector('#player:not(.hidden)')
 page.locator('#navCommunity').click();page.wait_for_selector('#community:not(.hidden) .forum-topic');page.locator('#communityPlayersTab').click();page.wait_for_selector('#players:not(.hidden) .community-player');page.get_by_role('button',name='Visitar perfil de Bob').click();page.wait_for_selector('#playerVisit:not(.hidden) .profile-posts');page.get_by_role('button',name='VER PUBLICACIONES',exact=True).click();page.wait_for_selector('#community:not(.hidden) .forum-topic');assert 'Un desafío' in page.locator('#forumTopics').inner_text();assert 'Mi tema anterior' not in page.locator('#forumTopics').inner_text()
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.locator('#navCommunity').click();page.wait_for_selector('.forum-topic');page.screenshot(path='/workspace/loading/design/comunidad-v21-mobile.png',full_page=True);page.locator('#navProfile').click();page.wait_for_selector('#player:not(.hidden)');page.screenshot(path='/workspace/loading/design/perfil-v21-mobile.png',full_page=True)
 assert not errors,errors;browser.close();print('PASS v21: distinct primary sections, profile hub, all-category feed and existing posts, own topics/replies, thread reload links, publish/read-failure recovery, author indexes and responsive screens.')
