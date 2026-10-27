"""Real SW lifecycle, install UI, offline fallback and public release notes; local servers only."""
import json,threading,urllib.request,tempfile,shutil
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright
HOST='https://epnflypuxcfeexaqwlba.supabase.co';KEY='sb-epnflypuxcfeexaqwlba-auth-token';BASE='http://127.0.0.1:8088/'
phase=1;navigation=0
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(Path('dist').resolve()),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  global navigation
  if self.path.split('?')[0] in ['/','/index.html','/sw.js']:
   worker=self.path.startswith('/sw.js');data=Path('dist/sw.js' if worker else 'dist/index.html').read_text()
   if worker:data=data.replace('0.49.0','0.49.0-test-'+str(phase))
   else:navigation+=1;data+='<!-- network-navigation-'+str(navigation)+' -->'
   data=data.encode();self.send_response(200);self.send_header('Content-Type','application/javascript' if worker else 'text/html');self.send_header('Cache-Control','no-cache');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
def api(path,body=None,token=None):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8082'+path,data=None if body is None else json.dumps(body).encode(),headers=h)) as r:return json.load(r)
api('/_test/reset',{});session=api('/_test/session?user=alice');api('/rest/v1/rpc/arcade_save_profile',{'p_nickname':'AppPlayer','p_avatar':2},session['access_token'])
server=ThreadingHTTPServer(('127.0.0.1',8088),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 profile_dir=tempfile.mkdtemp(prefix='loading-pwa-test-');ctx=p.chromium.launch_persistent_context(profile_dir,executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],viewport={'width':390,'height':844},reduced_motion='reduce');b=ctx.browser;ctx.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])));ctx.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(session))+')');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.wait_for_selector('#navProfile:visible');page.wait_for_function('!!navigator.serviceWorker.controller');assert page.locator('#homeInstallArcade').is_visible();assert page.locator('#updateArcade').is_hidden();assert page.locator('#arcadeNews .news-unread').is_visible()
 manifest=ctx.request.get(BASE+'manifest.webmanifest').json();assert manifest['display']=='standalone';assert manifest['scope']=='./';assert len(manifest['icons'])==3
 cdp=ctx.new_cdp_session(page);app=cdp.send('Page.getAppManifest');assert not app['errors'],app['errors'];installability=cdp.send('Page.getInstallabilityErrors');assert not installability['installabilityErrors'],installability
 for icon in manifest['icons']:
  assert ctx.request.get(BASE+icon['src']).status==200
 for width in [320,390,768,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='design/inicio-app-novedades-v49.png',full_page=True);page.locator('#openArcadeNews').click();assert page.locator('#arcadeNewsDialog article').count()==3;assert page.get_by_text('Más espacio para tus cartas',exact=True).is_visible();page.screenshot(path='design/novedades-v49.png',full_page=True);page.get_by_role('button',name='Cerrar novedades',exact=True).click();assert page.locator('#arcadeNews .news-unread').is_hidden();page.reload();page.wait_for_selector('#navProfile:visible');assert page.locator('#arcadeNews .news-unread').is_hidden()
 page.locator('#homeInstallArcade button').click();assert page.locator('#installArcadeDialog').is_visible();page.screenshot(path='design/instalar-app-v49.png',full_page=True)
 # Exercise the native prompt without accepting an actual OS installation.
 page.evaluate("""()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.prompted=true};e.userChoice=Promise.resolve({outcome:'dismissed'});dispatchEvent(e)}""");page.locator('#installArcadeNative').click();page.wait_for_function('window.prompted===true');assert 'más adelante' in page.locator('#installArcadeStatus').inner_text();page.get_by_role('button',name='Cerrar instalación',exact=True).click()
 first=navigation;page.reload();page.wait_for_selector('#navProfile:visible');assert navigation>first
 # A changed worker waits. It cannot reload the page during a question.
 phase=2;page.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()}');page.wait_for_function('document.getElementById("updateArcade").hidden===false');page.evaluate('document.getElementById("quiz").classList.remove("hidden")');page.wait_for_function('document.getElementById("updateArcade").disabled');page.evaluate('document.getElementById("quiz").classList.add("hidden")');page.wait_for_function('!document.getElementById("updateArcade").disabled');page.locator('#updateArcade').click();page.wait_for_function('document.getElementById("updateArcade")?.hidden===true');page.wait_for_selector('#navProfile:visible');assert page.evaluate('profile.name')=='AppPlayer'
 cached=page.evaluate('async()=>{const out=[];for(const k of await caches.keys())for(const r of await (await caches.open(k)).keys())out.push(r.url);return out}');assert len(cached)==2,cached;assert all(u.endswith('/offline.html') or u.endswith('/icon-192.png') for u in cached)
 ctx.set_offline(True);page.goto(BASE+'index.html#semanal');assert 'Volvemos cuando tengas conexión' in page.locator('h1').inner_text();assert 'tiempo sigue' in page.locator('p').inner_text();ctx.set_offline(False);page.get_by_role('link',name='VOLVER A INTENTAR').click();page.wait_for_selector('#navProfile:visible');assert page.evaluate('profile.name')=='AppPlayer'
 page.evaluate("dispatchEvent(new Event('appinstalled'))");assert page.locator('#homeInstallArcade').is_hidden();assert page.locator('#installArcade').is_hidden();assert not errors,errors
 # Manual Safari instructions and no redundant install invitation in standalone mode.
 ios=b.new_context(user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1');ios.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])));ip=ios.new_page();ip.goto(BASE);ip.locator('#homeInstallArcade button').click();assert 'En Safari' in ip.locator('#installArcadeHelp').inner_text();ios.close()
 standalone=b.new_context();standalone.add_init_script("const original=window.matchMedia;window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,addEventListener(){}}:original.call(window,q)");standalone.route(HOST+'/**',lambda r:r.fulfill(response=r.fetch(url='http://127.0.0.1:8082'+r.request.url[len(HOST):])));sp=standalone.new_page();sp.goto(BASE);sp.wait_for_selector('#installArcade',state='attached');assert sp.locator('#installArcade').is_hidden();assert sp.locator('#homeInstallArcade').is_hidden();standalone.close();b.close()
server.shutdown();shutil.rmtree(profile_dir);print('PASS v49: valid installable manifest/icons, manual/native install and standalone UI, responsive news/read state, real worker update waits during play, fresh HTML navigation, offline fallback, account preserved and only two non-game cached assets.')
