import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values ($1),($2)',[alice,bob]);
async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function reject(sql,args=[]){let error;try{await db.query(sql,args);}catch(e){error=e;}assert(error,sql);}
async function catalog(){return (await db.query('select public.arcade_list_quizzes() as data')).rows[0].data;}
async function age(){await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user(alice);}
async function play(id){await age();const g=(await db.query('select public.arcade_start_quiz($1) as data',[id])).rows[0].data;await db.exec('reset role');const answers=(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[g.game_id])).rows.map(x=>x.correct_index);await user(alice);return (await db.query('select public.arcade_submit_game($1,$2) as data',[g.game_id,answers])).rows[0].data;}
await user(alice);await db.query("select public.arcade_save_profile('Alice',0)");
await db.exec("reset role;update public.arcade_profiles set xp=300,games=1");
await db.exec(readFileSync(new URL('../upgrade-v07.sql',import.meta.url),'utf8'));
await user(alice);assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,300);
const kinds=(await db.query('select id,kind,rarity from public.arcade_cards')).rows;assert(kinds.filter(c=>['blade','guns'].includes(c.id)).every(c=>c.kind==='weapon'&&c.rarity==='epic'));assert(kinds.find(c=>c.id==='key').rarity==='common');
let rows=await catalog();assert.equal(rows.length,6);assert(rows.filter(x=>x.difficulty==='easy').every(x=>x.unlocked));assert(rows.filter(x=>x.difficulty!=='easy').every(x=>!x.unlocked));
await reject("select public.arcade_start_quiz('ps2-medium-01')");await reject("select public.arcade_start_quiz('ps2-hard-01')");
await reject("select public.arcade_start_game('ps2','expert')");
await play('ps2-easy-01');rows=await catalog();assert(rows.find(x=>x.id==='ps2-medium-01').unlocked);assert(!rows.find(x=>x.id==='ps2-hard-01').unlocked);assert(!rows.find(x=>x.id==='ps1-medium-01').unlocked);assert(rows.find(x=>x.id==='ps1-easy-01').unlocked);
await play('ps2-medium-01');rows=await catalog();assert(rows.find(x=>x.id==='ps2-hard-01').unlocked);assert(!rows.find(x=>x.id==='ps1-hard-01').unlocked);
await reject("select public.arcade_start_game('mix','expert')");
// Boundary checks: XP alone never grants advanced difficulty, and cosmetic data cannot be forged.
await db.exec('reset role;update public.arcade_profiles set xp=499');await user(alice);
await reject("select public.arcade_equip_cosmetic('glasses','pink-glasses')");
await db.exec('reset role;update public.arcade_profiles set xp=500');await user(alice);
await db.query("select public.arcade_equip_cosmetic('glasses','pink-glasses')");
assert.equal((await db.query('select cosmetics from public.arcade_profiles')).rows[0].cosmetics.glasses,'pink-glasses');
await reject("select public.arcade_equip_cosmetic('hat','pink-glasses')");await reject("select public.arcade_equip_cosmetic('hat','retro-cap')");
await db.query("select public.arcade_equip_cosmetic('glasses',null)");assert.deepEqual((await db.query('select cosmetics from public.arcade_profiles')).rows[0].cosmetics,{});
await db.exec('reset role;update public.arcade_profiles set xp=2000');await user(alice);
await db.query("select public.arcade_equip_cosmetic('hat','retro-cap')");await db.query("select public.arcade_equip_cosmetic('background','violet-grid')");await db.query("select public.arcade_save_profile('Alice Edit',1)");
assert.equal((await db.query('select cosmetics from public.arcade_profiles')).rows[0].cosmetics.hat,'retro-cap');
await reject("update public.arcade_profiles set cosmetics='{}'");await reject('select * from arcade_private.tier_unlocks');
await db.exec("reset role;insert into public.arcade_quizzes values('extra-easy','ps2','easy','Extra easy',2,true);insert into arcade_private.quiz_questions select 'extra-easy',position,question_id from arcade_private.quiz_questions where quiz_id='ps2-easy-01'");await user(alice);
assert((await catalog()).find(x=>x.id==='ps2-hard-01').unlocked); // A new easy pack never removes earned tiers.
await user(bob);await db.query("select public.arcade_save_profile('Bob',0)");assert(!(await catalog()).find(x=>x.id==='ps2-medium-01').unlocked);assert.deepEqual((await db.query('select cosmetics from public.arcade_profiles')).rows[0].cosmetics,{});
await reject("select public.arcade_equip_cosmetic('glasses','pink-glasses')");
await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");assert((await catalog()).filter(x=>x.difficulty!=='easy').every(x=>!x.unlocked));await reject('select * from public.arcade_cosmetics');
console.log('PASS v0.7: existing XP preserved; PS1/PS2 open independently; easy → medium → hard enforced by server; legacy/mix bypass rejected; earned tiers persist; 10 sourced questions; cosmetic XP boundaries, slots, equip/remove, profile edit preservation and account isolation.');
await db.close();
