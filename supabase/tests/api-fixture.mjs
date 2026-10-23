// Local-only integration fixture. Never deploy: this simulates Auth, not JWT verification.
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import http from 'node:http';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
await db.exec(readFileSync(new URL('../setup.sql',import.meta.url),'utf8'));
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values ($1),($2)',[alice,bob]);
let queue=Promise.resolve(),failSubmit=false,failProfile=false,otpRequests=[];
function session(uid){
 const now=Math.floor(Date.now()/1000);
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const user={id:uid,aud:'authenticated',role:'authenticated',email:uid===alice?'alice@example.invalid':'bob@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
 return {access_token:encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,role:'authenticated',aud:'authenticated',iat:now,exp:now+3600})+'.fixture',refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:now+3600,user};
}
const funcs={arcade_save_profile:['p_nickname','p_avatar','p_photo'],arcade_feature_cards:['p_ids'],arcade_start_game:['p_category','p_difficulty'],arcade_submit_game:['p_game_id','p_answers']};
async function handle(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');
 res.setHeader('Content-Type','application/json');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(req.method==='OPTIONS'){send(200,{});return;}
 let text='';for await(const chunk of req)text+=chunk;
 const body=text?JSON.parse(text):{};
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/_test/reset'){await db.exec('reset role; truncate auth.users cascade');await db.query('insert into auth.users values ($1),($2)',[alice,bob]);failSubmit=false;failProfile=false;otpRequests=[];send(200,{});return;}
 if(url.pathname==='/_test/session'){send(200,session(url.searchParams.get('user')==='bob'?bob:alice));return;}
 if(url.pathname==='/_test/control'){failSubmit=body.failSubmit??failSubmit;failProfile=body.failProfile??failProfile;send(200,{otpRequests});return;}
 if(url.pathname==='/auth/v1/otp'){otpRequests.push(body);send(200,{});return;}
 if(url.pathname==='/auth/v1/token'){send(200,session(alice));return;}
 if(url.pathname==='/auth/v1/logout'){send(200,{});return;}
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 let uid=null;try{uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;}catch{}
 if(![alice,bob].includes(uid)){send(401,{message:'Authentication required'});return;}
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');
 try{
  if(url.pathname==='/rest/v1/arcade_profiles'){
   if(failProfile){failProfile=false;send(503,{message:'Network unavailable'});return;}
   const {rows}=await db.query('select * from public.arcade_profiles');send(200,rows);return;
  }
  if(url.pathname==='/rest/v1/arcade_cards'){send(200,(await db.query('select * from public.arcade_cards')).rows);return;}
  if(url.pathname==='/rest/v1/arcade_games'){send(200,(await db.query('select * from public.arcade_games order by started_at desc limit 20')).rows);return;}
  const name=url.pathname.split('/rpc/')[1];
  if(funcs[name]){
   const args=funcs[name].map(x=>body[x]??null);
   const query='select to_jsonb(public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+')) as data';
   const {rows}=await db.query(query,args);
   // Deliberately fail AFTER committing: exercises idempotent network retries.
   if(name==='arcade_submit_game'&&failSubmit){failSubmit=false;send(503,{message:'Network unavailable'});return;}
   send(200,rows[0].data);return;
  }
  send(404,{message:'Not found'});
 }catch(e){send(400,{code:e.code,message:e.message});}
}
http.createServer((req,res)=>{queue=queue.then(()=>handle(req,res)).catch(e=>{res.statusCode=500;res.end(JSON.stringify({message:e.message}));});}).listen(8082,'127.0.0.1',()=>console.log('Local PostgreSQL/Auth fixture on 8082'));
