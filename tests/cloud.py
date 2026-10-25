"""v0.14 browser integration with real local SQL and mocked Auth. No production writes."""
import json,os,urllib.request
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8080').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co'
STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None):
    data=None if body is None else json.dumps(body).encode()
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=data,headers={'Content-Type':'application/json'})) as r:return json.load(r)
def intercept(route):
    response=route.fetch(url='http://127.0.0.1:8082'+route.request.url[len(HOST):]);route.fulfill(response=response)
fixture('/_test/reset',{})
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);errors=[]
    ctx=browser.new_context(viewport={'width':390,'height':844});ctx.route(HOST+'/**',intercept)
    session=fixture('/_test/session?user=alice')
    ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(session))+');')
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/dist/index.html')
    page.wait_for_selector('#homeAccount button');page.locator('#homeAccount button').click();page.wait_for_selector('#profile:not(.hidden)')
    assert page.locator('input[type=file]').count()==0
    page.locator('#nickname').fill('Alice');page.get_by_text('CONTINUAR',exact=False).click();page.wait_for_selector('#home:not(.hidden)')
    assert page.locator('#homeHero').is_hidden()
    assert page.locator('#homeSignup').is_hidden()
    assert page.locator('#homeProgress [role=progressbar]').get_attribute('aria-valuenow')=='0'
    assert '1800 XP' in page.locator('#homeProgress').inner_text()
    assert page.locator('#homeWeekly .weekly-pending').inner_text()=='EN PREPARACIÓN'
    assert page.locator('#homeWeekly li').count()==0
    page.get_by_role('button',name='CONTINUAR RUTA').click();page.wait_for_selector('#menu:not(.hidden)')
    assert page.locator('#category option').count()==2
    page.wait_for_function("document.getElementById('quizProgress').textContent.includes('Trivia 1 de 1')")
    assert page.locator('#beginBtn').is_enabled();assert page.locator('#quizSelect').count()==0;assert page.locator('#difficulty').is_hidden()
    def play(n,fail=False):
        fixture('/_test/control',{'ageStarts':True,'failSubmit':fail})
        page.locator('#beginBtn').click();page.wait_for_selector('#quiz:not(.hidden)')
        game=page.evaluate('questions.map(q=>q.q)');assert len(game)==5
        # Get game ID from network response, not solutions in app code.
        requests=page.evaluate('performance.getEntriesByType("resource").filter(x=>x.name.includes("arcade_start_quiz")).length');assert requests
        # Fixture finds own game via public owner-only history.
        token=session['access_token'];req=urllib.request.Request('http://127.0.0.1:8082/rest/v1/arcade_games',headers={'Authorization':'Bearer '+token})
        with urllib.request.urlopen(req) as r:g=json.load(r)[0]
        correct=fixture('/_test/answers',{'gameId':g['id']})
        assert page.evaluate('questions.every(q=>q.ok===undefined)')
        for i,a in enumerate(correct):
            page.locator('.choice').nth(a if i<n else (a+1)%4).click();page.wait_for_timeout(500)
        if fail:
            page.wait_for_selector('#recoverGame:not([hidden])');page.reload();page.wait_for_selector('#recoverGame:not([hidden])');page.locator('#recoverGame').click()
        page.wait_for_selector('#result:not(.hidden)')
    play(2)
    assert page.locator('#scoreTitle').inner_text()=='VOLVÉ A INTENTARLO'
    assert page.locator('#resultReview').inner_text()=='';assert page.evaluate('profile.xp')==0
    page.evaluate("go('menu')");page.wait_for_function('!document.getElementById("beginBtn").disabled')
    play(5,True)
    assert page.evaluate('profile.xp')==900;assert page.locator('#resultReview .review-item').count()==5
    assert page.locator('#rewardBadge').get_attribute('hidden') is None # Reload already adopted committed XP; badge survives recovery.
    page.reload();page.wait_for_selector('#rewardBadge:not([hidden])',state='attached')
    page.evaluate("openAccountPage('rewards')");page.wait_for_selector('#rewards:not(.hidden)');page.wait_for_selector('#rewardBadge[hidden]',state='attached')
    page.reload();page.wait_for_function('profile!==null');assert page.locator('#rewardBadge').get_attribute('hidden') is not None
    page.evaluate('openPlayer()');page.wait_for_selector('#menu:not(.hidden)');page.wait_for_function('!document.getElementById("beginBtn").disabled')
    assert page.locator('#difficulty').input_value()=='medium'
    play(5)
    assert page.evaluate('profile.xp')==1800
    assert 'nivel 2' in page.locator('#levelToast').inner_text()
    page.evaluate("go('home')")
    assert 'Nivel 2' in page.locator('#homeAccount').inner_text()
    assert '1800 XP' in page.locator('#homeProgress').inner_text()
    assert page.locator('#homeProgress').get_by_role('button',name='ABRIR 1 COFRE').count()==1
    page.wait_for_selector('#levelToast[hidden]',state='attached')
    page.screenshot(path='/tmp/loading-v12-home-player.png',full_page=True)
    page.evaluate("go('menu')");page.locator('#category').select_option('ps1');assert page.locator('#difficulty').input_value()=='easy';page.wait_for_function('!document.getElementById("beginBtn").disabled')
    page.evaluate('openWardrobe()');page.wait_for_selector('#wardrobe:not(.hidden)');assert page.locator('#wardrobeItems .cosmetic-item').count()==31
    page.locator('#wardrobeItems .cosmetic-item').filter(has_text='Gafas neón').get_by_role('button').click();page.wait_for_function('profile.cosmetics.glasses==="pink-glasses"')
    page.evaluate('showCollections()');page.wait_for_selector('#collection:not(.hidden)')
    assert page.locator('#collectionContent').is_hidden()
    assert page.locator('#album .game-card').count()==0
    assert '0 de 14' in page.locator('#collectionOverview').inner_text()
    names=page.evaluate('cards.map(c=>c.name)')
    def no_hidden_card_details(except_name=None):
        html=page.locator('#collection').inner_html()
        assert all(name not in html for name in names if name.casefold()!=(except_name or '').casefold()), [name for name in names if name.casefold()!=(except_name or '').casefold() and name in html]
    no_hidden_card_details()
    page.locator('#collectionOverview button').click()
    assert page.locator('#collectionContent').is_visible()
    assert '14 coleccionables por descubrir' in page.locator('#collectionMystery').inner_text()
    assert page.locator('#album .game-card').count()==0
    assert page.locator('#collection svg image').count()==0
    assert page.locator('#collection').get_by_role('button',name='VER CARTA',exact=True).count()==0
    no_hidden_card_details()
    page.evaluate("showCollectible('key')")
    assert page.locator('#cardDetail').is_hidden()
    assert page.locator('#cardDetailArt').inner_html()==''
    assert 'Llave insignia' not in page.evaluate('cardHTML(cards[0])')
    page.screenshot(path='/tmp/re4-v11-empty-collection.png',full_page=True)
    page.evaluate('openChests()');page.wait_for_selector('#chests:not(.hidden)')
    assert '1 cofres' in page.locator('#chestBalance').inner_text()
    assert '85%' in page.locator('.chest-rules').inner_text()
    assert 'monedas' not in page.locator('#chests').inner_text().lower()
    fixture('/_test/control',{'failChest':True})
    page.get_by_role('button',name='ABRIR COFRE',exact=True).click()
    assert 'opening' in page.locator('#chestStage').get_attribute('class')
    page.wait_for_selector('#chestRetry:not([hidden])')
    page.locator('#chestRetry').click()
    page.wait_for_function('document.getElementById("chestOpeningTitle").textContent==="¡Nuevo coleccionable!"')
    page.wait_for_function('profile.unlocked.length===1')
    assert page.locator('#chestPrize .game-card').count()==1
    awarded=page.locator('#chestPrize h3').inner_text()
    page.locator('#chestReturn').click();page.wait_for_selector('#chests:not(.hidden)')
    page.get_by_role('button',name='VER PREMIO',exact=True).click()
    assert page.locator('#chestPrize h3').inner_text()==awarded
    assert len(page.evaluate('profile.unlocked'))==1
    page.locator('#chestPrize .game-card').evaluate('(e)=>Promise.all(e.getAnimations().map(a=>a.finished))')
    page.screenshot(path='/tmp/loading-re4-chest-preview.png',full_page=True)
    page.evaluate('showCollections()');page.wait_for_selector('#collection:not(.hidden)')
    assert '1 de 14' in page.locator('#collectionOverview').inner_text()
    assert page.locator('#collectionContent').is_hidden()
    page.screenshot(path='/tmp/re4-v11-overview.png',full_page=True)
    page.locator('#collectionOverview button').click()
    assert page.locator('#album .game-card').count()==1
    assert page.locator('#album svg image').count()==1
    assert page.locator('#album h3').inner_text()==awarded
    assert '13 coleccionables por descubrir' in page.locator('#collectionMystery').inner_text()
    no_hidden_card_details(awarded)
    decoded=page.locator('#album svg image').evaluate_all("els=>Promise.all(els.map(async el=>{const i=new Image();i.src=el.getAttribute('href');await i.decode();return i.naturalWidth>0;}))")
    assert decoded==[True]
    page.get_by_role('button',name='EXHIBIR',exact=True).click()
    page.wait_for_function('profile.featured.length===1')
    page.locator('#album').get_by_role('button',name='VER CARTA',exact=True).click()
    assert page.locator('#cardDetail').is_visible()
    assert page.locator('#cardDetail h3').inner_text()==awarded
    page.locator('#cardDetail').get_by_role('button',name='Cerrar detalle').click()
    unknown=page.evaluate('cards.find(c=>!profile.unlocked.includes(c.id)).id')
    page.evaluate('(id)=>showCollectible(id)',unknown)
    assert page.locator('#cardDetail').is_hidden()
    page.evaluate('document.fonts.ready')
    assert page.evaluate("document.fonts.check('700 14px LoadingPixel')")
    page.screenshot(path='/tmp/re4-v11-discovered.png',full_page=True)
    page.get_by_role('button',name='VOLVER A COLECCIONES').click()
    assert page.locator('#collectionContent').is_hidden()
    assert page.locator('#album .game-card').count()==0
    page.reload();page.wait_for_function('profile?.unlocked?.length===1 && profile?.featured?.length===1')
    assert page.evaluate('profile.xp')==1800
    page.evaluate('showCollections()');page.wait_for_selector('#collection:not(.hidden)')
    assert '1 de 14' in page.locator('#collectionOverview').inner_text()
    assert page.locator('#collectionContent').is_hidden()
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','menu','rewards','wardrobe','result','profile','collection','chests','chestOpening']:
            page.evaluate('(id)=>go(id)',screen)
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,screen,page.evaluate('[document.documentElement.scrollWidth,innerWidth,document.body.scrollWidth]'),page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.id,e.className,e.textContent.slice(0,80),e.getBoundingClientRect().right]).slice(0,12)'))
        page.evaluate("go('collection');selectCollection('re4')")
        assert page.locator('#album .game-card').count()==1
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('discovered collection',width)
        page.evaluate('selectCollection(null)')
    page.set_viewport_size({'width':390,'height':844});page.evaluate("go('rewards')");page.screenshot(path='/tmp/loading-v08-rewards.png',full_page=True)
    assert not errors,errors
    ctx.close()
    # New players create only an anonymous identity first, choose a mascot and play.
    ctx=browser.new_context(viewport={'width':390,'height':844});ctx.route(HOST+'/**',intercept)
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));signup=[]
    page.on('request',lambda r:signup.append(r.post_data_json) if '/auth/v1/signup' in r.url and r.method=='POST' else None)
    page.goto(BASE+'/dist/index.html');page.wait_for_selector('#createPlayerBtn:not([disabled])')
    assert page.get_by_role('button',name='JUGAR COMO INVITADO',exact=False).count()==0
    assert 'partida rápida' not in page.locator('#home').inner_text().lower()
    page.screenshot(path='/tmp/loading-v12-home-entry.png',full_page=True)
    page.locator('#createPlayerBtn').click();page.wait_for_selector('#profile:not(.hidden)')
    assert len(signup)==1 and not signup[0].get('email')
    page.evaluate("startMode('guest')")
    page.wait_for_selector('#profile:not(.hidden)')
    assert page.locator('#quiz').evaluate('(e)=>e.classList.contains("hidden")')
    assert page.evaluate('questions.length')==0
    page.locator('#nickname').fill('PixelNuevo');page.locator('.avatar-btn').nth(3).click()
    page.get_by_text('CONTINUAR',exact=False).click();page.wait_for_selector('#home:not(.hidden)')
    assert 'PixelNuevo' in page.locator('#homeAccount').inner_text()
    assert 'Sin correo vinculado' in page.locator('#homeAccount').inner_text()
    session=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',STORE)
    uid=session['user']['id'];assert session['user']['is_anonymous']
    assert fixture('/_test/control',{})['otpRequests']==[]
    page.get_by_role('button',name='CONTINUAR RUTA').click();page.wait_for_selector('#menu:not(.hidden)')
    for tier in ['easy','medium','hard']:
        assert page.locator('#difficulty').input_value()==tier;play(3)
        if tier!='hard':page.evaluate("go('menu')")
    assert page.evaluate('profile.xp')==1500
    assert page.locator('#accountProtection').is_visible()
    page.get_by_role('button',name='MÁS TARDE',exact=True).click()
    assert page.locator('#accountProtection').is_hidden()
    page.evaluate("go('home')")
    page.get_by_role('button',name='Vincular correo para proteger mi acceso').click()
    page.wait_for_selector('#linkAccount:not(.hidden)');page.locator('#linkEmail').fill('pixel@example.invalid');page.locator('#linkAccountBtn').click()
    page.wait_for_function('document.getElementById("linkMessage").textContent.includes("Revisá tu correo")')
    page.goto(BASE+'/?code=link-temp');page.wait_for_function('profile?.xp===1500')
    assert page.locator('#home').is_visible()
    assert 'Acceso protegido' in page.locator('#homeAccount').inner_text()
    linked=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',STORE)
    assert linked['user']['id']==uid and not linked['user']['is_anonymous']
    assert page.evaluate('profile.games')==3
    assert not errors,errors
    ctx.close();browser.close()
print('PASS v0.14 browser: mascot-only profile; failure hides solutions; retry and interrupted-save recovery; single 900 XP grant; completion blocked; independent tiers; persisted badge acknowledgement; level toast; wardrobe; standalone HTML; 40 responsive screens; collection overview only, zero unknown card names/art/preview controls, first card revealed by chest, owned-only detail/featured, hidden-card direct access rejected, persisted progress; unified anonymous entry without email, no guest bypass or Mix option, home XP/cofre dashboard, honest unpublished weekly panel, optional reminder and same-UID email link; no JS errors.')
