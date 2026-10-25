-- v25 from v23 or v24: sharing, completion-based route and weekly competition. No reset.
begin;
create or replace function public.arcade_share_profile(p_public_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,
 'level',p.xp/1800+1,'likes',(select count(*) from arcade_private.profile_likes where target=p.id),'perfect_streak',p.perfect_streak,'best_perfect_streak',p.best_perfect_streak,
 'featured_ids',coalesce((select jsonb_agg(f.id order by f.ordinal) from unnest(p.featured) with ordinality f(id,ordinal)
 join public.arcade_owned_cards o on o.player_id=p.id and o.card_id=f.id),'[]'::jsonb)) into result
 from public.arcade_profiles p where p.community_id=p_public_id;
 if result is null then raise exception 'Player unavailable'; end if;
 return result;
end $$;
revoke all on function public.arcade_share_profile(uuid) from public;
grant execute on function public.arcade_share_profile(uuid) to anon,authenticated;
create or replace function arcade_private.refresh_unlocks() returns void
language plpgsql security definer set search_path='' as $$
declare console text; tier text; previous text;
begin
 if auth.uid() is null then return; end if;
 foreach console in array array['ps1','ps2'] loop
  foreach tier in array array['medium','hard'] loop
   previous=case when tier='medium' then 'easy' else 'medium' end;
   if tier='hard' and not exists(select 1 from arcade_private.tier_unlocks where player_id=auth.uid() and category=console and difficulty='medium') then continue; end if;
   if exists(select 1 from arcade_private.available_quizzes where category=console and difficulty=previous)
    and not exists(select 1 from arcade_private.available_quizzes q where q.category=console and q.difficulty=previous
      and not exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.finished_at is not null)) then
    insert into arcade_private.tier_unlocks(player_id,category,difficulty) values(auth.uid(),console,tier) on conflict do nothing;
   end if;
  end loop;
 end loop;
end $$;
create or replace function public.arcade_list_quizzes() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.refresh_unlocks();
 select coalesce(jsonb_agg(jsonb_build_object(
 'legacy',not q.published,'id',q.id,'category',q.category,'difficulty',q.difficulty,'sort_order',q.sort_order,
 'unlocked',q.difficulty='easy' or exists(select 1 from arcade_private.tier_unlocks u where u.player_id=auth.uid() and u.category=q.category and u.difficulty=q.difficulty),
 'in_progress',exists(select 1 from public.arcade_games a where a.player_id=auth.uid() and a.quiz_id=q.id and a.finished_at is null and a.started_at>now()-interval '24 hours'),
 'completed',exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.finished_at is not null)
 ) order by q.category,case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,q.sort_order,q.id),'[]'::jsonb) into result from public.arcade_quizzes q where q.id in (select id from arcade_private.available_quizzes) or exists(select 1 from public.arcade_games a where a.player_id=auth.uid() and a.quiz_id=q.id and a.finished_at is null and a.started_at>now()-interval '24 hours');
 return result;
