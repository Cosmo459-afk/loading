-- Apply once AFTER upgrade-v06.sql. Preserves players, XP, games and collections.
begin;
create table arcade_private.tier_unlocks (
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 category text not null check(category in ('ps1','ps2')),
 difficulty text not null check(difficulty in ('medium','hard')),
 unlocked_at timestamptz not null default now(),
 primary key(player_id,category,difficulty)
);
alter table arcade_private.tier_unlocks enable row level security;
revoke all on arcade_private.tier_unlocks from public,anon,authenticated;
create view arcade_private.available_quizzes as
 select q.* from public.arcade_quizzes q where q.published and
 (select count(*) from arcade_private.quiz_questions l join arcade_private.questions b
  on b.id=l.question_id and b.active and b.category=q.category where l.quiz_id=q.id)=5;
revoke all on arcade_private.available_quizzes from public,anon,authenticated;
create function arcade_private.refresh_unlocks() returns void
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
revoke all on function arcade_private.refresh_unlocks() from public,anon,authenticated;
-- Preserve tiers already earned by v0.6 players before this update.
insert into arcade_private.tier_unlocks(player_id,category,difficulty)
select p.id,console,'medium' from public.arcade_profiles p cross join (values('ps1'),('ps2')) c(console)
where exists(select 1 from arcade_private.available_quizzes where category=console and difficulty='easy')
and not exists(select 1 from arcade_private.available_quizzes q where q.category=console and q.difficulty='easy'
 and not exists(select 1 from public.arcade_games g where g.player_id=p.id and g.quiz_id=q.id and g.finished_at is not null));
insert into arcade_private.tier_unlocks(player_id,category,difficulty)
select u.player_id,u.category,'hard' from arcade_private.tier_unlocks u where u.difficulty='medium'
and exists(select 1 from arcade_private.available_quizzes where category=u.category and difficulty='medium')
and not exists(select 1 from arcade_private.available_quizzes q where q.category=u.category and q.difficulty='medium'
 and not exists(select 1 from public.arcade_games g where g.player_id=u.player_id and g.quiz_id=q.id and g.finished_at is not null));

