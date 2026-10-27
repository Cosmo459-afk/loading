"""Owner statistics against local real SQL RPC; production traffic is intercepted."""
import json,urllib.request
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token'
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
api('/_test/reset',{});owner=api('/_test/session?user=alice');bob=api('/_test/session?user=bob');token=owner['access_token'];api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'Owner','p_avatar':2},token);api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'Bob','p_avatar':1},bob['access_token']);api('/_test/admin-enable',{})
for q in ['ps1-easy-01','ps1-medium-01']:
 api('/_test/control',{'ageStarts':True});game=api('/rest/v1/rpc/arcade_start_quiz',{'p_quiz_id':q},token);answers=api('/_test/answers',{'gameId':game['game_id']});api('/rest/v1/rpc/arcade_submit_game',{'p_game_id':game['game_id'],'p_answers':answers},token)
api('/_test/control',{'ageStarts':True});api('/rest/v1/rpc/arcade_start_quiz',{'p_quiz_id':'ps1-hard-01'},token)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':390,'height':844});failed=[False];errors=[]
 def proxy(r):
  if 'arcade_admin_stats' in r.request.url and not failed[0]:failed[0]=True;r.fulfill(status=404,content_type='application/json',body='{"code":"PGRST202","message":"Missing function"}');return
  r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):]))
 ctx.route(HOST+'/**',proxy);ctx.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(owner))+')');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8085/dist/index.html');page.wait_for_selector('#navProfile:visible');page.locator('#navProfile').click();page.locator('#adminEntry').click();page.get_by_role('button',name='VER ESTADÍSTICAS',exact=True).click();page.wait_for_function('document.getElementById("adminNotice").textContent.includes("SQL v45")');assert page.locator('.stats-summary').count()==0
 with page.expect_response(lambda r:'arcade_admin_stats' in r.url) as response:page.locator('#adminBody').get_by_role('button',name='REINTENTAR',exact=True).click()
 data=response.value.json();assert data['normal']['started']==3;assert data['normal']['finished']==2;assert data['normal']['pending']==1;assert data['normal']['completion_rate']==66.7;page.wait_for_selector('.stats-summary');assert page.locator('.stats-summary .stats-metric strong').all_inner_texts()==['1','2','0','2'];assert page.locator('.stats-day').count()==7
 page.locator('.stats-daily-details summary').click();assert page.locator('.stats-daily-details tbody tr').count()==7;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('.stats-daily-details summary').click()
 for days in [30,7]:
  page.get_by_role('button',name=str(days)+' DÍAS',exact=True).click();page.wait_for_function('document.querySelectorAll(".stats-day").length=='+str(days));assert page.locator('.stats-filters [aria-pressed="true"]').inner_text()==str(days)+' DÍAS'
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path='design/estadisticas-v45-'+str(width)+'.png',full_page=True)
 page.locator('#adminBody').get_by_role('button',name='ACTUALIZAR',exact=True).click();page.wait_for_selector('.stats-summary');assert not errors,errors;browser.close()
print('PASS v45 UI: owner overview/stats entry, missing-SQL message/retry, real cohort numbers, 7/30 filters, daily details, refresh and responsive widths 320–1280.')
