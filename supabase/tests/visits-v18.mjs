import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql','upgrade-v09.sql','upgrade-v14.sql','upgrade-v15-schema.sql','upgrade-v16.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const ids=Array.from({length:26},(_,i)=>'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0'));
for(const [i,id] of ids.entries()){await db.query('insert into auth.users values($1)',[id]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.query('select public.arcade_save_profile($1,0,null)',['Player'+String(i).padStart(2,'0')]);}
const sql=readFileSync(new URL('../upgrade-v18.sql',import.meta.url),'utf8');await db.exec(sql);
const alice=ids[0],bob=ids[1];await db.query("select set_config('request.jwt.claim.sub',$1,false)",[bob]);
const g=(await db.query("select public.arcade_start_quiz('ps1-easy-01') as g")).rows[0].g.game_id;
const cardIds=(await db.query('select id from public.arcade_cards order by id limit 5')).rows.map(c=>c.id);
for(const [i,id] of cardIds.slice(0,4).entries()){const chest=(await db.query('insert into public.arcade_chests(player_id,level,source_game_id) values($1,$2,$3) returning id',[bob,i+2,g])).rows[0].id;await db.query('insert into public.arcade_owned_cards(player_id,card_id,source_chest_id) values($1,$2,$3)',[bob,id,chest]);}
await db.query('update public.arcade_profiles set featured=$1,xp=4000 where id=$2',[cardIds,bob]);
async function user(){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);await db.exec('set role authenticated');}
await user();const rpc=async(name,args=[])=> (await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as data',args)).rows[0].data;
const first=await rpc('arcade_list_players',[0]),next=await rpc('arcade_list_players',[24]);assert.equal(first.total,26);assert.equal(first.players.length,24);assert.equal(first.has_more,true);assert.equal(next.players.length,2);assert.equal(next.has_more,false);assert.equal(first.players[0].nickname,'Player00');assert(!('position' in first.players[0]));assert(!JSON.stringify(first).includes(bob));
const publicBob=first.players.find(p=>p.nickname==='Player01').public_id;assert.notEqual(publicBob,bob);
const visit=await rpc('arcade_visit_player',[publicBob]);assert.equal(visit.level,3);assert.equal(visit.featured_ids.length,3);assert.deepEqual(visit.featured_ids,cardIds.slice(0,3));assert.deepEqual(Object.keys(visit).sort(),['avatar','cosmetics','featured_ids','is_me','level','nickname','public_id']);assert(!JSON.stringify(visit).includes(cardIds[3]));assert(!JSON.stringify(visit).includes(cardIds[4]));assert(!JSON.stringify(visit).includes(bob));
await assert.rejects(()=>rpc('arcade_visit_player',[bob]),/unavailable/);await assert.rejects(()=>rpc('arcade_list_players',[-1]),/Invalid page/);await assert.rejects(()=>rpc('arcade_list_players',[null]),/Invalid page/);
assert.equal((await db.query('select * from public.arcade_owned_cards where player_id=$1',[bob])).rows.length,0);
await db.exec('reset role');await db.query('update public.arcade_profiles set featured=$1 where id=$2',[[cardIds[4]],bob]);await user();assert.deepEqual((await rpc('arcade_visit_player',[publicBob])).featured_ids,[]);
await db.exec('reset role');await db.exec(sql);assert.equal((await db.query('select community_id from public.arcade_profiles where id=$1',[bob])).rows[0].community_id,publicBob);assert.equal((await db.query('select xp from public.arcade_profiles where id=$1',[bob])).rows[0].xp,4000);
await db.exec('set role anon');await assert.rejects(()=>rpc('arcade_visit_player',[publicBob]),/permission denied/);await assert.rejects(()=>rpc('arcade_list_players',[0]),/permission denied/);
await db.close();console.log('PASS v18: alphabetical paginated directory, public IDs distinct from Auth, visits expose only safe fields and three actually owned featured cards, no unfeatured/unowned inventory, RLS/auth, stable IDs and XP on rerun.');
