"""Weekly landing before login/avatar: public data, truthful errors and no attempt consumed."""
import json,uuid,urllib.request
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token';BASE='http://127.0.0.1:8085/dist/index.html'
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
api('/_test/reset',{});alice=api('/_test/session?user=alice');bob=api('/_test/session?user=bob');token=alice['access_token'];api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'Alice','p_avatar':2},token);api('/_test/admin-enable',{})
payload={'id':str(uuid.uuid4()),'title':'RE4 original · Semanal activa','game':'RE4 original','seconds':20,'reward_name':'Ada Wong · Exclusiva','questions':[{'prompt':'Pregunta sintética para prueba número '+str(i),'choices':['A','B','C','D'],'correct_index':i%4,'source':{'reference':'https://example.invalid/fixture','evidence':'Contenido sintético para probar la interfaz.'}} for i in range(20)]}
id=api('/rest/v1/rpc/arcade_admin_weekly_save',{'p_payload':payload},token);from datetime import datetime,timedelta,timezone
now=datetime.now(timezone.utc);api('/rest/v1/rpc/arcade_admin_weekly_activate',{'p_id':id,'p_start':(now-timedelta(seconds=1)).isoformat(),'p_end':(now+timedelta(days=7)).isoformat()},token)
api('/rest/v1/rpc/arcade_weekly_play',{'p_challenge':id},token)
for i in range(20):api('/rest/v1/rpc/arcade_weekly_play',{'p_challenge':id,'p_position':i,'p_answer':i%4},token)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);errors=[];plays=[]
 def proxy(r):
  if 'arcade_weekly_play' in r.request.url:plays.append(r.request.url)
  r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):]))
 # Logged-in identity with no character is the exact screenshot regression.
 ctx=browser.new_context(viewport={'width':390,'height':844});ctx.route(HOST+'/**',proxy);ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(bob))+')');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_function('document.getElementById("homeWeekly").textContent.includes("Semanal activa")');assert 'Completá tu jugador' in page.locator('#homeAccount').inner_text();assert 'se está preparando' not in page.locator('#homeWeekly').inner_text();assert page.locator('#homeWeeklyRanking .weekly-rank-row').count()==1;assert page.evaluate('profile===null');assert not plays
 page.wait_for_timeout(250);page.screenshot(path='design/entrada-sin-avatar-v27-mobile.png',full_page=True)
 # Actual anonymous visitor: first request fails, retry must not claim no challenge exists.
 guest=browser.new_context(viewport={'width':390,'height':844});failed=[False]
 def guest_route(r):
  if 'arcade_weekly_public_hub' in r.request.url and not failed[0]:failed[0]=True;r.fulfill(status=503,content_type='application/json',body='{"message":"Network unavailable"}');return
  proxy(r)
 guest.route(HOST+'/**',guest_route);g=guest.new_page();g.on('pageerror',lambda e:errors.append(str(e)));g.goto(BASE);g.wait_for_function('document.getElementById("homeWeeklyStatus")?.textContent.includes("No pudimos")');assert 'se está preparando' not in g.locator('#homeWeekly').inner_text();g.locator('#homeWeekly').get_by_role('button',name='ACTUALIZAR DESAFÍO',exact=True).click();g.wait_for_selector('#homeWeeklyRanking .weekly-rank-row');assert 'Semanal activa' in g.locator('#homeWeekly').inner_text();assert not plays
 g.locator('#homeWeekly').get_by_role('button',name='VER DESAFÍO',exact=True).click();g.wait_for_selector('#weeklyStart:not([hidden])');assert g.locator('#weeklyStart').inner_text()=='ELEGIR APODO Y AVATAR PARA JUGAR';assert g.locator('#weeklyRank .game-card.rarity-exclusive').count()==1;assert not plays
 g.locator('#weeklyStart').click();g.wait_for_selector('#profile:not(.hidden)');g.locator('#nickname').fill('NuevoJugador');g.locator('#profile .actions').get_by_role('button',name='CONTINUAR →',exact=True).click();g.wait_for_selector('#weekly:not(.hidden) #weeklyStart:not([hidden])');g.wait_for_function('document.getElementById("weeklyStart").textContent==="REGISTRARME PARA COMPETIR"');assert not plays
 # A confirmed empty response may show the actual preparation state.
 empty=browser.new_context();empty.route(HOST+'/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"challenge":null,"top":[]}') if 'arcade_weekly_public_hub' in r.request.url else proxy(r));ep=empty.new_page();ep.goto(BASE);ep.wait_for_function('document.getElementById("homeWeekly").textContent.includes("El próximo desafío se está preparando")')
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors;browser.close()
print('PASS v27 UI: active weekly/top10 before login or avatar, screenshot regression, failed-read retry without false preparation, empty-state only after confirmation, create-character return path and no attempt consumed by browsing.')
