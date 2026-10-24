import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
for(const from of ['v07','v08']){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql',...(from==='v08'?['upgrade-v08.sql']:[])])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
 const id='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[id]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec("select public.arcade_save_profile('Alice',2);update public.arcade_profiles set xp=3000");
 const upgrade=readFileSync(new URL('../upgrade-to-v09.sql',import.meta.url),'utf8');await db.exec(upgrade);
 assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,0);
 assert.equal((await db.query('select count(*) as n from public.arcade_cards')).rows[0].n,14);
 assert.equal((await db.query('select avatar from public.arcade_profiles')).rows[0].avatar,2);
 await db.exec('update public.arcade_profiles set xp=1234');await db.exec(upgrade);
 assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,1234);
 await db.close();console.log('PASS single-step upgrade from '+from+': first install resets authorized test progress; accounts retained; rerun preserves new XP.');
}
