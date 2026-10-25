import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql','upgrade-v09.sql','upgrade-v14.sql','upgrade-v15-schema.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const ids=Array.from({length:14},(_,i)=>'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0'));
for(const [i,id] of ids.entries()){
 await db.query('insert into auth.users values($1)',[id]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.query('select public.arcade_save_profile($1,0,null)',['Player'+i]);await db.query('update public.arcade_profiles set xp=$1,community_visible=false where id=$2',[i===13?0:(i===12?12000:20000-i*100),id]);
}
const sql=readFileSync(new URL('../upgrade-v16.sql',import.meta.url),'utf8');await db.exec(sql);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[13]]);await db.exec('set role authenticated');
const get=async()=> (await db.query('select public.arcade_community() as data')).rows[0].data;
let r=await get();assert.equal(r.total,14);assert.equal(r.players.length,12);assert.equal(r.me.position,14);assert.equal(r.me.is_me,true);assert.equal(r.players[0].position,1);assert.equal(r.players[0].nickname,'Player0');
assert.deepEqual(Object.keys(r.players[0]).sort(),['avatar','cosmetics','is_me','level','nickname','position','xp']);assert(!JSON.stringify(r).includes(ids[0]));assert.equal(r.players[0].level,12);
await assert.rejects(()=>db.query('select public.arcade_set_community_visibility(false)'),/permission denied/);
await db.exec('reset role');await db.query('update public.arcade_profiles set xp=20000 where id=$1',[ids[1]]);await db.exec('set role authenticated');r=await get();assert.equal(r.players[0].position,1);assert.equal(r.players[1].position,1);assert.equal(r.players[2].position,3);
await db.exec('reset role');await db.query('update public.arcade_profiles set community_visible=false where id=$1',[ids[0]]);await db.exec('set role authenticated');assert.equal((await get()).total,14);
await db.exec('reset role');await db.exec(sql);assert.equal((await db.query('select xp from public.arcade_profiles where id=$1',[ids[0]])).rows[0].xp,20000);
await db.exec('set role anon');await assert.rejects(get,/permission denied/);await db.close();console.log('PASS v16 community: automatic inclusion, XP ranking, shared ties, top12 plus own place, safe fields, retired toggle denied, anonymous denied, rerun preserves progress.');
