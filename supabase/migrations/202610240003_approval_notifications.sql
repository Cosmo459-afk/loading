-- Apply once after v0.7. Existing XP, completions and earned tiers are preserved.
begin;
alter table public.arcade_games add column passed boolean not null default false;
update public.arcade_games set passed=true where finished_at is not null and quiz_id is not null;
alter table public.arcade_profiles add column rewards_seen_xp bigint not null default 0;
update public.arcade_profiles set rewards_seen_xp=xp;
alter table arcade_private.questions add column source jsonb;
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
      and not exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.passed)) then
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
 'id',q.id,'category',q.category,'difficulty',q.difficulty,'title',q.title,'sort_order',q.sort_order,
 'unlocked',q.difficulty='easy' or exists(select 1 from arcade_private.tier_unlocks u where u.player_id=auth.uid() and u.category=q.category and u.difficulty=q.difficulty),
 'in_progress',exists(select 1 from public.arcade_games a where a.player_id=auth.uid() and a.quiz_id=q.id and a.finished_at is null and a.started_at>now()-interval '24 hours'),
 'completed',exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.passed)
 ) order by q.category,q.difficulty,q.sort_order,q.id),'[]'::jsonb) into result from arcade_private.available_quizzes q;
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
 select * into quiz from public.arcade_quizzes where id=p_quiz_id and published for share;
 if not found then raise exception 'Quiz unavailable'; end if;
 if exists(select 1 from public.arcade_games where player_id=auth.uid() and quiz_id=p_quiz_id and passed) then raise exception 'Quiz already completed'; end if;
 perform arcade_private.refresh_unlocks();
 if quiz.difficulty<>'easy' and not exists(select 1 from arcade_private.tier_unlocks where player_id=auth.uid() and category=quiz.category and difficulty=quiz.difficulty) then raise exception 'Difficulty locked'; end if;
 select * into g from public.arcade_games where player_id=auth.uid() and quiz_id is not null and finished_at is null and started_at>now()-interval '24 hours' order by started_at limit 1;
 if found then
  if g.quiz_id<>p_quiz_id then raise exception 'Finish active quiz first'; end if;
  select jsonb_agg(jsonb_build_object('position',position,'q',prompt,'a',choices) order by position) into prompts from arcade_private.game_questions where game_id=g.id;
  return jsonb_build_object('game_id',g.id,'quiz_id',quiz.id,'title',quiz.title,'category',quiz.category,'difficulty',quiz.difficulty,'questions',prompts);
 end if;
 if exists(select 1 from public.arcade_games where player_id=auth.uid() and started_at>now()-interval '10 seconds') then
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
 return jsonb_build_object('game_id',g.id,'quiz_id',quiz.id,'title',quiz.title,'category',quiz.category,'difficulty',quiz.difficulty,'questions',prompts);
end $$;
create or replace function public.arcade_submit_game(p_game_id uuid,p_answers integer[])
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare g public.arcade_games; n integer; points integer; review jsonb; approved boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
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
   approved=g.quiz_id is not null and n>=3;
   if g.quiz_id is not null and exists(select 1 from public.arcade_games where player_id=auth.uid() and quiz_id=g.quiz_id and passed and id<>g.id) then
     raise exception 'Quiz already completed';
   end if;
   -- Free random games are practice: no repeatable XP source.
   points=case when approved then 200+n*100+case when n=5 then 200 else 0 end else 0 end;
   update public.arcade_games set correct=n,score=points,passed=approved,finished_at=now() where id=g.id returning * into g;
   update public.arcade_profiles set xp=xp+points,games=games+1 where id=auth.uid();
 end if;
 -- Retries return the original result without awarding XP twice.
 select jsonb_agg(jsonb_build_object('position',position,'chosen',chosen_index,'ok',correct_index,'why',explanation) order by position)
 into review from arcade_private.game_questions where game_id=g.id and (g.passed or g.quiz_id is null);
 perform arcade_private.refresh_unlocks();
 return jsonb_build_object('game_id',g.id,'correct',g.correct,'score',g.score,'passed',g.passed,'review',coalesce(review,'[]'::jsonb));
end $$;
create function public.arcade_ack_rewards(p_xp bigint) returns public.arcade_profiles
language plpgsql security definer set search_path='' as $$
declare p public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.arcade_profiles set rewards_seen_xp=greatest(rewards_seen_xp,least(xp,greatest(0,p_xp))) where id=auth.uid() returning * into p;
 return p;
end $$;
revoke all on function public.arcade_ack_rewards(bigint) from public,anon;
grant execute on function public.arcade_ack_rewards(bigint) to authenticated;
commit;
select category,difficulty,count(*) as trivias_disponibles from public.arcade_quizzes where published group by category,difficulty order by category,difficulty;
