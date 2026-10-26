import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const f of ['setup.sql','upgrade-v06.sql','upgrade-v07.sql','upgrade-v08.sql','upgrade-v09.sql','upgrade-v14.sql','upgrade-v15-schema.sql','upgrade-v16.sql','upgrade-v18.sql','upgrade-v19.sql','upgrade-v20.sql','upgrade-v21.sql','upgrade-v23.sql','upgrade-v25.sql','upgrade-v27.sql'])await db.exec(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const ids=Array.from({length:5},(_,i)=>'00000000-0000-4000-8000-00000000000'+(i+1));
for(const id of ids)await db.query('insert into auth.users(id) values($1)',[id]);
async function user(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function save(name,avatar=0){return (await db.query('select to_jsonb(public.arcade_save_profile($1,$2,null)) as p',[name,avatar])).rows[0].p;}
for(let i=0;i<3;i++){await user(ids[i]);await save(i===0?'Owner':'Pepito',i);}
await db.exec('reset role');await db.query('insert into arcade_private.admin_accounts(user_id) values($1)',[ids[1]]);
const migration=readFileSync(new URL('../upgrade-v41.sql',import.meta.url),'utf8');
await assert.rejects(()=>db.exec(migration),/administrator/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from public.arcade_profiles')).rows[0].n,3);
await db.query('delete from arcade_private.admin_accounts where user_id=$1',[ids[1]]);await db.query('insert into arcade_private.admin_accounts(user_id) values($1)',[ids[0]]);await db.query('update public.arcade_profiles set xp=4321,games=8 where id=$1',[ids[0]]);
await user(ids[3]);await save('Duplicate');await user(ids[4]);await save('duplicate');await db.exec('reset role');await assert.rejects(()=>db.exec(migration),/Other duplicate/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from public.arcade_profiles')).rows[0].n,5);await db.query('delete from public.arcade_profiles where id=any($1::uuid[])',[[ids[3],ids[4]]]);
await db.exec(migration);assert.equal((await db.query('select count(*)::int n from public.arcade_profiles')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,5);assert.equal((await db.query('select xp from public.arcade_profiles where id=$1',[ids[0]])).rows[0].xp,4321);await db.exec(migration);
await user(ids[3]);let p=await save('  Cool   Player  ',2);assert.equal(p.nickname,'Cool Player');await assert.rejects(()=>save('Different',3),/cannot be changed/);p=await save('Cool Player',3);assert.equal(p.avatar,3);assert.equal(p.nickname,'Cool Player');
await user(ids[4]);await assert.rejects(()=>save(' cOoL\tplayer ',0),/already in use/);await assert.rejects(()=>save('a'),/2 to 20/);p=await save('Other Player',0);assert.equal(p.nickname,'Other Player');
await db.exec('reset role');await assert.rejects(()=>db.query('update public.arcade_profiles set nickname=$1 where id=$2',['Renamed',ids[3]]),/cannot be changed/);await assert.rejects(()=>db.query('insert into public.arcade_profiles(id,nickname,avatar) values($1,$2,0)',[ids[1],' COOL PLAYER ']),/duplicate key/);
await db.exec('set role anon');await assert.rejects(()=>db.query("select public.arcade_save_profile('Nope',0,null)"),/permission denied/);
await db.close();console.log('PASS v41 SQL: guarded two-Pepito cleanup, admin protection, other progress preserved, rerun, normalized unique names, immutable names even via SQL, avatar-only edits and anonymous denial.');
