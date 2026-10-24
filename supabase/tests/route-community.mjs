import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql','upgrade-v09.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values ($1),($2)',[alice,bob]);
async function user(id=alice){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function rpc(name,args=[]){return (await db.query('select to_jsonb(public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')) as data',args)).rows[0].data;}
await user();await rpc('arcade_save_profile',['Alice',2]);await db.exec("reset role;update public.arcade_profiles set xp=1500,cosmetics='{\"glasses\":\"pink-glasses\"}'");
const upgrade=readFileSync(new URL('../upgrade-v14.sql',import.meta.url),'utf8');await db.exec(upgrade);
await user();let p=(await db.query('select * from public.arcade_profiles')).rows[0];assert.equal(p.xp,1500);assert.equal(p.avatar,2);assert.deepEqual(p.cosmetics,{glasses:'pink-glasses'});assert.equal(p.community_visible,false);
const catalog=await rpc('arcade_list_quizzes');assert(catalog.length===6);assert(catalog.every(q=>!('title' in q)));
await db.exec(`reset role;
 insert into public.arcade_quizzes(id,category,difficulty,title,sort_order,published) values ('ps1-easy-00','ps1','easy','Hidden title zero',0,true),('ps1-easy-02','ps1','easy','Hidden title two',1,true);
 insert into arcade_private.quiz_questions select q.id,l.position,l.question_id from public.arcade_quizzes q cross join arcade_private.quiz_questions l where q.id in ('ps1-easy-00','ps1-easy-02') and l.quiz_id='ps1-easy-01';`);
await user();await assert.rejects(()=>rpc('arcade_start_quiz',['ps1-easy-01']),/Quiz out of order/);
let game=await rpc('arcade_start_quiz',['ps1-easy-00']);assert(!('title' in game));assert(game.questions.every(q=>!('ok' in q)));
assert.equal((await rpc('arcade_start_quiz',['ps1-easy-00'])).game_id,game.game_id);
await assert.rejects(()=>rpc('arcade_start_quiz',['ps2-easy-01']),/Finish active/);
async function finish(g,n=5){await db.exec('reset role');const keys=(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[g.game_id])).rows.map((r,i)=>i<n?r.correct_index:(r.correct_index+1)%4);await user();return rpc('arcade_submit_game',[g.game_id,keys]);}
assert.equal((await finish(game,2)).score,0);await assert.rejects(()=>rpc('arcade_start_quiz',['ps1-easy-01']),/Quiz out of order/);
for(const id of ['ps1-easy-00','ps1-easy-01','ps1-easy-02']){
 await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user();game=await rpc('arcade_start_quiz',[id]);await finish(game);
}
assert((await rpc('arcade_list_quizzes')).find(q=>q.id==='ps1-medium-01').unlocked);
assert.equal((await rpc('arcade_community')).total,0);
await user(bob);await rpc('arcade_save_profile',['Bob',1]);await rpc('arcade_set_community_visibility',[true]);
await user();let community=await rpc('arcade_community');assert.equal(community.total,1);assert.equal(community.players[0].nickname,'Bob');assert.equal(community.players[0].is_me,false);
assert.deepEqual(Object.keys(community.players[0]).sort(),['avatar','cosmetics','is_me','level','nickname']);assert(!JSON.stringify(community).includes(bob));
await rpc('arcade_set_community_visibility',[true]);assert.equal((await rpc('arcade_community')).total,2);
await rpc('arcade_set_community_visibility',[false]);assert.equal((await rpc('arcade_community')).total,1);await assert.rejects(()=>rpc('arcade_set_community_visibility',[null]));
await assert.rejects(()=>db.query('update public.arcade_profiles set community_visible=true'));assert.equal((await db.query('select count(*) as n from public.arcade_profiles')).rows[0].n,1);
await assert.rejects(()=>rpc('arcade_equip_cosmetic',['theme','jade-theme']),/locked/i);
await assert.rejects(()=>rpc('arcade_equip_cosmetic',['badge','ocean-theme']));
await db.exec('reset role');await db.query('update public.arcade_profiles set xp=14500 where id=$1',[alice]);await user();
const items=(await db.query('select * from public.arcade_cosmetics')).rows;assert.equal(items.length,31);assert.equal(new Set(items.map(i=>i.slot)).size,7);
for(const slot of ['glasses','hat','background','frame','badge','theme','font']){const item=items.filter(i=>i.slot===slot).at(-1);await rpc('arcade_equip_cosmetic',[slot,item.id]);}
p=(await db.query('select * from public.arcade_profiles')).rows[0];assert.equal(Object.keys(p.cosmetics).length,7);
await rpc('arcade_equip_cosmetic',['frame',null]);assert(!('frame' in (await db.query('select cosmetics from public.arcade_profiles')).rows[0].cosmetics));
await db.exec('reset role');await db.exec(upgrade);await user();assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,14500);assert.equal((await rpc('arcade_community')).total,1);
await db.exec("reset role;set role anon");await db.query("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(()=>rpc('arcade_community'));await assert.rejects(()=>rpc('arcade_set_community_visibility',[true]));
await db.close();console.log('PASS v0.14: fixed cross-tier route with deterministic ties and no title hints; API rejects skipping; active resume and failed retry; 31 cosmetics in seven slots with XP/slot checks; opt-in community exposes only safe fields, own settings and RLS; rerun preserves XP and preferences.');
