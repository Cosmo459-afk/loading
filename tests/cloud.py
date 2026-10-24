"""Browser + real local PostgreSQL RPC integration; Auth is a local fixture.
Start the static server on 8080 and `node supabase/tests/api-fixture.mjs` first.
No real email is sent; all project requests are intercepted.
"""
import json,base64,os,urllib.request
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8080').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co'
STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None):
    data=None if body is None else json.dumps(body).encode()
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=data,headers={'Content-Type':'application/json'})) as r:return json.load(r)
def intercept(route):
    req=route.request
    response=route.fetch(url='http://127.0.0.1:8082'+req.url[len(HOST):])
    route.fulfill(response=response)
fixture('/_test/reset',{})
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    errors=[]
    def context(user=None,url=BASE):
        ctx=browser.new_context(viewport={'width':390,'height':844})
        ctx.route(HOST+'/**',intercept)
        if user:
            session=fixture('/_test/session?user='+user)
            # Real SDK reads its usual session record. JWT validation here is simulated.
            ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(session))+');')
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
        page.wait_for_function("!document.getElementById('sessionStatus').textContent.includes('Conectando')")
        return ctx,page
    ctx,page=context()
    page.get_by_text('YA TENGO CUENTA').click();page.wait_for_selector('#auth:not(.hidden)')
    page.locator('#loginEmail').fill('alice@example.invalid');page.locator('#sendLoginBtn').click()
    page.wait_for_function("document.getElementById('authMessage').textContent.includes('Revisá tu correo')")
    requests=fixture('/_test/control',{})['otpRequests']
    assert requests[-1]['email']=='alice@example.invalid'
    assert 'redirect_to=' in page.evaluate('performance.getEntriesByType("resource").filter(x=>x.name.includes("/otp"))[0].name')
    page.evaluate("go('home')");page.get_by_text('JUGAR COMO INVITADO').click();page.locator('#beginBtn').click()
    for i in range(5):page.evaluate('answer(questions[idx].ok)');page.locator('#nextBtn').click()
    assert page.locator('#scoreTitle').inner_text()=='700 PUNTOS'
    assert page.evaluate('profile') is None
    # Same-browser PKCE callback exchanges the code using the SDK verifier.
    page.goto(BASE+'/?code=fixture-code')
    page.wait_for_selector('#profile:not(.hidden)')
    assert 'code=' not in page.url
    ctx.close()
    ctx,page=context('alice')
    old={'name':'LocalOnly','avatar':0,'xp':8000,'games':20,'featured':[]}
    page.evaluate('(v)=>localStorage.setItem("loading_arcade_profile",JSON.stringify(v))',old)
    page.locator('#homeAccount button').first.click();page.wait_for_selector('#profile:not(.hidden)')
    page.locator('#nickname').fill('Alice')
    assert page.locator('.avatar-btn').count()==8
    for i in range(8):
        page.locator('.avatar-btn').nth(i).click()
        assert page.locator('.avatar-btn[aria-pressed="true"]').count()==1
        assert page.locator('#profilePreview img').evaluate('(img)=>img.complete && img.naturalWidth>0')
    page.locator('.avatar-btn').nth(6).click()
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
    page.locator('#photoInput').set_input_files({'name':'portrait.png','mimeType':'image/png','buffer':png})
    page.wait_for_function('uploadedPhoto!==null')
    page.get_by_text('CONTINUAR').click();page.wait_for_selector('#menu:not(.hidden)')
    assert page.evaluate('profile.xp')==0
    page.wait_for_function("document.getElementById('quizProgress').textContent.includes('0 de 1')")
    assert page.locator('#difficultyOverview button').count()==3
    page.locator('#difficulty').select_option('medium');assert page.locator('#beginBtn').is_disabled()
    assert 'Bloqueado' in page.locator('#quizProgress').inner_text()
    page.locator('#difficulty').select_option('easy')
    page.screenshot(path='/tmp/arcade-catalog-mobile.png',full_page=True)
    assert page.locator('#playerStats .avatar-photo').count()==1
    # A server commit followed by a network error must be recoverable without duplicate XP.
    fixture('/_test/control',{'failSubmit':True})
    page.locator('#beginBtn').click();page.wait_for_selector('#quiz:not(.hidden)')
    assert page.evaluate('questions.every(q=>q.ok===undefined)')
    for i in range(5):
        page.locator('.choice').nth(0).click()
        assert 'Al terminar' in page.locator('#feedback').inner_text()
        page.locator('#nextBtn').click()
    page.wait_for_selector('#recoverGame:not([hidden])')
    assert 'pendiente' in page.locator('#cloudNotice').inner_text()
    page.reload();page.wait_for_selector('#recoverGame:not([hidden])')
    page.locator('#recoverGame').click();page.wait_for_selector('#result:not(.hidden)')
    assert page.locator('#scoreTitle').inner_text()=='400 PUNTOS'
    assert '1 de 1' in page.locator('#triviaResultProgress').inner_text()
    page.evaluate("mode='player';go('menu')")
    page.wait_for_function("document.getElementById('quizProgress').textContent.includes('1 de 1')")
    page.locator('#difficulty').select_option('medium');assert not page.locator('#beginBtn').is_disabled()
    page.locator('#difficulty').select_option('hard');assert page.locator('#beginBtn').is_disabled()
    page.locator('#category').select_option('ps1');page.locator('#difficulty').select_option('medium');assert page.locator('#beginBtn').is_disabled()
    page.locator('#category').select_option('ps2');page.locator('#difficulty').select_option('easy')
    assert page.locator('#resultReview .review-item').count()==5
    assert page.evaluate('profile.xp')==400 and page.evaluate('profile.games')==1
    assert page.evaluate('JSON.parse(localStorage.getItem("loading_arcade_profile")).xp')==8000
    page.evaluate("mode='player';go('menu');go('collection')")
    page.locator('#album button').first.click()
    page.wait_for_function('profile.featured.length===1')
    assert page.locator('#album button[aria-pressed="true"]').count()==1
    page.evaluate('showHistory()');page.wait_for_selector('#historyList .review-item')
    assert page.locator('#historyList .review-item').count()==1
    assert '400 puntos' in page.locator('#historyList').inner_text()
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','auth','profile','menu','collection','rewards','result','history']:
            page.evaluate('(id)=>go(id)',screen)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,screen)
    page.evaluate("mode='player';go('menu')");page.locator('#logoutBtn').click()
    page.wait_for_function("document.getElementById('sessionStatus').textContent.includes('Invitado')")
    assert page.evaluate('profile') is None
    assert page.locator('#playerStats').inner_text()==''
    assert page.locator('#homeAccount').is_hidden()
    assert page.locator('#homeAccount').inner_text()==''
    assert page.locator('#homeSignup').is_visible()
    ctx.close()
    # A separate browser context reads the same authoritative profile from the DB.
    ctx,page=context('alice',BASE+'/dist/')
    page.wait_for_function("document.getElementById('homeAccount').textContent.includes('Próxima recompensa')")
    assert page.locator('#homeSignup').is_hidden()
    assert 'Alice' in page.locator('#homeAccount').inner_text()
    assert '400' in page.locator('#homeAccount').inner_text()
    assert '100 XP' in page.locator('#homeAccount').inner_text()
    page.locator('#homeAccount').get_by_text('SEGUIR JUGANDO').click()
    page.wait_for_selector('#menu:not(.hidden)')
    page.evaluate("go('home')")
    page.locator('#homeAccount').get_by_text('EDITAR PERFIL').click()
    page.wait_for_selector('#profile:not(.hidden)')
    assert page.locator('#nickname').input_value()=='Alice'
    assert page.evaluate('profile.xp')==400 and page.evaluate('profile.featured.length')==1
    assert page.locator('#profilePreview .avatar-photo').count()==1
    page.route(HOST+'/rest/v1/arcade_profiles*',lambda route:route.fulfill(status=400,json={'message':'Network unavailable'}))
    page.reload()
    page.wait_for_function("document.getElementById('homeAccount').textContent.includes('REINTENTAR')")
    assert page.locator('#homeSignup').is_hidden()
    assert 'No necesitás registrarte' in page.locator('#homeAccount').inner_text()
    page.unroute(HOST+'/rest/v1/arcade_profiles*')
    page.locator('#homeAccount button').click();page.wait_for_selector('#menu:not(.hidden)')
    page.evaluate("go('home')")
    page.screenshot(path='/tmp/arcade-home-v041.png',full_page=True)
    page.locator('#homeAccount').get_by_text('MIS CROMOS').click()
    page.wait_for_selector('#collection:not(.hidden)')
    page.reload()
    page.wait_for_function("document.getElementById('homeAccount').textContent.includes('Alice')")
    assert page.locator('#homeSignup').is_hidden()
    ctx.close()
    ctx,page=context('bob')
    page.locator('#homeAccount button').first.click();page.wait_for_selector('#profile:not(.hidden)')
    assert page.locator('#nickname').input_value()==''
    assert page.evaluate('profile') is None
    page.locator('#nickname').fill('Bob');page.get_by_text('CONTINUAR').click();page.wait_for_selector('#menu:not(.hidden)')
    assert page.evaluate('profile.xp')==0
    page.wait_for_function("document.getElementById('quizProgress').textContent.includes('0 de 1')")
    page.evaluate('showHistory()');page.wait_for_function("document.getElementById('historyList').textContent.includes('Todavía no')")
    ctx.close()
    # Anonymous onboarding creates a real DB owner without an email prompt.
    ctx,page=context()
    otp_before=len(fixture('/_test/control',{})['otpRequests'])
    page.locator('#createPlayerBtn').click();page.wait_for_selector('#profile:not(.hidden)')
    page.locator('#nickname').fill('SinCorreo');page.get_by_text('CONTINUAR').click()
    page.wait_for_selector('#menu:not(.hidden)')
    page.evaluate("go('home')")
    assert 'temporal' in page.locator('#sessionStatus').inner_text()
    assert 'SinCorreo' in page.locator('#homeAccount').inner_text()
    assert page.locator('#accountProtection').is_hidden()
    page.locator('#homeAccount').get_by_text('SEGUIR JUGANDO').click()
    page.wait_for_selector('#menu:not(.hidden)');page.locator('#beginBtn').click()
    page.wait_for_selector('#quiz:not(.hidden)')
    for i in range(5):page.locator('.choice').nth(0).click();page.locator('#nextBtn').click()
    page.wait_for_selector('#result:not(.hidden)')
    assert page.evaluate('profile.xp')==400
    assert len(fixture('/_test/control',{})['otpRequests'])==otp_before
    page.evaluate('(key)=>{let s=JSON.parse(localStorage.getItem(key));s.user.created_at=new Date(Date.now()-2*86400000).toISOString();localStorage.setItem(key,JSON.stringify(s));}',STORE)
    page.reload();page.wait_for_selector('#accountProtection:not([hidden])')
    page.locator('#accountProtection').get_by_text('MÁS TARDE').click()
    assert page.locator('#accountProtection').is_hidden()
    page.reload();page.wait_for_function("document.getElementById('homeAccount').textContent.includes('SinCorreo')")
    assert page.locator('#accountProtection').is_hidden()
    page.locator('#homeAccount').get_by_text('Vincular un correo').click()
    page.wait_for_selector('#linkAccount:not(.hidden)')
    page.locator('#linkEmail').fill('temporal@example.invalid');page.locator('#linkAccountBtn').click()
    page.wait_for_function("document.getElementById('linkMessage').textContent.includes('Revisá tu correo')")
    # Confirmation simulates Auth verifying the email on the SAME identity.
    page.goto(BASE+'/?code=link-temp');page.wait_for_selector('#menu:not(.hidden)')
    assert page.evaluate('profile.xp')==400 and page.evaluate('profile.games')==1
    page.evaluate("go('home')")
    assert 'temporal' not in page.locator('#sessionStatus').inner_text()
    assert 'SinCorreo' in page.locator('#homeAccount').inner_text()
    assert page.locator('#accountProtection').is_hidden()
    assert page.locator('#homeAccount').get_by_text('Vincular un correo').count()==0
    ctx.close()
    # Exercise earned cosmetic rendering and server persistence with an explicit fixture XP grant.
    fixture('/_test/control',{'grantXP':2000,'ageStarts':True})
    ctx,page=context('alice')
    page.wait_for_function("document.getElementById('homeAccount').textContent.includes('Alice')")
    page.locator('#homeAccount').get_by_text('SEGUIR JUGANDO').click();page.wait_for_selector('#menu:not(.hidden)')
    page.locator('#playerStats').get_by_text('EDITAR PERFIL').click();page.wait_for_selector('#profile:not(.hidden)')
    page.locator('#removePhoto').click();page.get_by_text('CONTINUAR').click();page.wait_for_selector('#menu:not(.hidden)')
    page.locator('#playerStats').get_by_text('VESTUARIO').click();page.wait_for_selector('#wardrobe:not(.hidden)')
    assert page.locator('.cosmetic-item').count()==6
    for name,key,value in [('Gafas neón','glasses','pink-glasses'),('Gorra arcade','hat','retro-cap'),('Fondo violeta','background','violet-grid')]:
        page.locator('.cosmetic-item').filter(has=page.get_by_text(name,exact=True)).get_by_text('EQUIPAR',exact=True).click()
        page.wait_for_function('(args)=>profile.cosmetics[args[0]]===args[1]',arg=[key,value])
    src=page.locator('#wardrobePreview img').get_attribute('src')
    from urllib.parse import unquote
    assert '#ff83d3' in unquote(src) and '#3b224d' in unquote(src)
    assert page.locator('.cosmetic-item').filter(has=page.get_by_text('Corona del arcade',exact=True)).get_by_text('BLOQUEADO',exact=True).is_disabled()
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/arcade-wardrobe-v07.png',full_page=True)
    page.reload();page.wait_for_function("document.getElementById('homeAccount').textContent.includes('Alice')")
    assert page.evaluate("profile.cosmetics.hat")=='retro-cap'
    page.locator('#homeAccount').get_by_text('SEGUIR JUGANDO').click();page.wait_for_selector('#menu:not(.hidden)')
    page.locator('#difficulty').select_option('medium');page.locator('#beginBtn').click();page.wait_for_selector('#quiz:not(.hidden)')
    for i in range(5):page.locator('.choice').nth(0).click();page.locator('#nextBtn').click()
    page.wait_for_selector('#result:not(.hidden)')
    page.evaluate("go('menu')");page.wait_for_function("!document.getElementById('quizProgress').textContent.includes('Cargando')")
    page.locator('#difficulty').select_option('hard');assert not page.locator('#beginBtn').is_disabled()
    page.locator('#category').select_option('ps1');assert page.locator('#beginBtn').is_disabled()
    ctx.close();assert not errors,errors
    browser.close()
    print('PASS: real bundled SDK + local PostgreSQL RPCs; OTP request and PKCE callback (simulated Auth, no email), guest quiz, private cloud profile/photo, server questions/scoring, committed-response retry/reload without duplicate XP, featured cards/history, separate-browser persistence, logout isolation, standalone HTML, 32 responsive screens. Home session summary, direct play/profile/collection, reload persistence and load-failure retry verified. Anonymous onboarding, no upfront email, persistent reminder deferral and same-identity email linking verified with fixture. Console/difficulty catalog, locked medium tier and per-account completed quiz counters verified. v0.7: independent-console locks, medium/hard progression, cosmetic equip/render/persistence and wardrobe mobile overflow verified. Real Supabase email/session NOT tested.')
