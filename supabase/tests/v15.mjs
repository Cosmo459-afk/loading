import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql','upgrade-v09.sql','upgrade-v14.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values ($1),($2)',[alice,bob]);
async function user(id=alice){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function rpc(name,args=[]){return (await db.query('select to_jsonb(public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')) as data',args)).rows[0].data;}
await user();await rpc('arcade_save_profile',['Alice',2]);const legacy=await rpc('arcade_start_quiz',['ps1-easy-01']);
await db.exec("reset role;update public.arcade_profiles set xp=5400 where id='"+alice+"'");
const migration=readFileSync(new URL('../upgrade-v15.sql',import.meta.url),'utf8');await db.exec(migration);
assert.equal((await db.query('select count(*)::int n from public.arcade_quizzes where published')).rows[0].n,96);
const counts=(await db.query('select category,difficulty,count(*)::int n from public.arcade_quizzes where published group by category,difficulty')).rows;assert.equal(counts.length,6);assert(counts.every(q=>q.n===16));
assert.equal((await db.query('select count(*)::int n from arcade_private.quiz_questions where quiz_id like $1',['%v15%'])).rows[0].n,480);
await user();let list=await rpc('arcade_list_quizzes');assert.equal(list.length,97);assert(list.find(q=>q.id==='ps1-easy-01').legacy);assert(list.every(q=>!('title' in q)));assert.equal((await rpc('arcade_start_quiz',['ps1-easy-01'])).game_id,legacy.game_id);
await assert.rejects(()=>rpc('arcade_start_quiz',['ps1-easy-v15-01']),/Finish active/);
await db.exec('reset role');const answers=(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[legacy.game_id])).rows.map(r=>r.correct_index);await user();await rpc('arcade_submit_game',[legacy.game_id,answers]);list=await rpc('arcade_list_quizzes');assert.equal(list.length,96);await assert.rejects(()=>rpc('arcade_start_quiz',['ps1-easy-01']),/unavailable/);
// Preserve already earned cosmetics even though the schedule is farther apart.
await rpc('arcade_equip_cosmetic',['background','deep-space']);assert.equal((await db.query('select cosmetics from public.arcade_profiles')).rows[0].cosmetics.background,'deep-space');
assert.equal((await db.query('select count(*)::int n from public.arcade_coupons')).rows[0].n,0);
await db.exec("reset role;update public.arcade_profiles set xp=7200 where id='"+alice+"'");await db.query('select arcade_private.grant_level_chests(6300,7200,$1)',[legacy.game_id]);
assert.equal((await db.query('select count(*)::int n from public.arcade_chests where level=5')).rows[0].n,0);
await user();let coupon=await rpc('arcade_get_coupon');assert(coupon.code.match(/^LD5-[0-9A-F]{16}$/));assert.equal(coupon.discount_percent,10);assert.equal((await rpc('arcade_get_coupon')).code,coupon.code);
await rpc('arcade_request_coupon_redemption',[coupon.id]);assert.equal((await rpc('arcade_get_coupon')).redeemed_at,null);
await assert.rejects(()=>rpc('arcade_redeem_coupon',[coupon.code,null]),/permission denied/);await assert.rejects(()=>db.query('update public.arcade_coupons set redeemed_at=now()'),/permission denied/);
await user(bob);await rpc('arcade_save_profile',['Bob',1]);assert.equal((await db.query('select count(*)::int n from public.arcade_coupons')).rows[0].n,0);await assert.rejects(()=>rpc('arcade_request_coupon_redemption',[coupon.id]),/unavailable/);await assert.rejects(()=>rpc('arcade_equip_cosmetic',['background','deep-space']),/locked/);
await db.exec('reset role');await user();await db.exec('reset role');await db.query('select arcade_private.grant_level_chests(8100,9000,$1)',[legacy.game_id]);assert.equal((await db.query('select count(*)::int n from public.arcade_chests where level=6')).rows[0].n,1);
let first=await rpc('arcade_redeem_coupon',[coupon.code,'pedido de prueba']);assert.equal(first.already_redeemed,false);let second=await rpc('arcade_redeem_coupon',[coupon.code,'otro']);assert.equal(second.already_redeemed,true);assert.equal(second.redeemed_at,first.redeemed_at);
const before=(await db.query('select xp from public.arcade_profiles where id=$1',[alice])).rows[0].xp;await db.exec(migration);assert.equal((await db.query('select xp from public.arcade_profiles where id=$1',[alice])).rows[0].xp,before);assert.equal((await db.query('select count(*)::int n from public.arcade_coupons')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from public.arcade_quizzes where published')).rows[0].n,96);
await user();await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user();await assert.rejects(()=>rpc('arcade_start_quiz',['ps1-easy-v15-02']),/out of order/);const game=await rpc('arcade_start_quiz',['ps1-easy-v15-01']);assert.equal(game.questions.length,5);assert(game.questions.every(q=>!('correct_index' in q)&&!('source' in q)));
const bank=JSON.parse(readFileSync(new URL('../../content/batches/retro-v15.json',import.meta.url),'utf8'));assert.equal(new Set(bank.quizzes.flatMap(q=>q.questions.map(q=>q.prompt))).size,480);for(const p of bank.quizzes)for(const q of p.questions){assert.equal(new Set(q.choices).size,4);assert(q.source.reference.includes('raw.githubusercontent.com'));assert(q.source.scan>0);assert(q.source.manual_sha256.length===64);}
// Exercise the complete new easy route: progression, tier locks and rewards together.
await user(bob);
for(let i=1;i<=16;i++){
 let route=await rpc('arcade_list_quizzes');assert.equal(route.find(q=>q.id==='ps2-medium-v15-01').unlocked,false);
 await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");await user(bob);
 const attempt=await rpc('arcade_start_quiz',['ps2-easy-v15-'+String(i).padStart(2,'0')]);
 await db.exec('reset role');const keys=(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[attempt.game_id])).rows.map(q=>q.correct_index);await user(bob);
 assert.equal((await rpc('arcade_submit_game',[attempt.game_id,keys])).score,900);
 if(i===8){assert((await rpc('arcade_get_coupon')).id);assert.equal((await db.query('select count(*)::int n from public.arcade_chests where level=5')).rows[0].n,0);}
}
list=await rpc('arcade_list_quizzes');assert.equal(list.find(q=>q.id==='ps2-medium-v15-01').unlocked,true);assert.equal(list.find(q=>q.id==='ps2-hard-v15-01').unlocked,false);
assert.equal((await db.query('select xp from public.arcade_profiles')).rows[0].xp,14400);assert.equal((await db.query('select count(*)::int n from public.arcade_chests')).rows[0].n,7);
const schedule=(await db.query('select required_xp from public.arcade_cosmetics order by required_xp')).rows.map(r=>r.required_xp);assert.deepEqual(schedule,Array.from({length:31},(_,i)=>900+1800*i));
await db.close();console.log('PASS v15: 96/480 source-backed immutable bank, 16 per console/tier, retired active resume, fixed ordering; level5 unique coupon instead of chest and level6 normal; protected ownership and one-use merchant redemption; old cosmetics and XP preserved; rerun idempotent.');
