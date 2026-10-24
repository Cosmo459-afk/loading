"""Public v0.4 guest checks against a local static server. Sends no email."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':390,'height':844});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('ARCADE_URL','http://127.0.0.1:8080'))
    page.wait_for_function("!document.getElementById('sessionStatus').textContent.includes('Conectando')")
    for cat in ['ps1','ps2','mix']:
        for difficulty in ['easy','hard']:
            page.evaluate("startMode('guest')")
            page.locator('#category').select_option(cat);page.locator('#difficulty').select_option(difficulty)
            page.locator('#beginBtn').click()
            for i in range(5):
                page.evaluate('answer(questions[idx].ok)');page.locator('#nextBtn').click()
            assert page.locator('#scoreTitle').inner_text()=='700 PUNTOS'
            assert page.evaluate("localStorage.getItem('loading_arcade_profile')") is None
    page.evaluate("startMode('guest')");page.locator('#difficulty').select_option('medium');assert page.locator('#beginBtn').is_disabled()
    page.evaluate("go('home')");page.get_by_text('YA TENGO CUENTA').click();page.wait_for_selector('#auth:not(.hidden)')
    assert page.locator('#loginEmail').get_attribute('type')=='email'
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','auth','menu','result']:
            page.evaluate('(id)=>go(id)',screen)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,screen)
    assert not errors,errors;b.close()
    print('PASS: all six guest category/difficulty combinations, auth screen, no local XP writes, 16 responsive screens, no JS errors. No email sent.')
