"""Real Web Audio graph checks in Chromium; blocks every production API request."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844})
    ctx.route('https://epnflypuxcfeexaqwlba.supabase.co/**',lambda r:r.fulfill(status=401,content_type='application/json',body='{}'))
    ctx.add_init_script('''
      window.audioContexts=[];window.audioStarts=[];
      const Native=window.AudioContext;
      window.AudioContext=class extends Native{
        constructor(...args){super(...args);window.audioContexts.push(this);}
        createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(at)=>{window.audioStarts.push({pitch:o.frequency.value,at});start(at);};return o;}
        createDynamicsCompressor(){const c=super.createDynamicsCompressor();window.audioMeter=this.createAnalyser();c.connect(window.audioMeter);return c;}
      };
    ''')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'/dist/index.html');page.wait_for_selector('#createPlayerBtn:not([disabled])')
    assert page.evaluate('audioContexts.length')==0 # No autoplay before a gesture.
    page.locator('.audio-settings summary').click()
    page.wait_for_function('audioContexts[0]?.state==="running" && audioStarts.length>2')
    page.wait_for_timeout(300)
    def amplitude():
        return page.evaluate('''()=>{const a=new Float32Array(audioMeter.fftSize);audioMeter.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));}''')
    assert amplitude()>.0001 # Real audible music signal, not just oscillator construction.
    page.locator('#audioMusic').uncheck();page.wait_for_timeout(350)
    assert amplitude()<.0002
    count=page.evaluate('audioStarts.length');page.locator('#audioPreview').click()
    page.wait_for_function('(n)=>audioStarts.length>n',arg=count)
    page.wait_for_timeout(80)
    assert amplitude()>.0001
    page.locator('#audioEffects').uncheck();page.wait_for_timeout(300)
    count=page.evaluate('audioStarts.length');page.locator('#audioPreview').click();page.wait_for_timeout(200)
    assert page.evaluate('audioStarts.length')==count and amplitude()<.0002
    page.locator('#audioMusicVolume').fill('40');page.locator('#audioEffectsVolume').fill('30')
    page.reload();page.wait_for_selector('.audio-settings');assert page.evaluate('audioContexts.length')==0
    page.locator('.audio-settings summary').click()
    assert not page.locator('#audioMusic').is_checked() and not page.locator('#audioEffects').is_checked()
    assert page.locator('#audioMusicVolume').input_value()=='40' and page.locator('#audioEffectsVolume').input_value()=='30'
    page.locator('#audioMusic').check();page.wait_for_timeout(350);assert amplitude()>.0001
    page.evaluate("go('result')");page.wait_for_timeout(200);assert amplitude()<.0002
    page.evaluate("go('home')");page.wait_for_timeout(350);assert amplitude()>.0001
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function('audioContexts[0].state==="suspended"')
    count=page.evaluate('audioStarts.length');page.wait_for_timeout(250);assert page.evaluate('audioStarts.length')==count
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function('audioContexts[0].state==="running"');page.wait_for_timeout(350);assert amplitude()>.0001
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    # Unsupported browser should retain the working interface and display a clear status.
    fallback=browser.new_context();fallback.route('https://epnflypuxcfeexaqwlba.supabase.co/**',lambda r:r.fulfill(status=401,content_type='application/json',body='{}'))
    fallback.add_init_script('window.AudioContext=undefined;window.webkitAudioContext=undefined;')
    noaudio=fallback.new_page();noaudio.goto(BASE+'/dist/index.html');noaudio.locator('.audio-settings summary').click()
    assert 'no admite audio' in noaudio.locator('#audioStatus').inner_text()
    assert noaudio.locator('#createPlayerBtn').is_visible()
    browser.close()
print('PASS audio: no autoplay; audible music/effects; independent mute and volume persistence; silent results; background suspension/resume; responsive settings; unsupported-browser fallback; no remote writes.')
