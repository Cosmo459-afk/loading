"""Public leaderboard export with synthetic entries, no production requests."""
import json
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co'
hub={'challenge':{'id':'11111111-1111-4111-8111-111111111111','title':'Resident Evil 4 · Original 2005','game':'Resident Evil 4','seconds':20,'status':'live','starts_at':'2026-10-25T00:00:00Z','ends_at':'2099-01-01T00:00:00Z','reward_name':'Ada Wong'},'server_now':'2026-10-26T18:35:00Z','top':[{'place':i+1,'nickname':('Jugador de prueba '+str(i+1)) if i else 'Apodo de prueba extremadamente largo','avatar':i%8,'cosmetics':{},'correct':20-i,'points':(20-i)*100,'elapsed_ms':95432+i*5000} for i in range(10)]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  if 'arcade_weekly_public_hub' in r.request.url:r.fulfill(status=200,content_type='application/json',body=json.dumps(hub))
  else:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):]))
 page.route(HOST+'/**',route);page.goto('http://127.0.0.1:8085/dist/index.html');page.wait_for_selector('.weekly-home-prize');assert '20/20' in page.locator('.weekly-home-prize').inner_text();page.screenshot(path='design/inicio-semanal-v35-mobile.png',full_page=True);page.get_by_role('button',name='COMPARTIR TOP 10',exact=True).click();page.wait_for_function('!document.getElementById("downloadShareBtn").disabled');assert page.locator('#shareHeading').inner_text()=='Compartir top 10 semanal'
 for fmt,w,h in [('feed',1080,1350),('story',1080,1920)]:
  page.locator('[data-format="'+fmt+'"]').click();page.wait_for_function('!document.getElementById("downloadShareBtn").disabled');page.wait_for_function('document.getElementById("sharePreview").naturalHeight=='+str(h));assert page.locator('#sharePreview').evaluate('(i)=>i.naturalWidth')==w
  with page.expect_download() as d:page.locator('#downloadShareBtn').click()
  d.value.save_as('design/ranking-v35-'+fmt+'-EJEMPLO.png')
 assert not errors,errors;b.close()
print('PASS v35: ten rows, long nickname, guest export, feed/story exact dimensions and PNG downloads; synthetic data only.')