end $$;
create or replace function public.arcade_start_quiz(p_quiz_id text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare quiz public.arcade_quizzes; g public.arcade_games; prompts jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 select * into quiz from public.arcade_quizzes where id=p_quiz_id and (published or exists(select 1 from public.arcade_games a where a.player_id=auth.uid() and a.quiz_id=p_quiz_id and a.finished_at is null and a.started_at>now()-interval '24 hours')) for share;
 if not found then raise exception 'Quiz unavailable'; end if;
 if exists(select 1 from public.arcade_games where player_id=auth.uid() and quiz_id=p_quiz_id and finished_at is not null) then raise exception 'Quiz already completed'; end if;
 perform arcade_private.refresh_unlocks();
 if quiz.difficulty<>'easy' and not exists(select 1 from arcade_private.tier_unlocks where player_id=auth.uid() and category=quiz.category and difficulty=quiz.difficulty) then raise exception 'Difficulty locked'; end if;
 select * into g from public.arcade_games where player_id=auth.uid() and quiz_id is not null and finished_at is null and started_at>now()-interval '24 hours' order by started_at limit 1;
 if found then
  if g.quiz_id<>p_quiz_id then raise exception 'Finish active quiz first'; end if;
  select jsonb_agg(jsonb_build_object('position',position,'q',prompt,'a',choices) order by position) into prompts from arcade_private.game_questions where game_id=g.id;
  return jsonb_build_object('game_id',g.id,'quiz_id',quiz.id,'category',quiz.category,'difficulty',quiz.difficulty,'questions',prompts);
 end if;
 -- Enforce the same route for everyone, even when calling the API directly.
 if quiz.id<>(select q.id from arcade_private.available_quizzes q
  where q.category=quiz.category and not exists(select 1 from public.arcade_games done where done.player_id=auth.uid() and done.quiz_id=q.id and done.finished_at is not null)
  order by case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,q.sort_order,q.id limit 1) then
  raise exception 'Quiz out of order';
 end if;
 if exists(select 1 from public.arcade_games where player_id=auth.uid() and started_at>now()-interval '1 second') then
  raise exception 'Wait a few seconds before starting another game';
 end if;
 -- Legacy difficulty is retained for old clients; the catalog holds the real tier.
 insert into public.arcade_games(player_id,category,difficulty,quiz_id)
 values(auth.uid(),quiz.category,case when quiz.difficulty='hard' then 'expert' else 'normal' end,quiz.id)
 returning * into g;
 insert into arcade_private.game_questions(game_id,position,question_id,prompt,choices,correct_index,explanation)
 select g.id,l.position,b.id,b.prompt,b.choices,b.correct_index,b.explanation
 from arcade_private.quiz_questions l join arcade_private.questions b on b.id=l.question_id
 where l.quiz_id=quiz.id and b.active and b.category=quiz.category;
 if (select count(*) from arcade_private.game_questions where game_id=g.id)<>5 then
  raise exception 'Quiz unavailable';
 end if;
 select jsonb_agg(jsonb_build_object('position',position,'q',prompt,'a',choices) order by position)
 into prompts from arcade_private.game_questions where game_id=g.id;
 return jsonb_build_object('game_id',g.id,'quiz_id',quiz.id,'category',quiz.category,'difficulty',quiz.difficulty,'questions',prompts);
end $$;
create or replace function public.arcade_submit_game(p_game_id uuid,p_answers integer[])
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare g public.arcade_games; n integer; points integer; review jsonb; approved boolean; before_xp bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select xp into before_xp from public.arcade_profiles where id=auth.uid() for update;
 select * into g from public.arcade_games where id=p_game_id and player_id=auth.uid() for update;
 if not found then raise exception 'Game not found'; end if;
 if g.finished_at is null then
   if now()>g.started_at+interval '24 hours' then raise exception 'Game expired'; end if;
   if p_answers is null or cardinality(p_answers)<>5 or array_ndims(p_answers)<>1 or array_lower(p_answers,1)<>1
     or exists(select 1 from unnest(p_answers) a where a is null or a<0 or a>3) then
     raise exception 'Five answers between zero and three are required';
   end if;
   update arcade_private.game_questions set chosen_index=p_answers[position+1] where game_id=g.id;
   select count(*) into n from arcade_private.game_questions where game_id=g.id and chosen_index=correct_index;
   approved=g.quiz_id is not null;
   if g.quiz_id is not null and exists(select 1 from public.arcade_games where player_id=auth.uid() and quiz_id=g.quiz_id and finished_at is not null and id<>g.id) then
     raise exception 'Quiz already completed';
   end if;
   -- Free random games are practice: no repeatable XP source.
   points=case when approved then 200+n*100+case when n=5 then 200 else 0 end else 0 end;
   update public.arcade_games set correct=n,score=points,passed=approved,finished_at=now() where id=g.id returning * into g;
   update public.arcade_profiles set xp=xp+points,games=games+1 where id=auth.uid();
   perform arcade_private.grant_level_chests(before_xp,before_xp+points,g.id);
 end if;
 -- Retries return the original result without awarding XP twice.
 select jsonb_agg(jsonb_build_object('position',position,'chosen',chosen_index,'ok',correct_index,'why',explanation) order by position)
 into review from arcade_private.game_questions where game_id=g.id and (g.finished_at is not null);
 perform arcade_private.refresh_unlocks();
 return jsonb_build_object('game_id',g.id,'correct',g.correct,'score',g.score,'passed',g.passed,'review',coalesce(review,'[]'::jsonb),'chests_earned',(select count(*) from public.arcade_chests where player_id=auth.uid() and source_game_id=g.id));
end $$;
create table if not exists arcade_private.weekly_challenges(
 id uuid primary key default gen_random_uuid(),title text not null,game text not null,
 status text not null default 'draft' check(status in ('draft','live','closed')),
 starts_at timestamptz,ends_at timestamptz,seconds integer not null default 20 check(seconds between 10 and 60),
 questions jsonb not null,reward_name text not null default 'Ada Wong · Exclusiva semanal',created_at timestamptz not null default now()
);
create unique index if not exists weekly_one_live on arcade_private.weekly_challenges(status) where status='live';
create table if not exists arcade_private.weekly_attempts(
 id uuid primary key default gen_random_uuid(),challenge_id uuid not null references arcade_private.weekly_challenges(id),
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 position integer not null default 0,started_at timestamptz not null default now(),question_started timestamptz not null,deadline timestamptz not null,
 correct integer not null default 0,elapsed_ms bigint not null default 0,finished_at timestamptz,
 answers jsonb not null default '[]',reward_game uuid references public.arcade_games(id),unique(challenge_id,player_id)
);
create index if not exists weekly_ranking on arcade_private.weekly_attempts(challenge_id,correct desc,elapsed_ms,finished_at);
create table if not exists public.arcade_weekly_exclusives(
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 challenge_id uuid not null references arcade_private.weekly_challenges(id),name text not null,edition text not null default '',earned_at timestamptz not null default now(),
 primary key(player_id,challenge_id)
);
alter table public.arcade_weekly_exclusives enable row level security;
drop policy if exists own_exclusives on public.arcade_weekly_exclusives;
create policy own_exclusives on public.arcade_weekly_exclusives for select to authenticated using(player_id=auth.uid());
revoke all on public.arcade_weekly_exclusives from public,anon,authenticated;
grant select on public.arcade_weekly_exclusives to authenticated;
alter table arcade_private.weekly_challenges enable row level security;
alter table arcade_private.weekly_attempts enable row level security;
revoke all on arcade_private.weekly_challenges,arcade_private.weekly_attempts from public,anon,authenticated;
alter table public.arcade_games add column if not exists weekly_id uuid references arcade_private.weekly_challenges(id);
alter table public.arcade_games drop constraint if exists arcade_games_correct_check;
alter table public.arcade_games drop constraint if exists arcade_games_score_check;
alter table public.arcade_games add constraint arcade_games_correct_check check((weekly_id is null and correct between 0 and 5) or (weekly_id is not null and quiz_id is null and correct between 0 and 20));
alter table public.arcade_games add constraint arcade_games_score_check check((weekly_id is null and score between 0 and 900) or (weekly_id is not null and score between 0 and 2000));

-- Award once under the same player -> attempt lock order as every weekly operation.
create or replace function arcade_private.finish_weekly(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a arcade_private.weekly_attempts;c arcade_private.weekly_challenges;before_xp bigint;gid uuid;
begin
 select * into a from arcade_private.weekly_attempts where id=p_id and player_id=auth.uid() for update;
 if not found or a.finished_at is not null then return; end if;
 select * into c from arcade_private.weekly_challenges where id=a.challenge_id;
 select xp into before_xp from public.arcade_profiles where id=a.player_id;
 insert into public.arcade_games(player_id,category,difficulty,weekly_id,started_at,finished_at,correct,score,passed)
 values(a.player_id,'ps2','normal',a.challenge_id,a.started_at,clock_timestamp(),a.correct,a.correct*100,true) returning id into gid;
 update arcade_private.weekly_attempts set finished_at=clock_timestamp(),reward_game=gid where id=a.id;
 update public.arcade_profiles set xp=xp+a.correct*100,games=games+1 where id=a.player_id;
 perform arcade_private.grant_level_chests(before_xp,before_xp+a.correct*100,gid);
 if a.correct=20 then insert into public.arcade_weekly_exclusives(player_id,challenge_id,name,edition) values(a.player_id,c.id,c.reward_name,c.title) on conflict do nothing; end if;
end $$;
revoke all on function arcade_private.finish_weekly(uuid) from public,anon,authenticated;

-- Only the current question is returned. The client never supplies score or elapsed time.
create or replace function public.arcade_weekly_play(p_challenge uuid,p_position integer default null,p_answer integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c arcade_private.weekly_challenges;a arcade_private.weekly_attempts;q jsonb;stamp timestamptz;timed_out boolean;changed boolean=false;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 select * into c from arcade_private.weekly_challenges where id=p_challenge for share;
 if not found or c.status='draft' then raise exception 'Weekly unavailable'; end if;
 stamp=clock_timestamp();
 select * into a from arcade_private.weekly_attempts where challenge_id=c.id and player_id=auth.uid() for update;
 if not found then
  if c.status<>'live' or stamp<c.starts_at or stamp>=c.ends_at then raise exception 'Weekly closed'; end if;
  insert into arcade_private.weekly_attempts(challenge_id,player_id,question_started,deadline) values(c.id,auth.uid(),stamp,least(stamp+make_interval(secs=>c.seconds),c.ends_at)) returning * into a;
 end if;
 if a.finished_at is null then
  -- Catch up expired slots after a disconnect; going offline never pauses the clock.
  while a.position<20 and (stamp>=a.deadline or c.status<>'live' or stamp>=c.ends_at) loop
   a.answers:=a.answers||jsonb_build_array(jsonb_build_object('position',a.position,'answer',null,'correct',false,'ms',c.seconds*1000));
   a.elapsed_ms:=a.elapsed_ms+c.seconds*1000;a.position:=a.position+1;a.question_started:=a.deadline;a.deadline:=least(a.deadline+make_interval(secs=>c.seconds),c.ends_at);changed:=true;
  end loop;
  -- Stale/repeated submissions cannot answer the next question.
  if a.position<20 and not changed and p_position is not null and p_position=a.position then
   if p_answer is not null and (p_answer<0 or p_answer>3) then raise exception 'Invalid answer'; end if;
   if p_answer is null then -- A timer poll before expiry must not skip a live question.
    null;
   else
    q:=c.questions->a.position;
    a.correct:=a.correct+case when p_answer=(q->>'correct_index')::integer then 1 else 0 end;
    a.elapsed_ms:=a.elapsed_ms+greatest(0,floor(extract(epoch from (stamp-a.question_started))*1000)::bigint);
    a.answers:=a.answers||jsonb_build_array(jsonb_build_object('position',a.position,'answer',p_answer,'correct',p_answer=(q->>'correct_index')::integer,'ms',greatest(0,floor(extract(epoch from (stamp-a.question_started))*1000)::bigint)));
    a.position:=a.position+1;a.question_started:=stamp;a.deadline:=least(stamp+make_interval(secs=>c.seconds),c.ends_at);
   end if;
  end if;
  update arcade_private.weekly_attempts set position=a.position,question_started=a.question_started,deadline=a.deadline,correct=a.correct,elapsed_ms=a.elapsed_ms,answers=a.answers where id=a.id;
  if a.position>=20 then perform arcade_private.finish_weekly(a.id);select * into a from arcade_private.weekly_attempts where id=a.id;end if;
 end if;
 q:=c.questions->a.position;
 return jsonb_build_object('challenge_id',c.id,'title',c.title,'position',a.position,'total',20,'server_now',clock_timestamp(),'deadline',a.deadline,'finished',a.finished_at is not null,
 'question',case when a.finished_at is null then jsonb_build_object('prompt',q->>'prompt','choices',q->'choices') else null end,
 'correct',case when a.finished_at is not null then a.correct else null end,'xp',case when a.finished_at is not null then a.correct*100 else null end,
 'elapsed_ms',case when a.finished_at is not null then a.elapsed_ms else null end,'exclusive',a.finished_at is not null and a.correct=20);
end $$;

create or replace function public.arcade_weekly_hub(p_challenge uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c arcade_private.weekly_challenges;board jsonb;own jsonb;attempt jsonb;
begin
 select * into c from arcade_private.weekly_challenges where status<>'draft' and (p_challenge is null or id=p_challenge) order by (status='live') desc,starts_at desc limit 1;
 if not found then return jsonb_build_object('challenge',null,'top',jsonb_build_array());end if;
 with ranking as(select a.player_id,a.correct,a.elapsed_ms,a.finished_at,rank()over(order by a.correct desc,a.elapsed_ms,a.finished_at) as place from arcade_private.weekly_attempts a where a.challenge_id=c.id and a.finished_at is not null)
 select coalesce(jsonb_agg(item order by place,public_id),'[]'::jsonb) into board from(select r.place,p.community_id as public_id,jsonb_build_object('place',r.place,'public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,'correct',r.correct,'points',r.correct*100,'elapsed_ms',r.elapsed_ms,'is_me',r.player_id=auth.uid()) as item from ranking r join public.arcade_profiles p on p.id=r.player_id order by r.place,p.community_id limit 10) rows;
 with ranking as(select a.*,rank()over(order by a.correct desc,a.elapsed_ms,a.finished_at) as place from arcade_private.weekly_attempts a where a.challenge_id=c.id and a.finished_at is not null)
 select jsonb_build_object('place',place,'correct',correct,'points',correct*100,'elapsed_ms',elapsed_ms) into own from ranking where player_id=auth.uid();
 select jsonb_build_object('finished',finished_at is not null,'position',position) into attempt from arcade_private.weekly_attempts where challenge_id=c.id and player_id=auth.uid();
 return jsonb_build_object('challenge',jsonb_build_object('id',c.id,'title',c.title,'game',c.game,'status',case when c.status='live' and now()>=c.ends_at then 'closed' else c.status end,'starts_at',c.starts_at,'ends_at',c.ends_at,'seconds',c.seconds,'reward_name',c.reward_name),'top',board,'mine',own,'attempt',attempt,'server_now',clock_timestamp());
end $$;

create or replace function public.arcade_admin_weekly_list() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform arcade_private.require_admin();
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'game',c.game,'status',c.status,'starts_at',c.starts_at,'ends_at',c.ends_at,'seconds',c.seconds,'reward_name',c.reward_name,'questions',c.questions,'attempts',(select count(*) from arcade_private.weekly_attempts where challenge_id=c.id)) order by c.created_at desc) from arcade_private.weekly_challenges c),'[]'::jsonb);
end $$;
create or replace function public.arcade_admin_weekly_save(p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare identifier uuid;entry jsonb;questions jsonb;p integer;
begin
 perform arcade_private.require_admin();
 if char_length(p_payload->>'title') not between 3 and 100 or char_length(p_payload->>'game') not between 3 and 100 then raise exception 'Invalid title';end if;
 questions:=p_payload->'questions';
 if jsonb_typeof(questions)<>'array' or jsonb_array_length(questions)<>20 then raise exception 'Twenty questions required';end if;
 if (select count(distinct lower(trim(x->>'prompt'))) from jsonb_array_elements(questions) x)<>20 then raise exception 'Twenty distinct questions required';end if;
 for entry in select * from jsonb_array_elements(questions) loop
  if coalesce(char_length(entry->>'prompt'),0) not between 10 and 500 or jsonb_typeof(entry->'choices')<>'array' or jsonb_array_length(entry->'choices')<>4 or coalesce((entry->>'correct_index')::int,-1) not between 0 and 3 or coalesce(char_length(entry->'source'->>'reference'),0)<8 or coalesce(char_length(entry->'source'->>'evidence'),0)<5 then raise exception 'Invalid question/source';end if;
  if (select count(distinct trim(x)) from jsonb_array_elements_text(entry->'choices') x where char_length(trim(x)) between 1 and 200)<>4 then raise exception 'Four distinct choices required';end if;
 end loop;
 identifier:=coalesce((p_payload->>'id')::uuid,gen_random_uuid());
 perform 1 from arcade_private.weekly_challenges where id=identifier for update;
 if found and exists(select 1 from arcade_private.weekly_challenges where id=identifier and status<>'draft') then raise exception 'Weekly immutable';end if;
 insert into arcade_private.weekly_challenges(id,title,game,questions,seconds,reward_name) values(identifier,p_payload->>'title',p_payload->>'game',questions,coalesce((p_payload->>'seconds')::int,20),coalesce(nullif(p_payload->>'reward_name',''),'Ada Wong · Exclusiva semanal'))
 on conflict(id) do update set title=excluded.title,game=excluded.game,questions=excluded.questions,seconds=excluded.seconds,reward_name=excluded.reward_name;
 return identifier;
end $$;
create or replace function public.arcade_admin_weekly_activate(p_id uuid,p_start timestamptz,p_end timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare c arcade_private.weekly_challenges;
begin
 perform arcade_private.require_admin();
 -- A global advisory lock serializes two simultaneous activation requests.
 perform pg_advisory_xact_lock(250025);
 select * into c from arcade_private.weekly_challenges where id=p_id for update;
 if not found or c.status<>'draft' then raise exception 'Weekly immutable';end if;
 if p_start is null or p_end is null or p_end<=p_start or p_end<=now() then raise exception 'Invalid dates';end if;
 update arcade_private.weekly_challenges set status='closed' where status='live' and ends_at<=now();
 if exists(select 1 from arcade_private.weekly_challenges where status='live') then raise exception 'Close current weekly first';end if;
 update arcade_private.weekly_challenges set status='live',starts_at=p_start,ends_at=p_end where id=p_id;
 insert into arcade_private.admin_audit(actor_id,action,entity) values(auth.uid(),'weekly_activated',p_id::text);
end $$;
create or replace function public.arcade_admin_weekly_close(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform arcade_private.require_admin();update arcade_private.weekly_challenges set status='closed',ends_at=least(ends_at,clock_timestamp()) where id=p_id and status='live';
 insert into arcade_private.admin_audit(actor_id,action,entity) values(auth.uid(),'weekly_closed',p_id::text);
end $$;
revoke all on function public.arcade_weekly_play(uuid,integer,integer),public.arcade_weekly_hub(uuid),public.arcade_admin_weekly_list(),public.arcade_admin_weekly_save(jsonb),public.arcade_admin_weekly_activate(uuid,timestamptz,timestamptz),public.arcade_admin_weekly_close(uuid) from public,anon;
grant execute on function public.arcade_weekly_play(uuid,integer,integer),public.arcade_weekly_hub(uuid),public.arcade_admin_weekly_list(),public.arcade_admin_weekly_save(jsonb),public.arcade_admin_weekly_activate(uuid,timestamptz,timestamptz),public.arcade_admin_weekly_close(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
