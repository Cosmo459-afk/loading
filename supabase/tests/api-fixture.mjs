// Local-only integration fixture. Never deploy: this simulates Auth, not JWT verification.
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import http from 'node:http';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,phone_confirmed_at timestamptz);create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,primary key(user_id,provider));create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
await db.exec(readFileSync(new URL('../setup.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v06.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v07.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v08.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v09.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v14.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v15-schema.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v16.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v18.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v19.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v20.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../upgrade-v21.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v23.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v24.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v25.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v27.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v41.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v45.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v46.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v48.sql',import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222',temp='33333333-3333-4333-8333-333333333333';
await db.query('insert into auth.users values ($1),($2)',[alice,bob]);await db.query('update auth.users set email_confirmed_at=now() where id=any($1::uuid[])',[[alice,bob]]);
let queue=Promise.resolve(),failSubmit=false,failChest=false,failProfile=false,failForum=false,failLike=false,failThreadRead=false,otpRequests=[],linked=false,pendingEmail=null,external={email:true,phone:false,google:false,facebook:false},oauthPending=null,oauthLinkError=null;
function session(uid){
 const now=Math.floor(Date.now()/1000);
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const user={id:uid,aud:'authenticated',role:'authenticated',email:uid===temp?(linked?pendingEmail:null):(uid===alice?'alice@example.invalid':'bob@example.invalid'),is_anonymous:uid===temp&&!linked,email_confirmed_at:uid===temp&&!linked?null:new Date().toISOString(),app_metadata:{provider:oauthPending||'email'},user_metadata:{},created_at:new Date().toISOString()};
 return {access_token:encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,role:'authenticated',aud:'authenticated',iat:now,exp:now+3600})+'.fixture',refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:now+3600,user};
}
const funcs={arcade_weekly_access:[],arcade_admin_stats:['p_days'],arcade_weekly_hub:['p_challenge'],arcade_weekly_play:['p_challenge','p_position','p_answer'],arcade_admin_weekly_list:[],arcade_admin_weekly_save:['p_payload'],arcade_admin_weekly_activate:['p_id','p_start','p_end'],arcade_admin_weekly_close:['p_id'],arcade_share_profile:['p_public_id'],arcade_forum_conversation:['p_thread','p_offset'],arcade_set_post_like:['p_post','p_liked'],arcade_forum_feed:['p_scope','p_author','p_category','p_offset'],arcade_forum_locate:['p_thread','p_post'],arcade_admin_forum_posts:['p_thread','p_offset'],arcade_is_admin:[],arcade_admin_overview:[],arcade_admin_reports:[],arcade_admin_forum_action:['p_thread','p_post','p_action'],arcade_admin_forum_topics:['p_offset'],arcade_admin_coupons:['p_code'],arcade_admin_redeem_coupon:['p_code','p_note'],arcade_admin_quizzes:['p_offset'],arcade_admin_quiz_detail:['p_id'],arcade_admin_import_quizzes:['p_batch','p_request','p_replace_draft'],arcade_admin_publish_quiz:['p_id','p_published'],arcade_admin_next_order:['p_category','p_difficulty'],arcade_set_profile_like:['p_public_id','p_liked'],arcade_forum_list:['p_category','p_offset'],arcade_forum_thread:['p_thread','p_offset'],arcade_forum_publish:['p_thread','p_category','p_title','p_body','p_request'],arcade_forum_remove:['p_post'],arcade_forum_report:['p_post'],arcade_list_players:['p_offset'],arcade_visit_player:['p_public_id'],arcade_get_coupon:[],arcade_request_coupon_redemption:['p_coupon_id'],arcade_community:[],arcade_set_community_visibility:['p_visible'],arcade_open_chest:['p_chest_id'],arcade_ack_rewards:['p_xp'],arcade_equip_cosmetic:['p_slot','p_item'],arcade_list_quizzes:[],arcade_start_quiz:['p_quiz_id'],arcade_save_profile:['p_nickname','p_avatar','p_photo'],arcade_feature_cards:['p_ids'],arcade_start_game:['p_category','p_difficulty'],arcade_submit_game:['p_game_id','p_answers']};
async function handle(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');
 res.setHeader('Content-Type','application/json');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(req.method==='OPTIONS'){send(200,{});return;}
 let text='';for await(const chunk of req)text+=chunk;
 const body=text?JSON.parse(text):{};
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/_test/admin-enable'){await db.exec('reset role');await db.query("update auth.users set email='owner@example.invalid',email_confirmed_at=case when $1 then null else now() end,is_anonymous=$2 where id=$3",[body.unverified===true,body.anonymous===true,alice]);if(body.revoke)await db.query('delete from arcade_private.admin_accounts where user_id=$1',[alice]);else await db.query('insert into arcade_private.admin_accounts(user_id) values($1) on conflict do nothing',[alice]);send(200,{});return;}
 if(url.pathname==='/_test/reset'){await db.exec(`reset role; truncate auth.users cascade;delete from arcade_private.weekly_challenges; delete from arcade_private.quiz_questions where quiz_id not in ('ps1-easy-01','ps1-medium-01','ps1-hard-01','ps2-easy-01','ps2-medium-01','ps2-hard-01'); delete from public.arcade_quizzes where id not in ('ps1-easy-01','ps1-medium-01','ps1-hard-01','ps2-easy-01','ps2-medium-01','ps2-hard-01'); delete from arcade_private.questions b where not exists(select 1 from arcade_private.quiz_questions l where l.question_id=b.id); update public.arcade_quizzes set published=true where id in ('ps1-easy-01','ps1-medium-01','ps1-hard-01','ps2-easy-01','ps2-medium-01','ps2-hard-01')`);await db.query('insert into auth.users values ($1),($2)',[alice,bob]);await db.query('update auth.users set email_confirmed_at=now() where id=any($1::uuid[])',[[alice,bob]]);failSubmit=false;failChest=false;failProfile=false;failForum=false;failLike=false;failThreadRead=false;otpRequests=[];linked=false;pendingEmail=null;external={email:true,phone:false,google:false,facebook:false};oauthPending=null;oauthLinkError=null;send(200,{});return;}
 if(url.pathname==='/_test/seed-v15'){await db.exec('reset role');await db.exec(readFileSync(new URL('../upgrade-v15.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v16.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v18.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v19.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v20.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v21.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v23.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v24.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v25.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v27.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v41.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v45.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v46.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../upgrade-v48.sql',import.meta.url),'utf8'));send(200,{});return;}
 if(url.pathname==='/_test/redeem-coupon'){await db.exec('reset role');send(200,(await db.query('select public.arcade_redeem_coupon($1,null) as data',[body.code])).rows[0].data);return;}
 if(url.pathname==='/_test/answers'){await db.exec('reset role');send(200,(await db.query('select correct_index from arcade_private.game_questions where game_id=$1 order by position',[body.gameId])).rows.map(q=>q.correct_index));return;}
 if(url.pathname==='/_test/session'){send(200,session(url.searchParams.get('user')==='temp'?temp:url.searchParams.get('user')==='bob'?bob:alice));return;}
 if(url.pathname==='/_test/control'){if(body.providers)external={...external,...body.providers};if('oauthLinkError' in body)oauthLinkError=body.oauthLinkError;if(body.expireGame){await db.exec('reset role');await db.query("update public.arcade_games set started_at=now()-interval '25 hours' where id=$1",[body.expireGame]);}if(body.expireWeekly){await db.exec("reset role;update arcade_private.weekly_attempts set question_started=clock_timestamp()-interval '21 seconds',deadline=clock_timestamp()-interval '1 second' where finished_at is null");}if(body.expireAllWeekly){await db.exec("reset role;update arcade_private.weekly_attempts set deadline=clock_timestamp()-interval '1 hour' where finished_at is null");}if(body.ageForum)await db.exec("reset role;update arcade_private.forum_posts set created_at=created_at-interval '2 minutes';update arcade_private.forum_threads set created_at=created_at-interval '2 minutes'");failThreadRead=body.failThreadRead??failThreadRead;failForum=body.failForum??failForum;failLike=body.failLike??failLike;if(body.ageStarts)await db.exec("reset role;update public.arcade_games set started_at=now()-interval '1 minute'");if(body.grantXP){await db.exec('reset role');await db.query('update public.arcade_profiles set xp=$1 where id=$2',[body.grantXP,alice]);}failSubmit=body.failSubmit??failSubmit;failChest=body.failChest??failChest;failProfile=body.failProfile??failProfile;send(200,{otpRequests});return;}
 if(url.pathname==='/auth/v1/settings'){send(200,{external});return;}
 if(url.pathname==='/auth/v1/authorize'&&url.searchParams.get('fixture_link')){res.writeHead(302,{Location:'http://127.0.0.1:8085/dist/index.html?code=link-temp'});res.end();return;}
 if(url.pathname==='/auth/v1/otp'){otpRequests.push(body);send(200,{});return;}
 if(url.pathname==='/auth/v1/token'){if(body.auth_code==='link-temp'){linked=true;await db.exec('reset role');await db.query('update auth.users set is_anonymous=false,email=$1,email_confirmed_at=case when $1::text is null then null else now() end where id=$2',[pendingEmail,temp]);if(oauthPending)await db.query('insert into auth.identities(user_id,provider) values($1,$2) on conflict do nothing',[temp,oauthPending]);send(200,session(temp));}else send(200,session(alice));return;}
 if(url.pathname==='/auth/v1/signup'){await db.exec('reset role');await db.query('insert into auth.users(id,is_anonymous) values ($1,true) on conflict do nothing',[temp]);send(200,session(temp));return;}
 if(url.pathname==='/auth/v1/logout'){send(200,{});return;}
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 let uid=null;try{uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;}catch{}
 if(url.pathname==='/rest/v1/rpc/arcade_weekly_public_hub'){await db.exec("reset role;set role anon");await db.query("select set_config('request.jwt.claim.sub','',false)");send(200,(await db.query('select public.arcade_weekly_public_hub() as data')).rows[0].data);return;}
 if(url.pathname==='/rest/v1/rpc/arcade_share_profile'){await db.exec("reset role;set role anon");await db.query("select set_config('request.jwt.claim.sub','',false)");try{send(200,(await db.query('select public.arcade_share_profile($1::uuid) as data',[body.p_public_id])).rows[0].data);}catch(e){send(400,{message:e.message,code:e.code});}return;}
 if(![alice,bob,temp].includes(uid)){if(url.pathname==='/rest/v1/rpc/arcade_list_quizzes'){await db.exec("reset role; set role anon");await db.query("select set_config('request.jwt.claim.sub','',false)");send(200,(await db.query('select public.arcade_list_quizzes() as data')).rows[0].data);return;}send(401,{message:'Authentication required'});return;}
 if(url.pathname==='/auth/v1/user/identities/authorize'){if(oauthLinkError){send(422,{code:oauthLinkError,message:oauthLinkError});return;}oauthPending=url.searchParams.get('provider');send(200,{url:'https://epnflypuxcfeexaqwlba.supabase.co/auth/v1/authorize?fixture_link=1&provider='+oauthPending});return;}
 if(url.pathname==='/auth/v1/user'){if(req.method==='PUT')pendingEmail=body.email;const user=session(uid).user;if(pendingEmail&&!linked)user.new_email=pendingEmail;send(200,user);return;}
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');
 try{
  if(url.pathname==='/rest/v1/arcade_profiles'){
   if(failProfile){failProfile=false;send(503,{message:'Network unavailable'});return;}
   const {rows}=await db.query('select * from public.arcade_profiles');send(200,rows);return;
  }
  if(url.pathname==='/rest/v1/arcade_weekly_exclusives'){send(200,(await db.query('select * from public.arcade_weekly_exclusives')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_owned_cosmetics'){send(200,(await db.query('select * from public.arcade_owned_cosmetics')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_owned_cards'){send(200,(await db.query('select * from public.arcade_owned_cards')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_chests'){send(200,(await db.query('select * from public.arcade_chests order by level desc')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_cosmetics'){send(200,(await db.query('select * from public.arcade_cosmetics')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_cards'){send(200,(await db.query('select * from public.arcade_cards')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_games'){send(200,(await db.query('select * from public.arcade_games order by started_at desc limit 20')).rows);return;}
  const name=url.pathname.split('/rpc/')[1];
  if(funcs[name]){
   if(['arcade_forum_thread','arcade_forum_conversation'].includes(name)&&failThreadRead){failThreadRead=false;send(503,{message:'Network unavailable'});return;}
   const args=funcs[name].map(x=>body[x]??null);
   const query='select to_jsonb(public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')) as data';
   const {rows}=await db.query(query,args);
   // Deliberately fail AFTER committing: exercises idempotent network retries.
   if(name==='arcade_forum_publish'&&failForum){failForum=false;send(503,{message:'Network unavailable'});return;}
   if(['arcade_set_profile_like','arcade_set_post_like'].includes(name)&&failLike){failLike=false;send(503,{message:'Network unavailable'});return;}
   if(name==='arcade_open_chest'&&failChest){failChest=false;send(503,{message:'Network unavailable'});return;}
   if(name==='arcade_submit_game'&&failSubmit){failSubmit=false;send(503,{message:'Network unavailable'});return;}
   send(200,rows[0].data);return;
  }
  send(404,{message:'Not found'});
 }catch(e){send(400,{code:e.code,message:e.message});}
}
http.createServer((req,res)=>{queue=queue.then(()=>handle(req,res)).catch(e=>{res.statusCode=500;res.end(JSON.stringify({message:e.message}));});}).listen(8082,'127.0.0.1',()=>console.log('Local PostgreSQL/Auth fixture on 8082'));
