-- Upgrade an existing 0.4/0.5 database. Does not reset players, XP or games.
begin;
create table public.arcade_quizzes (
 id text primary key,
 category text not null check(category in ('ps1','ps2')),
 difficulty text not null check(difficulty in ('easy','medium','hard')),
 title text not null check(char_length(title) between 1 and 100),
 sort_order integer not null default 0,
 published boolean not null default false
);
create table arcade_private.quiz_questions (
 quiz_id text not null references public.arcade_quizzes(id) on delete cascade,
 position integer not null check(position between 0 and 4),
 question_id uuid not null references arcade_private.questions(id),
 primary key(quiz_id,position),
 unique(quiz_id,question_id)
);
alter table public.arcade_games add column quiz_id text references public.arcade_quizzes(id);
create index arcade_games_quiz_completion on public.arcade_games(player_id,quiz_id) where finished_at is not null;
alter table public.arcade_quizzes enable row level security;
alter table arcade_private.quiz_questions enable row level security;
revoke all on public.arcade_quizzes from anon,authenticated;
revoke all on arcade_private.quiz_questions from public,anon,authenticated;

-- Stable starter packs from the actual 20 existing questions. Medium stays empty.
insert into public.arcade_quizzes(id,category,difficulty,title,sort_order) values
 ('ps1-easy-01','ps1','easy','Primeros recuerdos · PS1',1),
 ('ps1-hard-01','ps1','hard','Archivo experto · PS1',1),
 ('ps2-easy-01','ps2','easy','Primeros recuerdos · PS2',1),
 ('ps2-hard-01','ps2','hard','Archivo experto · PS2',1);
insert into arcade_private.quiz_questions(quiz_id,position,question_id)
select q.id,(row_number() over(partition by q.id order by bank.prompt,bank.id))::integer-1,bank.id
from public.arcade_quizzes q
cross join lateral (
 select b.id,b.prompt from arcade_private.questions b
 where b.active and b.category=q.category
 and b.difficulty=case when q.difficulty='easy' then 'normal' else 'expert' end
 order by b.prompt,b.id limit 5
) bank;
update public.arcade_quizzes q set published=true
where (select count(*) from arcade_private.quiz_questions x where x.quiz_id=q.id)=5;

create function public.arcade_list_quizzes()
returns jsonb language sql security definer set search_path=''
as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',q.id,'category',q.category,'difficulty',q.difficulty,'title',q.title,'sort_order',q.sort_order,
  'completed',exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.finished_at is not null)
 ) order by q.category,q.difficulty,q.sort_order,q.id),'[]'::jsonb)
 from public.arcade_quizzes q
 where q.published and (
   select count(*) from arcade_private.quiz_questions l
   join arcade_private.questions b on b.id=l.question_id and b.active and b.category=q.category
   where l.quiz_id=q.id
 )=5;
$$;
create function public.arcade_start_quiz(p_quiz_id text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare quiz public.arcade_quizzes; g public.arcade_games; prompts jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 select * into quiz from public.arcade_quizzes where id=p_quiz_id and published for share;
 if not found then raise exception 'Quiz unavailable'; end if;
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
revoke all on function public.arcade_list_quizzes() from public;
revoke all on function public.arcade_start_quiz(text) from public,anon;
grant execute on function public.arcade_list_quizzes() to anon,authenticated;
grant execute on function public.arcade_start_quiz(text) to authenticated;
commit;
select category,difficulty,count(*) as trivias_disponibles from public.arcade_quizzes where published group by category,difficulty order by category,difficulty;
