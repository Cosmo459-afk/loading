"""Unique nickname signup, immutable identity UI, avatar edit and next-before-review."""
import json,urllib.request
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token'
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
api('/_test/reset',{});alice=api('/_test/session?user=alice');bob=api('/_test/session?user=bob');api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'RetroPlayer','p_avatar':2},alice['access_token'])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);errors=[]
 def context(session):
  ctx=browser.new_context(viewport={'width':390,'height':844});ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])));ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session))+')');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8085/dist/index.html');return page
 # Auth identity with no player must choose a unique permanent name.
 page=context(bob);page.wait_for_selector('#homeAccount button');page.locator('#homeAccount button').click();page.wait_for_selector('#nickname:visible');assert 'no se puede cambiar' in page.locator('#nicknameFields').inner_text();page.locator('#nickname').fill(' retroplayer ');page.locator('#profileSubmit').click();page.wait_for_function('document.getElementById("profileNotice").textContent.includes("ya está en uso")');assert page.locator('#profile:not(.hidden)').count()==1;page.locator('#nickname').fill('NewPlayer');page.locator('#profileSubmit').click();page.wait_for_selector('#navProfile:visible');page.locator('#navProfile').click();page.get_by_role('button',name='CAMBIAR AVATAR',exact=True).click();page.wait_for_selector('#profile:not(.hidden)');assert page.locator('#nickname').is_disabled();assert page.locator('#nicknameFields').is_hidden();assert 'NewPlayer' in page.locator('#profileFixedName').inner_text();page.locator('#avatarGrid button').nth(5).click();page.locator('#profileSubmit').click();page.wait_for_selector('#player:not(.hidden)');assert page.evaluate('profile.name')=='NewPlayer';assert page.evaluate('profile.avatar')==5
 page.locator('#navTrivia').click();page.wait_for_selector('#beginBtn:enabled');page.locator('#category').select_option('ps1');page.locator('#beginBtn').click();page.wait_for_selector('#quiz:not(.hidden)')
 for i in range(5):
  page.wait_for_function('document.getElementById("qMeta").textContent.includes("PREGUNTA '+str(i+1)+' DE 5")');page.locator('#answers button.choice').first.click()
 page.wait_for_selector('#result:not(.hidden)');assert page.locator('#continueQuizTopBtn').is_visible();assert page.locator('#resultReview h3').inner_text()=='Revisá tus respuestas';assert page.evaluate('!!(document.getElementById("continueQuizTopBtn").compareDocumentPosition(document.getElementById("resultReview")) & Node.DOCUMENT_POSITION_FOLLOWING)');page.screenshot(path='design/resultado-v41-mobile.png',full_page=True);page.locator('#continueQuizTopBtn').click();page.wait_for_selector('#quiz:not(.hidden)');assert 'Medio' in page.locator('#qMeta').inner_text() or 'MEDIO' in page.locator('#qMeta').inner_text()
 assert not errors,errors;browser.close()
print('PASS v41 UI: duplicate signup rejected without creating profile, permanent-name messaging, avatar-only editing, and next-trivia button above review starts next quiz.')
