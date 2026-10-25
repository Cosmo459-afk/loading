-- From v19. Server-authorized administration, no reset. Run grant-admin.sql afterwards.
begin;
create table if not exists arcade_private.admin_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now()
);
create table if not exists arcade_private.admin_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,
 action text not null,entity text,created_at timestamptz not null default now()
);
create table if not exists arcade_private.admin_operations (
 actor_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,
 payload_hash text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
revoke all on arcade_private.admin_accounts,arcade_private.admin_audit,arcade_private.admin_operations from public,anon,authenticated;
alter table arcade_private.forum_reports add column if not exists resolved_at timestamptz;

create or replace function public.arcade_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from arcade_private.admin_accounts a join auth.users u on u.id=a.user_id
 where a.user_id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))
$$;
revoke all on function public.arcade_is_admin() from public,anon;
grant execute on function public.arcade_is_admin() to authenticated;
create or replace function arcade_private.require_admin() returns void
language plpgsql security definer set search_path='' as $$
begin if not public.arcade_is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if; end $$;
revoke all on function arcade_private.require_admin() from public,anon,authenticated;

create or replace function public.arcade_admin_overview() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform arcade_private.require_admin();
 return jsonb_build_object('players',(select count(*) from public.arcade_profiles),
 'published_quizzes',(select count(*) from public.arcade_quizzes where published),
 'draft_quizzes',(select count(*) from public.arcade_quizzes where not published),
 'open_reports',(select count(distinct post_id) from arcade_private.forum_reports where resolved_at is null),
 'available_coupons',(select count(*) from public.arcade_coupons where redeemed_at is null),
 'redeemed_coupons',(select count(*) from public.arcade_coupons where redeemed_at is not null));
end $$;
create or replace function public.arcade_admin_reports() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.require_admin();
 select coalesce(jsonb_agg(item order by last_report desc),'[]'::jsonb) into result from (
 select max(r.created_at) as last_report,jsonb_build_object('post_id',m.id,'thread_id',t.id,'title',t.title,'body',m.body,
 'author',p.nickname,'deleted',m.deleted,'post_hidden',m.hidden,'thread_hidden',t.hidden,'locked',t.locked,'reports',count(*)) as item
 from arcade_private.forum_reports r join arcade_private.forum_posts m on m.id=r.post_id
 join arcade_private.forum_threads t on t.id=m.thread_id join public.arcade_profiles p on p.id=m.author_id
 where r.resolved_at is null group by m.id,t.id,p.nickname order by max(r.created_at) desc limit 50) rows;
 return result;
end $$;
create or replace function public.arcade_admin_forum_action(p_thread uuid,p_post uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform arcade_private.require_admin();
 if p_action in ('hide_post','restore_post','resolve_report') then
  if not exists(select 1 from arcade_private.forum_posts where id=p_post) then raise exception 'Content unavailable'; end if;
  if p_action<>'resolve_report' then update arcade_private.forum_posts set hidden=p_action='hide_post' where id=p_post; end if;
  if p_action in ('hide_post','resolve_report') then update arcade_private.forum_reports set resolved_at=coalesce(resolved_at,now()) where post_id=p_post; end if;
 elsif p_action in ('hide_topic','restore_topic','lock_topic','unlock_topic') then
  if not exists(select 1 from arcade_private.forum_threads where id=p_thread) then raise exception 'Content unavailable'; end if;
  if p_action in ('hide_topic','restore_topic') then update arcade_private.forum_threads set hidden=p_action='hide_topic' where id=p_thread;
  else update arcade_private.forum_threads set locked=p_action='lock_topic' where id=p_thread; end if;
  if p_action='hide_topic' then update arcade_private.forum_reports set resolved_at=coalesce(resolved_at,now()) where post_id in(select id from arcade_private.forum_posts where thread_id=p_thread); end if;
 else raise exception 'Invalid moderation action'; end if;
 insert into arcade_private.admin_audit(actor_id,action,entity) values(auth.uid(),p_action,coalesce(p_post,p_thread)::text);
end $$;
create or replace function public.arcade_admin_forum_topics(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.require_admin();
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Invalid page'; end if;
 select jsonb_build_object('offset',p_offset,'has_more',(select count(*) from arcade_private.forum_threads)>p_offset::bigint+25,
 'topics',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'hidden',t.hidden,'locked',t.locked,'author',p.nickname) order by t.updated_at desc,t.id)
 from (select * from arcade_private.forum_threads order by updated_at desc,id limit 25 offset p_offset) t join public.arcade_profiles p on p.id=t.author_id),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.arcade_admin_forum_posts(p_thread uuid,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;title text;
begin
 perform arcade_private.require_admin();
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Invalid page'; end if;
 select t.title into title from arcade_private.forum_threads t where id=p_thread;
 if not found then raise exception 'Content unavailable'; end if;
 select jsonb_build_object('title',title,'has_more',(select count(*) from arcade_private.forum_posts where thread_id=p_thread)>p_offset::bigint+30,
 'posts',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,'author',p.nickname,'hidden',m.hidden,'deleted',m.deleted) order by m.created_at,m.id)
 from (select * from arcade_private.forum_posts where thread_id=p_thread order by created_at,id limit 30 offset p_offset) m join public.arcade_profiles p on p.id=m.author_id),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.arcade_admin_forum_posts(uuid,integer) from public,anon;
