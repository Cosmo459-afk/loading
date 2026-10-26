import json,urllib.request
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co'
def api(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)) as r:return json.load(r)
api('/_test/reset',{});session=api('/_test/session?user=alice');api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'Jugador','p_avatar':2},session['access_token'])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])));page.add_init_script('localStorage.setItem("sb-epnflypuxcfeexaqwlba-auth-token",'+json.dumps(json.dumps(session))+')');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8085/dist/index.html');page.wait_for_selector('#navProfile:visible');page.locator('#navProfile').click();page.wait_for_selector('#player:not(.hidden) .profile-cosmetics');assert page.locator('#profileInventory .profile-tile').count()==4;assert 'MI ESTILO' not in page.locator('#player').inner_text();assert 'MIS CARTAS' in page.locator('#profileInventory').inner_text()
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path='design/perfil-v37-'+str(width)+'.png',full_page=True)
 page.locator('.profile-cosmetics').click();page.wait_for_selector('#wardrobe:not(.hidden)');page.evaluate('openProfileHub()');page.wait_for_selector('#player:not(.hidden)');page.get_by_role('button',name='MIS CARTAS',exact=False).click();page.wait_for_selector('#collection:not(.hidden)');assert not errors,errors;b.close()
print('PASS profile v37: compact inventory, cosmetics beside avatar, cards navigation and responsive widths 320–1280.')
