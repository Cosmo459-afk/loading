"""Local SQL/Auth fixture only: community, fixed route, cosmetics, logo, home journey."""
import json,os,urllib.request
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co';STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None,token=None):
    data=None if body is None else json.dumps(body).encode()
    headers={'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=data,headers=headers)) as r:return json.load(r)
fixture('/_test/reset',{})
alice=fixture('/_test/session?user=alice');bob=fixture('/_test/session?user=bob')
fixture('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'Alice','p_avatar':2},alice['access_token'])
fixture('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'Bob','p_avatar':1},bob['access_token'])
fixture('/_test/control',{'grantXP':5400})
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844});errors=[]
    ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
    ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(alice))+');')
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/dist/index.html');page.wait_for_function('profile?.xp===5400')
    assert page.locator('#homeCommunity').count()==0
    page.get_by_role('button',name='COMUNIDAD',exact=True).click();page.wait_for_selector('.community-player');assert '2 jugadores' in page.locator('.community-count').inner_text()
    page.evaluate("go('home')");assert page.locator('#homeProgress .progress-route').is_visible()
    assert page.locator('#homeProgress .progress-stop').count()>31
    assert page.locator('#homeProgress .progress-route').evaluate('(e)=>e.scrollWidth>e.clientWidth')
    assert page.locator('#rewardInbox').is_hidden() # Route is already visible on home.
    assert page.locator('.brand-logo').get_attribute('alt')=='LOADING ARCADE'
    assert page.locator('.brand-logo').evaluate('(i)=>i.decode().then(()=>i.naturalWidth>1000)')
    assert page.locator('.community-players li').count()==2
    assert 'Alice · Vos' in page.locator('.community-players li').first.inner_text()
    assert page.locator('.community-position').count()==0
    page.evaluate('openCommunity()');page.wait_for_selector('.community-player')
    assert page.get_by_role('button',name='SUMARME A LA COMUNIDAD').count()==0
    assert page.get_by_role('button',name='OCULTAR MI JUGADOR').count()==0
    page.get_by_role('button',name='ACTUALIZAR',exact=True).click()
    assert '@' not in page.locator('#communityDirectory').inner_text()
    page.evaluate("go('home')");assert page.locator('#homeProgress').bounding_box()['height']<230
    assert page.locator('#homeProgress .progress-prize').first.bounding_box()['height']<=80
    page.reload();page.wait_for_function('profile?.xp===5400')
    page.evaluate('openWardrobe()');page.wait_for_selector('#wardrobe:not(.hidden)');assert page.locator('.cosmetic-item').count()==31
    before=page.locator('#wardrobePreview img').get_attribute('src')
    assert page.locator('.cosmetic-preview').count()==31 and page.locator('#wardrobePreview img').get_attribute('src')==before
    page.locator('#cosmeticCategory').select_option('theme');assert page.locator('.cosmetic-item').count()==4
    assert all(page.locator('.cosmetic-item button').evaluate_all('els=>els.map(e=>e.disabled)'))
    page.locator('#cosmeticCategory').select_option('background')
    page.locator('.cosmetic-item').filter(has_text='Fondo violeta').get_by_role('button').click();page.wait_for_function('profile.cosmetics.background==="violet-grid"')
    assert page.locator('#wardrobePreview img').get_attribute('src')!=before
    fixture('/_test/control',{'grantXP':100000});page.reload();page.wait_for_function('profile?.xp===100000')
    page.evaluate('openWardrobe()');page.wait_for_selector('#wardrobe:not(.hidden)')
    for name,slot,item in [('Aurora boreal','background','aurora'),('Auriculares retro','hat','retro-headphones'),('Visor cyber','glasses','cyber-visor'),('Pulso neón','frame','pulse-frame'),('Fantasmita','badge','ghost-badge'),('Océano eléctrico','theme','ocean-theme'),('Tipografía · Arcade','font','pixel-font')]:
        page.locator('.cosmetic-item').filter(has_text=name).get_by_role('button').click();page.wait_for_function('([slot,id])=>profile.cosmetics[slot]===id',arg=[slot,item])
    assert page.evaluate('document.body.dataset.theme')=='ocean-theme'
    assert page.evaluate('document.body.dataset.personalFont')=='pixel-font'
    assert page.locator('#wardrobePreview .avatar-badge').inner_text()=='👾'
    assert page.locator('#wardrobePreview .avatar-shell').evaluate('(e)=>getComputedStyle(e).animationName')=='avatarPulse'
    page.emulate_media(reduced_motion='reduce');assert page.locator('#wardrobePreview .avatar-shell').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    page.reload();page.wait_for_function('profile?.cosmetics.theme==="ocean-theme"');assert page.evaluate('document.body.dataset.personalFont')=='pixel-font'
    page.get_by_role('button',name='CONTINUAR RUTA').click();page.wait_for_selector('#menu:not(.hidden)')
    assert page.locator('#quizSelect').count()==0 and page.locator('#difficulty').is_hidden()
    assert page.locator('#difficultyOverview button').count()==0
    for tier in ['easy','medium','hard']:
        fixture('/_test/control',{'ageStarts':True})
        if tier=='easy':page.locator('#beginBtn').click()
        else:page.locator('#continueQuizBtn').click()
        page.wait_for_selector('#quiz:not(.hidden)');assert tier.upper() not in page.locator('#qMeta').inner_text() # Localized difficulty only.
        assert 'LoadingPixel' not in page.locator('#question').evaluate('(e)=>getComputedStyle(e).fontFamily')
        games=fixture('/rest/v1/arcade_games',token=alice['access_token']);game=games[0]
        assert game['quiz_id']=='ps2-'+tier+'-01'
        keys=fixture('/_test/answers',{'gameId':game['id']})
        for key in keys:page.locator('.choice').nth(key).click();page.wait_for_timeout(500)
        page.wait_for_selector('#result:not(.hidden)')
    assert 'OTRA CONSOLA' in page.locator('#continueQuizBtn').inner_text()
    page.locator('#continueQuizBtn').click();page.wait_for_selector('#menu:not(.hidden)');assert page.locator('#category').input_value()=='ps1'
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for screen in ['home','menu','wardrobe','rewards']:
            page.evaluate('(id)=>go(id)',screen);page.wait_for_timeout(30)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,screen)
    page.wait_for_selector('#levelToast[hidden]',state='attached');page.set_viewport_size({'width':390,'height':844});page.evaluate("go('home')");page.screenshot(path='/workspace/loading/design/inicio-v20-mobile.png',full_page=True)
    page.set_viewport_size({'width':1280,'height':1000});page.screenshot(path='/workspace/loading/design/inicio-v20-desktop.png',full_page=True)
    page.evaluate('openWardrobe()');page.wait_for_selector('#wardrobe:not(.hidden)');page.screenshot(path='/tmp/loading-v14-cosmetics.png',full_page=True)
    assert not errors,errors;browser.close()
print('PASS v0.18 home: embedded logo; horizontal milestones; separate alphabetical community, automatic inclusion, clickable profiles and refresh; 31 previews and seven cosmetic slots; XP locks; saved theme/font; reduced-motion frames; automatic easy→medium→hard with one-click next and no titles/selectors; readable questions; responsive home/route/wardrobe/progress.')
