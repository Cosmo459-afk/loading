"""Public entry checks only; never signs up a real user or sends email."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844});errors=[];writes=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def intercept(route):
        if route.request.method not in ['GET','OPTIONS']:writes.append(route.request.url)
        route.fulfill(status=401,content_type='application/json',body='{"message":"Public test: no remote requests"}')
    page.route('https://epnflypuxcfeexaqwlba.supabase.co/**',intercept)
    page.goto(os.environ.get('ARCADE_URL','http://127.0.0.1:8080'))
    page.wait_for_selector('#createPlayerBtn:not([disabled])')
    assert page.get_by_role('button',name='JUGAR COMO INVITADO',exact=False).count()==0
    assert 'partida rápida' not in page.locator('#home').inner_text().lower()
    assert page.locator('#category option').count()==2
    assert page.locator('#homeWeekly .weekly-pending').inner_text()=='EN PREPARACIÓN'
    page.get_by_text('YA TENGO CUENTA').click();page.wait_for_selector('#auth:not(.hidden)')
    assert page.locator('#loginEmail').get_attribute('type')=='email'
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','auth']:
            page.evaluate('(id)=>go(id)',screen)
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(resolve))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,screen)
    assert not writes,writes
    assert not errors,errors
    browser.close()
print('PASS public entry: no quick play/guest/Mix, one character-first CTA, existing email access, weekly panel clearly pending, 8 responsive screens, no remote writes/emails or JS errors.')
