"""Effects-only Web Audio checks; all production API requests are blocked."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ARCADE_URL','http://127.0.0.1:8085').rstrip('/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844})
    ctx.route('https://epnflypuxcfeexaqwlba.supabase.co/**',lambda r:r.fulfill(status=401,content_type='application/json',body='{}'))
    ctx.add_init_script('''window.audioContexts=[];window.audioStarts=[];
      if(!localStorage.getItem('loading_arcade_audio_v1'))localStorage.setItem('loading_arcade_audio_v1',JSON.stringify({music:true,musicVolume:100,effects:true,effectsVolume:55}));
      const Native=window.AudioContext;
      window.AudioContext=class extends Native{
        constructor(...args){super(...args);window.audioContexts.push(this);}
        createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(at)=>{window.audioStarts.push({pitch:o.frequency.value,at});start(at);};return o;}
        createDynamicsCompressor(){const c=super.createDynamicsCompressor();window.audioMeter=this.createAnalyser();c.connect(window.audioMeter);return c;}
      };''')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'/dist/index.html');page.wait_for_selector('#createPlayerBtn:not([disabled])')
    assert page.evaluate('audioContexts.length')==0
    assert page.locator('#audioMusic').count()==0 and page.locator('#audioMusicVolume').count()==0
    page.locator('.audio-settings summary').click();page.wait_for_function('audioContexts[0]?.state==="running"')
    page.wait_for_timeout(500);assert page.evaluate('audioStarts.length')==0 # Old music preferences cannot start a melody.
    def amplitude():
        return page.evaluate('''()=>{const a=new Float32Array(audioMeter.fftSize);audioMeter.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));}''')
    assert amplitude()<.0002
    page.locator('#audioPreview').click();page.wait_for_timeout(80);assert amplitude()>.0001
    page.locator('#audioEffects').uncheck();page.wait_for_timeout(300)
    count=page.evaluate('audioStarts.length');page.locator('#audioPreview').click();page.wait_for_timeout(200)
    assert page.evaluate('audioStarts.length')==count and amplitude()<.0002
    page.locator('#audioEffectsVolume').fill('30');page.reload();page.wait_for_selector('.audio-settings')
    page.locator('.audio-settings summary').click();assert not page.locator('#audioEffects').is_checked()
    assert page.locator('#audioEffectsVolume').input_value()=='30'
    page.locator('#audioEffects').check();page.locator('#audioPreview').click();page.wait_for_timeout(80);assert amplitude()>.0001
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function('audioContexts[0].state==="suspended"')
    count=page.evaluate('audioStarts.length');page.wait_for_timeout(250);assert page.evaluate('audioStarts.length')==count
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_function('audioContexts[0].state==="running"');page.wait_for_timeout(400);assert amplitude()<.0002
    count=page.evaluate('audioStarts.length');page.wait_for_timeout(700);assert page.evaluate('audioStarts.length')==count
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    fallback=browser.new_context();fallback.route('https://epnflypuxcfeexaqwlba.supabase.co/**',lambda r:r.fulfill(status=401,content_type='application/json',body='{}'))
    fallback.add_init_script('window.AudioContext=undefined;window.webkitAudioContext=undefined;')
    noaudio=fallback.new_page();noaudio.goto(BASE+'/dist/index.html');noaudio.locator('.audio-settings summary').click()
    assert 'no admite audio' in noaudio.locator('#audioStatus').inner_text()
    assert noaudio.locator('#createPlayerBtn').is_visible();browser.close()
print('PASS effects only: music controls/loop removed even with old preferences; audible effects; mute/volume persistence; background suspension; silent idle/resume; responsive controls; fallback; no remote writes.')
