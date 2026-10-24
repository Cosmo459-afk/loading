"""v0.8 browser integration with real local SQL and mocked Auth. No production writes."""
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
    page.locator('#nickname').fill('Alice');page.get_by_text('CONTINUAR',exact=False).click();page.wait_for_selector('#menu:not(.hidden)')
    page.wait_for_function("document.getElementById('quizProgress').textContent.includes('0 de 1')")
    assert page.locator('#beginBtn').is_enabled();page.locator('#difficulty').select_option('medium');assert page.locator('#beginBtn').is_disabled();page.locator('#difficulty').select_option('easy')
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
            page.locator('.choice').nth(a if i<n else (a+1)%4).click();page.locator('#nextBtn').click()
        if fail:
            page.wait_for_selector('#recoverGame:not([hidden])');page.reload();page.wait_for_selector('#recoverGame:not([hidden])');page.locator('#recoverGame').click()
        page.wait_for_selector('#result:not(.hidden)')
    play(2)
    assert page.locator('#scoreTitle').inner_text()=='VOLVÉ A INTENTARLO'
    assert page.locator('#resultReview').inner_text()=='';assert page.evaluate('profile.xp')==0
    page.evaluate("go('menu')");page.wait_for_function('!document.getElementById("beginBtn").disabled')
    play(5,True)
    assert page.evaluate('profile.xp')==900;assert page.locator('#resultReview .review-item').count()==5
    assert page.locator('#rewardBadge').is_visible() # Reload already adopted committed XP; badge survives recovery.
    page.reload();page.wait_for_selector('#rewardBadge:not([hidden])')
    page.locator('#rewardInbox').click();page.wait_for_selector('#rewards:not(.hidden)');page.wait_for_selector('#rewardBadge[hidden]',state='attached')
    page.reload();page.wait_for_function('profile!==null');assert page.locator('#rewardBadge').is_hidden()
    page.evaluate('openPlayer()');page.wait_for_selector('#menu:not(.hidden)');page.wait_for_function('document.querySelector("#quizSelect option")?.disabled')
    assert page.locator('#beginBtn').is_disabled();assert page.locator('#quizSelect option').first.is_disabled()
    page.locator('#difficulty').select_option('medium');page.wait_for_function('!document.getElementById("beginBtn").disabled')
    play(5)
    assert page.evaluate('profile.xp')==1800
    assert 'nivel 2' in page.locator('#levelToast').inner_text()
    page.evaluate("go('menu')");page.locator('#category').select_option('ps1');page.locator('#difficulty').select_option('medium');assert page.locator('#beginBtn').is_disabled()
    page.locator('#difficulty').select_option('easy');assert page.locator('#beginBtn').is_enabled()
    page.evaluate('openWardrobe()');page.wait_for_selector('#wardrobe:not(.hidden)');assert page.locator('#wardrobeItems .cosmetic-item').count()==6
    page.locator('#wardrobeItems .cosmetic-item').filter(has_text='Gafas neón').get_by_role('button').click();page.wait_for_function('profile.cosmetics.glasses==="pink-glasses"')
    page.evaluate("go('collection')");page.wait_for_selector('#album .game-card')
    assert page.locator('#album .game-card').count()==14
    assert page.locator('#album .rarity-common').count()==8
    assert page.locator('#album .rarity-epic').count()==4
    assert page.locator('#album .rarity-legendary').count()==2
    assert '0/14' in page.locator('#collectionOverview').inner_text()
    assert 'Comunes 0/8' in page.locator('#collectionOverview').inner_text()
    assert page.get_by_role('button',name='EXHIBIR',exact=True).count()==0
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
    page.evaluate("go('collection')")
    assert '1/14' in page.locator('#collectionOverview').inner_text()
    page.get_by_role('button',name='EXHIBIR',exact=True).click()
    page.wait_for_function('profile.featured.length===1')
    page.locator('#album .album-entry').filter(has=page.get_by_role('heading',name='El Buhonero',exact=True)).get_by_role('button',name='VER CARTA').click()
    assert page.locator('#cardDetail').is_visible()
    assert page.locator('#cardDetail .rarity-legendary').count()==1
    page.locator('#cardDetail').get_by_role('button',name='Cerrar detalle').click()
    page.screenshot(path='/tmp/loading-re4-album-preview.png',full_page=True)
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','menu','rewards','wardrobe','result','profile','collection','chests','chestOpening']:
            page.evaluate('(id)=>go(id)',screen)
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,screen,page.evaluate('[document.documentElement.scrollWidth,innerWidth,document.body.scrollWidth]'),page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.id,e.className,e.textContent.slice(0,80),e.getBoundingClientRect().right]).slice(0,12)'))
    page.set_viewport_size({'width':390,'height':844});page.evaluate("go('rewards')");page.screenshot(path='/tmp/loading-v08-rewards.png',full_page=True)
    assert not errors,errors
    ctx.close();browser.close()
print('PASS v0.9 browser: mascot-only profile; failure hides solutions; retry and interrupted-save recovery; single 900 XP grant; completion blocked; independent tiers; persisted badge acknowledgement; level toast; wardrobe; standalone HTML; 36 responsive screens; RE4 8/4/2, progress, featured, animated chest and committed-open recovery, stored prize replay and modal preview; no JS errors.')