grant execute on function public.arcade_admin_forum_posts(uuid,integer) to authenticated;
create or replace function public.arcade_admin_coupons(p_code text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.require_admin();
 if char_length(coalesce(p_code,''))>80 then raise exception 'Invalid coupon code'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('code',c.code,'nickname',p.nickname,'issued_at',c.issued_at,'requested_at',c.requested_at,'redeemed_at',c.redeemed_at,'note',c.redemption_note,'discount_percent',c.discount_percent) order by c.issued_at desc),'[]'::jsonb) into result
 from (select * from public.arcade_coupons where nullif(trim(p_code),'') is null or code=upper(trim(p_code)) order by issued_at desc limit 50) c join public.arcade_profiles p on p.id=c.player_id;
 return result;
end $$;
create or replace function public.arcade_admin_redeem_coupon(p_code text,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.require_admin();
 result=public.arcade_redeem_coupon(p_code,p_note);
 if not (result->>'already_redeemed')::boolean then insert into arcade_private.admin_audit(actor_id,action,entity) values(auth.uid(),'coupon_redeemed',upper(trim(p_code))); end if;
 return result;
end $$;
create or replace function public.arcade_admin_quizzes(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.require_admin();
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Invalid page'; end if;
 select jsonb_build_object('offset',p_offset,'has_more',(select count(*) from public.arcade_quizzes)>p_offset::bigint+25,
 'quizzes',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'category',q.category,'difficulty',q.difficulty,'sort_order',q.sort_order,'published',q.published,
 'attempts',(select count(*) from public.arcade_games where quiz_id=q.id)) order by q.category,case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,q.sort_order,q.id)
 from (select * from public.arcade_quizzes order by category,case difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,sort_order,id limit 25 offset p_offset) q),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.arcade_admin_quiz_detail(p_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q public.arcade_quizzes;questions jsonb;
begin
 perform arcade_private.require_admin();
 select * into q from public.arcade_quizzes where id=p_id;
 if not found then raise exception 'Quiz unavailable'; end if;
 select jsonb_agg(jsonb_build_object('prompt',b.prompt,'choices',b.choices,'correct_index',b.correct_index,'explanation',b.explanation,'source',b.source) order by l.position) into questions
 from arcade_private.quiz_questions l join arcade_private.questions b on b.id=l.question_id where l.quiz_id=p_id;
 return to_jsonb(q)||jsonb_build_object('questions',coalesce(questions,'[]'::jsonb),'attempts',(select count(*) from public.arcade_games where quiz_id=p_id));
end $$;

-- Whole batch is validated before any write. A source is required; a person must review its factual accuracy.
create or replace function arcade_private.validate_quiz(q jsonb) returns void
language plpgsql set search_path='' as $$
declare b jsonb;option jsonb;
begin
 if jsonb_typeof(q) is distinct from 'object' or jsonb_typeof(q->'id') is distinct from 'string' or q->>'id' is null or (q->>'id')!~'^[-a-z0-9]{3,80}$' then raise exception 'Invalid quiz ID'; end if;
 if q->>'category' is null or q->>'category' not in ('ps1','ps2') or q->>'difficulty' is null or q->>'difficulty' not in ('easy','medium','hard') then raise exception 'Invalid console or tier'; end if;
 if jsonb_typeof(q->'title') is distinct from 'string' or q->>'title' is null or char_length(trim(q->>'title')) not between 3 and 100 then raise exception 'Invalid quiz title'; end if;
 if jsonb_typeof(q->'sort_order') is distinct from 'number' or q->>'sort_order' is null or (q->>'sort_order')!~'^[0-9]{1,7}$' or (q->>'sort_order')::integer not between 1 and 1000000 then raise exception 'Invalid quiz order'; end if;
 if jsonb_typeof(q->'questions') is distinct from 'array' then raise exception 'Five questions required'; end if;
 if jsonb_array_length(q->'questions')<>5 then raise exception 'Five questions required'; end if;
 for b in select value from jsonb_array_elements(q->'questions') loop
  if jsonb_typeof(b) is distinct from 'object' or jsonb_typeof(b->'prompt') is distinct from 'string' or b->>'prompt' is null or char_length(trim(b->>'prompt')) not between 10 and 500 then raise exception 'Invalid question'; end if;
  if jsonb_typeof(b->'choices') is distinct from 'array' then raise exception 'Four different options required'; end if;
  if jsonb_array_length(b->'choices')<>4 then raise exception 'Four different options required'; end if;
  for option in select value from jsonb_array_elements(b->'choices') loop
   if jsonb_typeof(option)<>'string' or char_length(trim(option#>>'{}')) not between 1 and 200 then raise exception 'Invalid choice'; end if;
  end loop;
  if (select count(distinct lower(trim(value))) from jsonb_array_elements_text(b->'choices'))<>4 then raise exception 'Four different options required'; end if;
  if jsonb_typeof(b->'correct_index') is distinct from 'number' or b->>'correct_index' is null or (b->>'correct_index')!~'^[0-3]$' then raise exception 'Correct answer required'; end if;
  if jsonb_typeof(b->'explanation') is distinct from 'string' or b->>'explanation' is null or char_length(trim(b->>'explanation')) not between 10 and 1500 then raise exception 'Explanation required'; end if;
  if jsonb_typeof(b->'source') is distinct from 'object' or jsonb_typeof(b->'source'->'reference') is distinct from 'string' or jsonb_typeof(b->'source'->'evidence') is distinct from 'string' or b->'source'->>'reference' is null or b->'source'->>'evidence' is null
   or char_length(trim(b->'source'->>'reference')) not between 1 and 2048 or char_length(trim(b->'source'->>'evidence')) not between 1 and 3000 then raise exception 'Source and evidence required'; end if;
 end loop;
 if (select count(distinct lower(trim(value->>'prompt'))) from jsonb_array_elements(q->'questions'))<>5 then raise exception 'Duplicate question'; end if;
end $$;
revoke all on function arcade_private.validate_quiz(jsonb) from public,anon,authenticated;

create or replace function public.arcade_admin_import_quizzes(p_batch jsonb,p_request uuid,p_replace_draft boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb;b jsonb;question_id uuid;i integer;prior arcade_private.admin_operations;result jsonb;ids text[];old_ids uuid[];
begin
 perform arcade_private.require_admin();
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':admin',0));
 if p_request is null or p_replace_draft is null then raise exception 'Request ID required'; end if;
 if jsonb_typeof(p_batch) is distinct from 'object' or jsonb_typeof(p_batch->'quizzes') is distinct from 'array' then raise exception 'Quiz batch required'; end if;
 if jsonb_array_length(p_batch->'quizzes') not between 1 and 100 or octet_length(p_batch::text)>2000000 then raise exception 'Batch too large'; end if;
 select * into prior from arcade_private.admin_operations where actor_id=auth.uid() and request_id=p_request;
 if found then
  if prior.payload_hash<>md5(p_batch::text||p_replace_draft::text) then raise exception 'Request ID reused with different content'; end if;
  return prior.result;
 end if;
 for q in select value from jsonb_array_elements(p_batch->'quizzes') loop perform arcade_private.validate_quiz(q); end loop;
 if p_replace_draft and jsonb_array_length(p_batch->'quizzes')<>1 then raise exception 'Edit one draft at a time'; end if;
 if (select count(distinct lower(trim(bdoc->>'prompt'))) from jsonb_array_elements(p_batch->'quizzes') q(qdoc) cross join lateral jsonb_array_elements(qdoc->'questions') b(bdoc))<>jsonb_array_length(p_batch->'quizzes')*5 then raise exception 'Duplicate question in batch'; end if;

 if (select count(distinct value->>'id') from jsonb_array_elements(p_batch->'quizzes'))<>jsonb_array_length(p_batch->'quizzes') then raise exception 'Duplicate quiz ID'; end if;
 perform id from public.arcade_quizzes where id in(select value->>'id' from jsonb_array_elements(p_batch->'quizzes')) order by id for update;
 for q in select value from jsonb_array_elements(p_batch->'quizzes') loop
  if exists(select 1 from public.arcade_quizzes where id=q->>'id') and
   (not p_replace_draft or exists(select 1 from public.arcade_quizzes where id=q->>'id' and published) or exists(select 1 from public.arcade_games where quiz_id=q->>'id')) then raise exception 'Quiz exists or is immutable: %',q->>'id'; end if;
 end loop;
 for q in select value from jsonb_array_elements(p_batch->'quizzes') loop
  select array_agg(l.question_id) into old_ids from arcade_private.quiz_questions l where l.quiz_id=q->>'id';
  delete from arcade_private.quiz_questions where quiz_id=q->>'id';
  delete from arcade_private.questions b where b.id=any(old_ids) and not exists(select 1 from arcade_private.quiz_questions l where l.question_id=b.id) and not exists(select 1 from arcade_private.game_questions g where g.question_id=b.id);
  insert into public.arcade_quizzes(id,category,difficulty,title,sort_order,published) values(q->>'id',q->>'category',q->>'difficulty',trim(q->>'title'),(q->>'sort_order')::integer,false)
  on conflict(id) do update set category=excluded.category,difficulty=excluded.difficulty,title=excluded.title,sort_order=excluded.sort_order;
  i=0;
  for b in select value from jsonb_array_elements(q->'questions') loop
   question_id=gen_random_uuid();
   insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation,source)
   values(question_id,q->>'category',case when q->>'difficulty'='hard' then 'expert' else 'normal' end,trim(b->>'prompt'),b->'choices',(b->>'correct_index')::integer,b->>'explanation',b->'source');
   insert into arcade_private.quiz_questions(quiz_id,position,question_id) values(q->>'id',i,question_id);i=i+1;
  end loop;
  insert into arcade_private.admin_audit(actor_id,action,entity) values(auth.uid(),'quiz_draft_saved',q->>'id');
 end loop;
 select array_agg(value->>'id') into ids from jsonb_array_elements(p_batch->'quizzes');
 result=jsonb_build_object('saved',cardinality(ids),'ids',to_jsonb(ids),'published',false);
 insert into arcade_private.admin_operations(actor_id,request_id,payload_hash,result) values(auth.uid(),p_request,md5(p_batch::text||p_replace_draft::text),result);
 return result;
end $$;
create or replace function public.arcade_admin_publish_quiz(p_id text,p_published boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform arcade_private.require_admin();
 if p_published is null then raise exception 'Choose publication state'; end if;
 perform id from public.arcade_quizzes where id=p_id for update;
 if not found then raise exception 'Quiz unavailable'; end if;
 if p_published then perform arcade_private.validate_quiz(public.arcade_admin_quiz_detail(p_id)); end if;
 if p_published and (select count(*) from arcade_private.quiz_questions l join arcade_private.questions b on b.id=l.question_id where l.quiz_id=p_id and b.active)<>5 then raise exception 'Five active questions required'; end if;
 update public.arcade_quizzes set published=p_published where id=p_id;
 insert into arcade_private.admin_audit(actor_id,action,entity) values(auth.uid(),case when p_published then 'quiz_published' else 'quiz_retired' end,p_id);
end $$;

create or replace function public.arcade_admin_next_order(p_category text,p_difficulty text) returns integer
language plpgsql security definer set search_path='' as $$
begin
 perform arcade_private.require_admin();
 if p_category is null or p_category not in ('ps1','ps2') or p_difficulty is null or p_difficulty not in ('easy','medium','hard') then raise exception 'Invalid console or tier'; end if;
 return coalesce((select max(sort_order)+1 from public.arcade_quizzes where category=p_category and difficulty=p_difficulty),1);
end $$;
revoke all on function public.arcade_admin_next_order(text,text) from public,anon;
grant execute on function public.arcade_admin_next_order(text,text) to authenticated;
revoke all on function public.arcade_admin_overview(),public.arcade_admin_reports(),public.arcade_admin_forum_action(uuid,uuid,text),public.arcade_admin_forum_topics(integer),public.arcade_admin_coupons(text),public.arcade_admin_redeem_coupon(text,text),public.arcade_admin_quizzes(integer),public.arcade_admin_quiz_detail(text),public.arcade_admin_import_quizzes(jsonb,uuid,boolean),public.arcade_admin_publish_quiz(text,boolean) from public,anon;
grant execute on function public.arcade_admin_overview(),public.arcade_admin_reports(),public.arcade_admin_forum_action(uuid,uuid,text),public.arcade_admin_forum_topics(integer),public.arcade_admin_coupons(text),public.arcade_admin_redeem_coupon(text,text),public.arcade_admin_quizzes(integer),public.arcade_admin_quiz_detail(text),public.arcade_admin_import_quizzes(jsonb,uuid,boolean),public.arcade_admin_publish_quiz(text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
select 'Administración instalada. Habilitar la cuenta del dueño con grant-admin.sql.' as update;
