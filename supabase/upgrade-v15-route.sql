create or replace function public.arcade_list_quizzes() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.refresh_unlocks();
 select coalesce(jsonb_agg(jsonb_build_object(
 'legacy',not q.published,'id',q.id,'category',q.category,'difficulty',q.difficulty,'sort_order',q.sort_order,
 'unlocked',q.difficulty='easy' or exists(select 1 from arcade_private.tier_unlocks u where u.player_id=auth.uid() and u.category=q.category and u.difficulty=q.difficulty),
 'in_progress',exists(select 1 from public.arcade_games a where a.player_id=auth.uid() and a.quiz_id=q.id and a.finished_at is null and a.started_at>now()-interval '24 hours'),
 'completed',exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.passed)
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
 if exists(select 1 from public.arcade_games where player_id=auth.uid() and quiz_id=p_quiz_id and passed) then raise exception 'Quiz already completed'; end if;
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
  where q.category=quiz.category and not exists(select 1 from public.arcade_games done where done.player_id=auth.uid() and done.quiz_id=q.id and done.passed)
  order by case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,q.sort_order,q.id limit 1) then
  raise exception 'Quiz out of order';
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
 return jsonb_build_object('game_id',g.id,'quiz_id',quiz.id,'category',quiz.category,'difficulty',quiz.difficulty,'questions',prompts);
end $$;
