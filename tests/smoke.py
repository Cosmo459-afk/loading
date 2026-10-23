"""Run against a locally served checkout; requires Playwright and Chromium."""
import json, os, base64
from playwright.sync_api import sync_playwright
URL=os.environ.get('ARCADE_URL','http://127.0.0.1:8080')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    dialogs=[]
    page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
    page.goto(URL)
    def no_overflow():
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
    def play():
        page.get_by_text('EMPEZAR TRIVIA').click()
        for i in range(5):
            page.evaluate('answer(questions[idx].ok)')
            page.locator('#nextBtn').click()
        assert page.locator('#scoreTitle').inner_text()=='700 PUNTOS'
    page.get_by_text('JUGAR COMO INVITADO').click();play()
    assert page.evaluate("localStorage.getItem('loading_arcade_profile')") is None
    page.evaluate("go('home');showProfile()")
    assert page.locator('.avatar-btn').count()==8
    page.locator('#nickname').fill('Retro_Player')
    for i in range(8):
        page.locator('.avatar-btn').nth(i).click()
        assert page.locator('.avatar-btn[aria-pressed="true"]').count()==1
        assert page.locator('#profilePreview img').evaluate('(img)=>img.complete && img.naturalWidth>0')
    no_overflow()
    page.get_by_text('CONTINUAR').click();play()
    saved=page.evaluate("JSON.parse(localStorage.getItem('loading_arcade_profile'))")
    assert saved['xp']==700 and saved['games']==1 and saved['avatar']==7
    assert len(saved['unlocked'])==2
    page.reload();page.evaluate('showProfile()')
    assert page.locator('#nickname').input_value()=='Retro_Player'
    # Existing v0.2 progress must survive editing in v0.3.
    old=dict(name='Veterano',xp=8000,games=20,avatar=2,photo=None,unlocked=[],featured=['herb','key','blade'])
    page.evaluate('(v)=>localStorage.setItem("loading_arcade_profile",JSON.stringify(v))',old)
    page.reload();page.evaluate('showProfile()');page.get_by_text('CONTINUAR').click()
    assert page.locator('#playerStats .collectible').count()==3
    page.evaluate("go('collection')")
    assert page.locator('#album .collectible').count()==8
    assert page.locator('#album button[aria-pressed="true"]').count()==3
    page.locator('#album button').nth(1).click()
    assert dialogs[-1].startswith('Podés exhibir hasta 3')
    page.locator('#album button').nth(0).click();page.locator('#album button').nth(1).click()
    assert page.locator('#album button[aria-pressed="true"]').count()==3
    for width in [320,360,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','profile','menu','collection','rewards','result']:
            page.evaluate('(id)=>go(id)',screen);no_overflow()
    page.evaluate('showProfile()')
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
    page.locator('#photoInput').set_input_files({'name':'portrait.png','mimeType':'image/png','buffer':png})
    page.wait_for_function('uploadedPhoto!==null')
    assert page.locator('#profilePreview .avatar-photo').count()==1
    page.get_by_text('CONTINUAR').click();page.reload();page.evaluate('showProfile()')
    assert page.locator('#profilePreview .avatar-photo').count()==1
    page.locator('#removePhoto').click()
    assert page.locator('#profilePreview .avatar-art').count()==1
    page.get_by_text('CONTINUAR').click()
    saved=page.evaluate("JSON.parse(localStorage.getItem('loading_arcade_profile'))")
    assert saved['xp']==8000 and saved['games']==20 and saved['photo'] is None
    page.evaluate('showProfile()');page.locator('#photoInput').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'no'})
    assert 'hasta 2 MB' in dialogs[-1]
    page.evaluate("go('rewards')")
    assert page.locator('.milestone.earned').count()==8
    assert not errors,errors
    browser.close()
    print('PASS: guest/player quizzes, 8 avatars, v0.2 migration, persistence, 3-card limit, photo upload/removal/rejection, rewards, 30 responsive screens; no JS errors.')