create or replace function public.arcade_list_quizzes() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.refresh_unlocks();
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',q.id,'category',q.category,'difficulty',q.difficulty,'title',q.title,'sort_order',q.sort_order,
 'unlocked',q.difficulty='easy' or exists(select 1 from arcade_private.tier_unlocks u where u.player_id=auth.uid() and u.category=q.category and u.difficulty=q.difficulty),
 'completed',exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.finished_at is not null)
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
 perform arcade_private.refresh_unlocks();
 if quiz.difficulty<>'easy' and not exists(select 1 from arcade_private.tier_unlocks where player_id=auth.uid() and category=quiz.category and difficulty=quiz.difficulty) then raise exception 'Difficulty locked'; end if;
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
create or replace function public.arcade_start_game(p_category text,p_difficulty text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare g public.arcade_games; prompts jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform arcade_private.refresh_unlocks();
 if p_difficulty='expert' and (select count(*) from arcade_private.tier_unlocks where player_id=auth.uid() and difficulty='hard' and (p_category='mix' or category=p_category)) < (case when p_category='mix' then 2 else 1 end) then raise exception 'Difficulty locked'; end if;
 -- Lock the player to serialize concurrent starts and enforce a basic rate limit.
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if exists(select 1 from public.arcade_games where player_id=auth.uid() and started_at>now()-interval '10 seconds') then
   raise exception 'Wait a few seconds before starting another game';
 end if;
 insert into public.arcade_games(player_id,category,difficulty)
 values(auth.uid(),p_category,p_difficulty) returning * into g;
 insert into arcade_private.game_questions(game_id,position,question_id,prompt,choices,correct_index,explanation)
 select g.id,(row_number() over())::integer-1,q.id,q.prompt,q.choices,q.correct_index,q.explanation
 from (select * from arcade_private.questions where active and difficulty=p_difficulty
       and (p_category='mix' or category=p_category) order by random() limit 5) q;
 if (select count(*) from arcade_private.game_questions where game_id=g.id)<>5 then
   raise exception 'Not enough active questions for this category';
 end if;
 select jsonb_agg(jsonb_build_object('position',position,'q',prompt,'a',choices) order by position)
 into prompts from arcade_private.game_questions where game_id=g.id;
 return jsonb_build_object('game_id',g.id,'questions',prompts);
end $$;

create or replace function public.arcade_submit_game(p_game_id uuid,p_answers integer[])
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare g public.arcade_games; n integer; points integer; review jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
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
   points=n*100+case when n=5 then 200 else 0 end;
   update public.arcade_games set correct=n,score=points,finished_at=now() where id=g.id returning * into g;
   update public.arcade_profiles set xp=xp+points,games=games+1 where id=auth.uid();
 end if;
 -- Retries return the original result without awarding XP twice.
 select jsonb_agg(jsonb_build_object('position',position,'chosen',chosen_index,'ok',correct_index,'why',explanation) order by position)
 into review from arcade_private.game_questions where game_id=g.id;
 perform arcade_private.refresh_unlocks();
 return jsonb_build_object('game_id',g.id,'correct',g.correct,'score',g.score,'review',review);
end $$;


create table public.arcade_cosmetics (
 id text primary key,
 slot text not null check(slot in ('glasses','hat','background')),
 name text not null,
 required_xp integer not null check(required_xp>=0)
);
alter table public.arcade_cosmetics enable row level security;
create policy cosmetic_catalog on public.arcade_cosmetics for select to authenticated using(true);
revoke all on public.arcade_cosmetics from anon,authenticated;
grant select on public.arcade_cosmetics to authenticated;
insert into public.arcade_cosmetics values
 ('pink-glasses','glasses','Gafas neón',500),('blue-glasses','glasses','Gafas hielo',1500),
 ('retro-cap','hat','Gorra arcade',2000),('gold-crown','hat','Corona del arcade',5000),
 ('violet-grid','background','Fondo violeta',1000),('night-sky','background','Fondo noche estrellada',3500);
alter table public.arcade_profiles add column cosmetics jsonb not null default '{}' check(jsonb_typeof(cosmetics)='object');
create function public.arcade_equip_cosmetic(p_slot text,p_item text default null)
returns public.arcade_profiles language plpgsql security definer set search_path='' as $$
declare player public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_slot not in ('glasses','hat','background') or p_slot is null then raise exception 'Invalid cosmetic slot'; end if;
 select * into player from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_item is not null and not exists(select 1 from public.arcade_cosmetics where id=p_item and slot=p_slot and required_xp<=player.xp) then raise exception 'Cosmetic locked or invalid'; end if;
 update public.arcade_profiles set cosmetics=case when p_item is null then cosmetics-p_slot else jsonb_set(cosmetics,array[p_slot],to_jsonb(p_item),true) end
 where id=auth.uid() returning * into player;
 return player;
end $$;
revoke all on function public.arcade_equip_cosmetic(text,text) from public,anon;
grant execute on function public.arcade_equip_cosmetic(text,text) to authenticated;

-- Ten sourced developer questions, one medium pack per console.
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('633ba30a-ad42-5a66-89be-42caed06af3e','ps1','normal','¿Qué estudio desarrolló Crash Bandicoot para PlayStation 1?','["Naughty Dog", "Capcom", "Namco", "Square"]'::jsonb,0,'Crash Bandicoot fue desarrollado por Naughty Dog.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('c0a964d6-cf1d-5a3f-9242-a087065dbd0b','ps1','normal','¿Qué estudio desarrolló Final Fantasy VII para PlayStation 1?','["Capcom", "Square", "Naughty Dog", "Namco"]'::jsonb,1,'Final Fantasy VII fue desarrollado por Square.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('b93f20dd-6b2b-50f7-8293-ae87cf2708a0','ps1','normal','¿Qué estudio desarrolló Spyro the Dragon para PlayStation 1?','["Capcom", "Naughty Dog", "Insomniac Games", "Namco"]'::jsonb,2,'Spyro the Dragon fue desarrollado por Insomniac Games.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('865e398e-2c36-5908-8301-f8c380bad4ee','ps1','normal','¿Qué estudio desarrolló Tekken 3 para PlayStation 1?','["Capcom", "Naughty Dog", "Square", "Namco"]'::jsonb,3,'Tekken 3 fue desarrollado por Namco.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('bea793c2-c3ae-5319-bc0e-fb4fb812a090','ps1','normal','¿Qué estudio desarrolló Tomb Raider para PlayStation 1?','["Core Design", "Capcom", "Naughty Dog", "Namco"]'::jsonb,0,'Tomb Raider fue desarrollado por Core Design.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('5b87b490-c04d-5ebf-9b2f-b1f8122d84db','ps2','normal','¿Qué estudio desarrolló Devil May Cry para PlayStation 2?','["Naughty Dog", "Capcom", "Namco", "Square"]'::jsonb,1,'Devil May Cry fue desarrollado por Capcom.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('e011aa3a-a4fa-5e8d-8b3f-bd43cb570afa','ps2','normal','¿Qué estudio desarrolló God of War para PlayStation 2?','["Capcom", "Naughty Dog", "Santa Monica Studio", "Namco"]'::jsonb,2,'God of War fue desarrollado por Santa Monica Studio.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('21561b8f-6d2d-5f02-902e-9a9e1e6d0786','ps2','normal','¿Qué estudio desarrolló Okami para PlayStation 2?','["Capcom", "Naughty Dog", "Namco", "Clover Studio"]'::jsonb,3,'Okami fue desarrollado por Clover Studio.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('ebe0fd75-230f-55d1-84ff-d97e2eff8604','ps2','normal','¿Qué estudio desarrolló Ratchet & Clank para PlayStation 2?','["Insomniac Games", "Capcom", "Naughty Dog", "Namco"]'::jsonb,0,'Ratchet & Clank fue desarrollado por Insomniac Games.');
insert into arcade_private.questions(id,category,difficulty,prompt,choices,correct_index,explanation) values('0a99315f-0ef8-5d8c-8296-71eb9dc7b747','ps2','normal','¿Qué estudio desarrolló Sly Cooper and the Thievius Raccoonus para PlayStation 2?','["Capcom", "Sucker Punch Productions", "Naughty Dog", "Namco"]'::jsonb,1,'Sly Cooper and the Thievius Raccoonus fue desarrollado por Sucker Punch Productions.');
insert into public.arcade_quizzes values ('ps1-medium-01','ps1','medium','Detrás del juego · PS1',1,false);
insert into arcade_private.quiz_questions values('ps1-medium-01',0,'633ba30a-ad42-5a66-89be-42caed06af3e');
insert into arcade_private.quiz_questions values('ps1-medium-01',1,'c0a964d6-cf1d-5a3f-9242-a087065dbd0b');
insert into arcade_private.quiz_questions values('ps1-medium-01',2,'b93f20dd-6b2b-50f7-8293-ae87cf2708a0');
insert into arcade_private.quiz_questions values('ps1-medium-01',3,'865e398e-2c36-5908-8301-f8c380bad4ee');
insert into arcade_private.quiz_questions values('ps1-medium-01',4,'bea793c2-c3ae-5319-bc0e-fb4fb812a090');
update public.arcade_quizzes set published=true where id='ps1-medium-01';
insert into public.arcade_quizzes values ('ps2-medium-01','ps2','medium','Detrás del juego · PS2',1,false);
insert into arcade_private.quiz_questions values('ps2-medium-01',0,'5b87b490-c04d-5ebf-9b2f-b1f8122d84db');
insert into arcade_private.quiz_questions values('ps2-medium-01',1,'e011aa3a-a4fa-5e8d-8b3f-bd43cb570afa');
insert into arcade_private.quiz_questions values('ps2-medium-01',2,'21561b8f-6d2d-5f02-902e-9a9e1e6d0786');
insert into arcade_private.quiz_questions values('ps2-medium-01',3,'ebe0fd75-230f-55d1-84ff-d97e2eff8604');
insert into arcade_private.quiz_questions values('ps2-medium-01',4,'0a99315f-0ef8-5d8c-8296-71eb9dc7b747');
update public.arcade_quizzes set published=true where id='ps2-medium-01';
-- Rarity classification chosen by the owner; probabilities/chests are not implemented.
alter table public.arcade_cards add column kind text not null default 'object' check(kind in ('object','weapon','character'));
alter table public.arcade_cards add column rarity text not null default 'common' check(rarity in ('common','rare','epic','legendary'));
update public.arcade_cards set kind=case when id in ('blade','guns') then 'weapon' else 'object' end,
 rarity=case when id in ('blade','guns') then 'epic' else 'common' end;
-- Item identity confirmed by the owner; do not invent its function.
update public.arcade_cards set name='Llave insignia' where id='key';
commit;
select category,difficulty,count(*) as trivias_disponibles from public.arcade_quizzes where published group by category,difficulty order by category,difficulty;
