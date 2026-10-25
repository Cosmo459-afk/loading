"""Publication hierarchy and removable message approvals; local-only fixture."""
import json,uuid,urllib.request
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token'
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
def rpc(name,body,s):return api('/rest/v1/rpc/'+name,body,s['access_token'])
api('/_test/reset',{});alice=api('/_test/session?user=alice');bob=api('/_test/session?user=bob')
for s,n in [(alice,'Alice'),(bob,'Bob')]:rpc('arcade_save_profile',{'p_nickname':n,'p_avatar':2},s)
t=rpc('arcade_forum_publish',{'p_thread':None,'p_category':'charlas','p_title':'¿Qué juegos están jugando actualmente?','p_body':'Comenten los títulos que están disfrutando y sus recomendaciones.','p_request':str(uuid.uuid4())},bob)
r=rpc('arcade_forum_publish',{'p_thread':t['thread_id'],'p_category':None,'p_title':None,'p_body':'Estoy jugando God of War en PS2. Juegazo.','p_request':str(uuid.uuid4())},alice)
api('/_test/control',{'ageForum':True});other=rpc('arcade_forum_publish',{'p_thread':t['thread_id'],'p_category':None,'p_title':None,'p_body':'Yo volví a Resident Evil 4. Siempre encuentro algo nuevo.','p_request':str(uuid.uuid4())},bob)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844});errors=[]
 c.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 c.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(alice))+')')
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8085/dist/index.html#tema/'+t['thread_id']);page.wait_for_selector('#forumOpening .forum-opening');assert page.locator('#forumOriginal #forumThreadTitle').count()==1;assert 'Comenten los títulos' in page.locator('#forumOriginal').inner_text();assert page.locator('#forumMessages .forum-comment').count()==2;assert 'Comenten los títulos' not in page.locator('#forumMessages').inner_text();assert page.locator('.forum-op').inner_text()=='AUTOR';assert page.locator('#forumCommentCount').inner_text()=='2 comentarios';assert page.locator('#post-'+r['post_id']+' .forum-post-like').is_disabled()
 like=page.locator('#post-'+other['post_id']+' .forum-post-like');like.click();page.wait_for_function('document.querySelector("#post-'+other['post_id']+' .forum-post-like").getAttribute("aria-pressed")==="true"');assert like.inner_text()=='1';page.reload();page.wait_for_selector('#forumOpening .forum-opening');assert like.get_attribute('aria-pressed')=='true';assert like.inner_text()=='1';like.click();page.wait_for_function('document.querySelector("#post-'+other['post_id']+' .forum-post-like").getAttribute("aria-pressed")==="false"');assert like.inner_text()=='0'
 # Simulate a failed reaction; no optimistic count, safe retry with explicit desired state.
 def fail_once(route):
  c.unroute(HOST+'/rest/v1/rpc/arcade_set_post_like',fail_once);route.fulfill(status=503,content_type='application/json',body='{"message":"Network unavailable"}')
 c.route(HOST+'/rest/v1/rpc/arcade_set_post_like',fail_once);like.click();page.wait_for_function('document.getElementById("forumThreadNotice").textContent.includes("No pudimos")');assert like.inner_text()=='0';like.click();page.wait_for_function('document.querySelector("#post-'+other['post_id']+' .forum-post-like").getAttribute("aria-pressed")==="true"');assert like.inner_text()=='1'
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(260);page.screenshot(path='design/conversacion-v23-mobile.png',full_page=True);page.set_viewport_size({'width':1280,'height':900});page.wait_for_timeout(200);page.screenshot(path='design/conversacion-v23-desktop.png',full_page=True)
 # Keep the original in the header when paging through a long conversation.
 for n in range(30):
  api('/_test/control',{'ageForum':True});rpc('arcade_forum_publish',{'p_thread':t['thread_id'],'p_category':None,'p_title':None,'p_body':'Otra recomendación '+str(n),'p_request':str(uuid.uuid4())},bob)
 page.locator('#forumThreadRefresh').click();page.wait_for_selector('#forumOpening .forum-opening');page.locator('#forumMessages').get_by_role('button',name='MÁS →',exact=True).click();page.wait_for_function('document.querySelector("#forumMessages").textContent.includes("Otra recomendación 29")');assert 'Comenten los títulos' in page.locator('#forumOriginal').inner_text();assert page.locator('#forumMessages .forum-opening').count()==0
 assert not errors,errors;b.close()
print('PASS v23 UI: unified original and title, separate comments/author label, approval/unapproval/reload/error retry, own-message restriction, pinned original across pages and responsive layout.')
