"""Visual/accessibility regression against local SQL fixture; no production writes."""
import json,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token';BASE='http://127.0.0.1:8085/dist/index.html'
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
api('/_test/reset',{});session=api('/_test/session?user=alice');api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'RetroPlayer','p_avatar':2},session['access_token'])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844});errors=[]
 c.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 c.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session))+')')
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_selector('#appNav:not([hidden])');page.evaluate('document.fonts.ready');assert page.evaluate('document.fonts.check("500 16px LoadingSans") && document.fonts.check("700 32px LoadingDisplay")')
 assert 'LoadingSans' in page.locator('body').evaluate('(e)=>getComputedStyle(e).fontFamily')
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844})
  for section,button in [('menu','#navTrivia'),('player','#navProfile'),('community','#navCommunity')]:
   page.locator(button).click();page.wait_for_selector('#'+section+':not(.hidden)');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,section)
   for bound in page.locator('#appNav button').evaluate_all('(els)=>els.map(e=>e.getBoundingClientRect().height)'):assert bound>=44
 page.set_viewport_size({'width':390,'height':844});page.evaluate('go("home")');page.wait_for_timeout(260);page.screenshot(path='design/inicio-v22-mobile.png',full_page=True)
 page.locator('#navProfile').click();page.wait_for_timeout(260);page.screenshot(path='design/perfil-v22-mobile.png',full_page=True)
 page.locator('#navCommunity').click();page.wait_for_function('!document.getElementById("forumNotice").textContent.includes("Cargando")');page.wait_for_timeout(260);page.screenshot(path='design/comunidad-v22-mobile.png',full_page=True)
 # Feedback should follow existing real messages and never transform forum bodies.
 page.evaluate('document.getElementById("forumNotice").textContent="No pudimos cargar la comunidad. Volvé a intentarlo."');page.wait_for_selector('#forumNotice[data-ui-state=error]');page.wait_for_timeout(260);page.screenshot(path='design/error-v22-mobile.png',full_page=True)
 page.evaluate('document.getElementById("forumNotice").textContent="Cargando publicaciones…"');page.wait_for_selector('#forumNotice[data-ui-state=loading]');assert page.locator('#forumNotice').evaluate('(e)=>getComputedStyle(e,"::before").animationName')=='ui-spin'
 page.emulate_media(reduced_motion='reduce');assert page.locator('#forumNotice').evaluate('(e)=>getComputedStyle(e,"::before").animationName')=='none';page.emulate_media(reduced_motion='no-preference')
 page.locator('#navTrivia').click();page.wait_for_selector('#beginBtn:enabled');page.locator('#beginBtn').click();page.wait_for_selector('#quiz:not(.hidden) button.choice');assert page.locator('button.choice').count()==4
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(260);page.screenshot(path='design/trivia-v22-mobile.png',full_page=True);page.locator('button.choice').first.focus();page.keyboard.press('Tab');assert page.locator('button.choice').nth(1).evaluate('(e)=>getComputedStyle(e).outlineStyle')=='solid';page.locator('button.choice').first.click();page.wait_for_function('document.getElementById("qMeta").textContent.includes("PREGUNTA 2 DE 5")')
 page.set_viewport_size({'width':1280,'height':900});page.locator('#navProfile').click();page.evaluate('go("home")');page.wait_for_timeout(260);page.screenshot(path='design/inicio-v22-desktop.png',full_page=True)
 assert not errors,errors;b.close()
print('PASS v22: bundled fonts, responsive sections/quiz, tap-to-advance, 44px controls, keyboard focus, real error/loading states and reduced-motion behavior.')
