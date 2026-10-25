"""Read-only community visits; all network requests use local SQL/Auth fixture."""
import json,os,urllib.request
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
HOST='https://epnflypuxcfeexaqwlba.supabase.co';STORE='sb-epnflypuxcfeexaqwlba-auth-token'
def fixture(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)) as r:return json.load(r)
fixture('/_test/reset',{})
alice=fixture('/_test/session?user=alice');bob=fixture('/_test/session?user=bob')
for s,n in [(alice,'Alice'),(bob,'Bob')]:fixture('/rest/v1/rpc/arcade_save_profile',{'p_nickname':n,'p_avatar':2},s['access_token'])
token=bob['access_token']
for q in ['ps1-easy-01','ps1-medium-01','ps1-hard-01','ps2-easy-01']:
 fixture('/_test/control',{'ageStarts':True});g=fixture('/rest/v1/rpc/arcade_start_quiz',{'p_quiz_id':q},token);answers=fixture('/_test/answers',{'gameId':g['game_id']});fixture('/rest/v1/rpc/arcade_submit_game',{'p_game_id':g['game_id'],'p_answers':answers},token)
chests=fixture('/rest/v1/arcade_chests',token=token);awards=[fixture('/rest/v1/rpc/arcade_open_chest',{'p_chest_id':c['id']},token)['card_id'] for c in chests]
assert len(awards)==2
fixture('/rest/v1/rpc/arcade_feature_cards',{'p_ids':[awards[0]]},token)
players=fixture('/rest/v1/rpc/arcade_list_players',{'p_offset':0},token)['players'];pub_bob=next(p['public_id'] for p in players if p['nickname']=='Bob');pub_alice=next(p['public_id'] for p in players if p['nickname']=='Alice')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':844});errors=[]
 ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])))
 ctx.add_init_script('if(!localStorage.getItem('+json.dumps(STORE)+'))localStorage.setItem('+json.dumps(STORE)+','+json.dumps(json.dumps(alice))+');')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/dist/index.html');page.wait_for_function('profile?.name==="Alice"');assert page.locator('#homeCommunity').count()==0
 page.get_by_role('button',name='COMUNIDAD',exact=True).click();page.wait_for_selector('#community:not(.hidden) .community-player');assert page.locator('.community-player').count()==2;assert page.locator('.community-position').count()==0
 page.get_by_role('button',name='Visitar perfil de Bob').click();page.wait_for_selector('#playerVisit:not(.hidden) .album-thumb');assert page.locator('#community').is_hidden();assert page.locator('#visitedPlayer h1').inner_text()=='Bob';assert 'Nivel 3' in page.locator('#visitedPlayer').inner_text()
 assert page.locator('#visitedPlayer .album-thumb').count()==1
 hidden_name=page.evaluate('id=>cards.find(c=>c.id===id).name',awards[1]);shown_name=page.evaluate('id=>cards.find(c=>c.id===id).name',awards[0]);assert hidden_name not in page.locator('#visitedPlayer').inner_html();assert shown_name.casefold() in page.locator('#visitedPlayer').inner_text().casefold()
 assert 'de 14' not in page.locator('#visitedPlayer').inner_text();assert 'example.invalid' not in page.locator('#visitedPlayer').inner_html();assert bob['user']['id'] not in page.locator('#visitedPlayer').inner_html()
 page.locator('#visitedPlayer .album-thumb').click();page.wait_for_selector('#cardDetail[open]');assert page.locator('#cardDetail h3').inner_text().casefold()==shown_name.casefold();assert page.locator('#cardDetailActions button').count()==0;assert 'Exhibida por Bob' in page.locator('#cardDetailStatus').inner_text();assert page.evaluate('profile.unlocked.length')==0
 page.locator('#cardDetail').get_by_role('button',name='Cerrar detalle').click();page.evaluate('id=>showExhibitedCard(id)',awards[1]);assert not page.locator('#cardDetail').is_visible();page.evaluate('id=>showCollectible(id)',awards[0]);assert not page.locator('#cardDetail').is_visible()
 page.screenshot(path='/workspace/loading/design/perfil-publico-v20-mobile.png',full_page=True)
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.get_by_role('button',name='← VOLVER A COMUNIDAD').click();page.wait_for_selector('#community:not(.hidden)');page.screenshot(path='/workspace/loading/design/comunidad-v20-mobile.png',full_page=True)
 page.get_by_role('button',name='Visitar perfil de Alice').click();page.wait_for_selector('.visited-empty');assert 'Todavía no exhibe cartas' in page.locator('#visitedPlayer').inner_text()
 # Last requested profile wins, without navigating when the earlier request finishes.
 page.evaluate('ids=>Promise.all(ids.map(id=>visitPlayer(id)))',[pub_bob,pub_alice]);assert page.locator('#visitedPlayer h1').inner_text()=='Alice · Vos'
 page.evaluate('visitPlayer("00000000-0000-4000-8000-000000000000")');page.wait_for_selector('#visitedPlayer button');assert 'No pudimos abrir' in page.locator('#visitedPlayer').inner_text();assert shown_name not in page.locator('#visitedPlayer').inner_text()
 page.get_by_role('button',name='← VOLVER A COMUNIDAD').click();page.get_by_role('button',name='Visitar perfil de Bob').click();page.wait_for_selector('#visitedPlayer .album-thumb')
 # Owner removes exhibition: a fresh visit must not retain the old displayed card.
 fixture('/rest/v1/rpc/arcade_feature_cards',{'p_ids':[]},token);page.evaluate('id=>visitPlayer(id)',pub_bob);page.wait_for_selector('.visited-empty');assert page.locator('#visitedPlayer .album-thumb').count()==0
 assert not errors,errors;browser.close();print('PASS v18 browser: separate directory, clickable real profiles, safe avatar/level and featured-only cards, read-only card detail, empty/missing profiles, request ordering, fresh removal, responsive and no JS errors.')
