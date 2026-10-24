import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values($1),($2)',[alice,bob]);
async function user(id=alice){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function rpc(name,args=[]){return (await db.query('select to_jsonb(public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')) as data',args)).rows[0].data;}
await user();await rpc('arcade_save_profile',['Alice',3]);await db.exec("reset role;update public.arcade_profiles set xp=900,featured=array['key','herb'],cosmetics=jsonb_build_object('glasses','pink-glasses')");
await db.exec("insert into public.arcade_games(player_id,category,difficulty,quiz_id) values ('"+alice+"','ps1','normal','ps1-easy-01');insert into arcade_private.tier_unlocks(player_id,category,difficulty) values ('"+alice+"','ps1','medium')");
await db.exec(readFileSync(new URL('../upgrade-v09.sql',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../../content/collections/re4.json',import.meta.url),'utf8'));
const rows=(await db.query('select * from public.arcade_cards')).rows;
assert.equal(rows.length,14);assert.equal(rows.filter(c=>c.rarity==='common').length,8);assert.equal(rows.filter(c=>c.rarity==='epic').length,4);assert.equal(rows.filter(c=>c.rarity==='legendary').length,2);
for(const c of manifest.cards){const row=rows.find(r=>r.id===c.id);for(const key of ['name','description','kind','rarity'])assert.equal(row[key],c[key]);assert(!('required_xp' in row));}
assert.equal(rows.find(c=>c.id==='re4-typewriter').rarity,'epic');assert.equal(rows.find(c=>c.id==='re4-typewriter').kind,'object');
let profile=(await db.query('select * from public.arcade_profiles')).rows[0];assert.equal(profile.xp,0);assert.equal(profile.avatar,3);assert.equal(profile.nickname,'Alice');assert.deepEqual(profile.featured,[]);assert.deepEqual(profile.cosmetics,{});assert(!('coins' in profile));
assert.equal((await db.query('select count(*) as n from public.arcade_games')).rows[0].n,0);assert.equal((await db.query('select count(*) as n from arcade_private.tier_unlocks')).rows[0].n,0);
// Exact boundary partition, not a flaky random statistical test.
const rates=(await db.query("select arcade_private.chest_prize(n/10000.0) as kind,count(*)::integer as n from generate_series(0,9999) n group by kind")).rows;
assert.deepEqual(Object.fromEntries(rates.map(r=>[r.kind,r.n])),{common:8500,epic:1000,legendary:500});
assert.equal((await db.query('select arcade_private.chest_prize(0,false,true,true) as kind')).rows[0].kind,'epic');
assert.equal((await db.query('select arcade_private.chest_prize(0.99,false,true,true) as kind')).rows[0].kind,'legendary');
await assert.rejects(()=>db.query('select arcade_private.chest_prize(0,false,false,false)'));
await user();
async function play(id){
 await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user();
 const game=await rpc('arcade_start_quiz',[id]);await db.exec('reset role');
 const answers=(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[game.game_id])).rows.map(q=>q.correct_index);await user();
 return {game,result:await rpc('arcade_submit_game',[game.game_id,answers]),answers};
}
const first=await play('ps2-easy-01');assert.equal(first.result.score,900);assert.equal(first.result.chests_earned,0);assert.equal((await db.query('select * from public.arcade_chests')).rows.length,0);
assert.equal((await db.query('select * from public.arcade_owned_cards')).rows.length,0);await assert.rejects(()=>rpc('arcade_feature_cards',[['key']])); // 900 XP never grants a card.
const second=await play('ps1-easy-01');assert.equal(second.result.score,900);assert.equal(second.result.chests_earned,1);
assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,1800);
assert.deepEqual(await rpc('arcade_submit_game',[second.game.game_id,second.answers]),second.result);assert.equal((await db.query('select * from public.arcade_chests')).rows.length,1);
let chest=(await db.query('select * from public.arcade_chests')).rows[0];assert.equal(chest.level,2);
await assert.rejects(()=>db.query("select arcade_private.chest_prize(0)"));await assert.rejects(()=>db.query('select arcade_private.grant_level_chests(0,1800,$1)',[second.game.game_id]));await assert.rejects(()=>db.query('update public.arcade_profiles set xp=100000'));
const opened=await rpc('arcade_open_chest',[chest.id]);assert(opened.card_id);assert(!('coins' in opened));assert.equal((await db.query('select * from public.arcade_owned_cards')).rows.length,1);
assert.deepEqual(await rpc('arcade_open_chest',[chest.id]),opened);assert.equal((await db.query('select * from public.arcade_owned_cards')).rows.length,1);
await rpc('arcade_feature_cards',[[opened.card_id]]);await assert.rejects(()=>db.query('insert into public.arcade_owned_cards(player_id,card_id,source_chest_id) values($1,$2,$3)',[alice,'key',chest.id]));
await user(bob);await rpc('arcade_save_profile',['Bob',0]);assert.equal((await db.query('select * from public.arcade_owned_cards')).rows.length,0);assert.equal((await db.query('select * from public.arcade_chests')).rows.length,0);await assert.rejects(()=>rpc('arcade_open_chest',[chest.id]));
// Fixture-only insertion gives enough earned chests to exhaust every rarity.
await db.exec('reset role');await db.query('insert into public.arcade_chests(player_id,level,source_game_id) select $1,n,$2 from generate_series(3,16) n',[alice,second.game.game_id]);await user();
const unopened=(await db.query('select * from public.arcade_chests where opened_at is null order by level')).rows;
const unique=new Set([opened.card_id]);for(const c of unopened.slice(0,13)){const prize=await rpc('arcade_open_chest',[c.id]);assert(!unique.has(prize.card_id));unique.add(prize.card_id);}
assert.equal(unique.size,14);assert.equal((await db.query('select * from public.arcade_owned_cards')).rows.length,14);
const extra=unopened.at(-1);await assert.rejects(()=>rpc('arcade_open_chest',[extra.id]));assert.equal((await db.query('select opened_at from public.arcade_chests where id=$1',[extra.id])).rows[0].opened_at,null);
assert.deepEqual(await rpc('arcade_open_chest',[chest.id]),opened);assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,1800);
console.log('PASS RE4/chests: authorized test reset; 14 cards 8/4/2; two perfect quizzes give 1800 XP and exactly one level-2 chest; XP never grants cards; 85/10/5 boundaries; exhausted rarities normalized; 14 unique prizes, no repeats or coins; full collection preserves unopened chest; retry/idempotency; owner isolation and denied writes.');await db.close();
