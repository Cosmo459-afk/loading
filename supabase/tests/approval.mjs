import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values ($1),($2)',[alice,bob]);
async function user(id=alice){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function rpc(name,args=[],params=''){return (await db.query(`select to_jsonb(public.${name}(${params||args.map((_,i)=>'$'+(i+1)).join(',')})) as data`,args)).rows[0].data;}
async function reject(name,args=[]){await assert.rejects(()=>rpc(name,args));}
await user();await rpc('arcade_save_profile',['Alice',0]);
// Existing completion at zero points must survive upgrade without removing earned tiers.
let old=await rpc('arcade_start_quiz',['ps1-easy-01']);await db.exec('reset role');await db.query('update public.arcade_games set finished_at=now(),correct=0,score=0 where id=$1',[old.game_id]);await db.exec('update public.arcade_profiles set xp=900');
await db.exec(readFileSync(new URL('../upgrade-v08.sql',import.meta.url),'utf8'));await user();
assert.equal((await db.query('select xp,rewards_seen_xp from public.arcade_profiles')).rows[0].xp,900);
assert((await rpc('arcade_list_quizzes')).find(q=>q.id==='ps1-easy-01').completed);
await reject('arcade_start_quiz',['ps1-easy-01']);
await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user();
let g=await rpc('arcade_start_quiz',['ps2-easy-01']);assert(!JSON.stringify(g).includes('correct_index'));
assert.equal((await rpc('arcade_start_quiz',['ps2-easy-01'])).game_id,g.game_id);
assert((await rpc('arcade_list_quizzes')).find(q=>q.id==='ps2-easy-01').in_progress);
await reject('arcade_start_quiz',['ps1-medium-01']);
async function answers(game,correctCount){await db.exec('reset role');const all=(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[game.game_id])).rows.map(q=>q.correct_index);await user();return all.map((a,i)=>i<correctCount?a:(a+1)%4);}
let failed=await rpc('arcade_submit_game',[g.game_id,await answers(g,2)]);
assert.equal(failed.passed,false);assert.equal(failed.score,0);assert.deepEqual(failed.review,[]);
assert(!(await rpc('arcade_list_quizzes')).find(q=>q.id==='ps2-easy-01').completed);
assert(!(await rpc('arcade_list_quizzes')).find(q=>q.id==='ps2-medium-01').unlocked);
assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,900);
await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user();g=await rpc('arcade_start_quiz',['ps2-easy-01']);
let passed=await rpc('arcade_submit_game',[g.game_id,await answers(g,3)]);assert.equal(passed.passed,true);assert.equal(passed.score,500);assert.equal(passed.review.length,5);
assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,1400);
assert.deepEqual(await rpc('arcade_submit_game',[g.game_id,[0,0,0,0,0]]),passed);
assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,1400);
await reject('arcade_start_quiz',['ps2-easy-01']);
assert((await rpc('arcade_list_quizzes')).find(q=>q.id==='ps2-medium-01').unlocked);
assert(!(await rpc('arcade_list_quizzes')).find(q=>q.id==='ps2-hard-01').unlocked);
let ack=await rpc('arcade_ack_rewards',[999999]);assert.equal(ack.rewards_seen_xp,1400);ack=await rpc('arcade_ack_rewards',[0]);assert.equal(ack.rewards_seen_xp,1400);
await user(bob);await rpc('arcade_save_profile',['Bob',1]);assert(!(await rpc('arcade_list_quizzes')).find(q=>q.id==='ps2-easy-01').completed);await reject('arcade_submit_game',[g.game_id,[0,0,0,0,0]]);
await user();await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user();let free=await rpc('arcade_start_game',['ps2','normal']);let result=await rpc('arcade_submit_game',[free.game_id,await answers(free,5)]);assert.equal(result.score,0);
console.log('PASS v0.8: historical progress preserved; failed attempt hides solutions and awards no XP; 3/5 approval gives 500 XP exactly once; completed quiz blocked; active attempt resumed; independent tiers; no practice XP farming; notification acknowledgement bounded and isolated.');await db.close();
