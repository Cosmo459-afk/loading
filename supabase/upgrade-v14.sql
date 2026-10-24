-- Apply after backend 0.9. No reset: preserves accounts, XP, inventory and history.
begin;
alter table public.arcade_profiles add column if not exists community_visible boolean not null default false;

create or replace function public.arcade_set_community_visibility(p_visible boolean)
returns public.arcade_profiles language plpgsql security definer set search_path='' as $$
declare result public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_visible is null then raise exception 'Visibility is required'; end if;
 update public.arcade_profiles set community_visible=p_visible where id=auth.uid() returning * into result;
 if not found then raise exception 'Create your profile first'; end if;
 return result;
end $$;

-- A directory, not a ranking. Only opted-in players; never exposes email, UID or history.
create or replace function public.arcade_community()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select jsonb_build_object(
  'total',(select count(*) from public.arcade_profiles where community_visible),
  'players',coalesce((select jsonb_agg(jsonb_build_object('nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,'level',floor(p.xp/1800)+1,'is_me',p.id=auth.uid()) order by p.last_played desc nulls last,p.id)
   from (select a.id,a.nickname,a.avatar,a.cosmetics,a.xp,(select max(g.finished_at) from public.arcade_games g where g.player_id=a.id) as last_played
    from public.arcade_profiles a where a.community_visible
    order by last_played desc nulls last,a.id limit 12) p),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.arcade_set_community_visibility(boolean),public.arcade_community() from public,anon;
grant execute on function public.arcade_set_community_visibility(boolean),public.arcade_community() to authenticated;

create or replace function public.arcade_list_quizzes() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform arcade_private.refresh_unlocks();
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',q.id,'category',q.category,'difficulty',q.difficulty,'sort_order',q.sort_order,
 'unlocked',q.difficulty='easy' or exists(select 1 from arcade_private.tier_unlocks u where u.player_id=auth.uid() and u.category=q.category and u.difficulty=q.difficulty),
 'in_progress',exists(select 1 from public.arcade_games a where a.player_id=auth.uid() and a.quiz_id=q.id and a.finished_at is null and a.started_at>now()-interval '24 hours'),
 'completed',exists(select 1 from public.arcade_games g where g.player_id=auth.uid() and g.quiz_id=q.id and g.passed)
 ) order by q.category,case q.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end,q.sort_order,q.id),'[]'::jsonb) into result from arcade_private.available_quizzes q;
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

alter table public.arcade_cosmetics drop constraint if exists arcade_cosmetics_slot_check;
alter table public.arcade_cosmetics add constraint arcade_cosmetics_slot_check check(slot in ('glasses','hat','background','frame','badge','theme','font'));
insert into public.arcade_cosmetics(id,slot,name,required_xp) values
 ('sunset-drive','background','Fondo · Atardecer synthwave',600),
 ('neon-city','background','Fondo · Ciudad neón',2400),
 ('aurora','background','Fondo · Aurora boreal',3000),
 ('arcade-room','background','Fondo · Sala arcade',4200),
 ('deep-space','background','Fondo · Espacio profundo',5400),
 ('pixel-frame','frame','Marco · Píxeles de hielo',5700),
 ('ghost-badge','badge','Emblema · Fantasmita',6000),
 ('pixel-font','font','Tipografía · Arcade',6600),
 ('ocean-theme','theme','Menú · Océano eléctrico',6900),
 ('gold-frame','frame','Marco · Circuito dorado',7500),
 ('zen-garden','background','Fondo · Jardín nocturno',7800),
 ('retro-headphones','hat','Accesorio · Auriculares retro',8400),
 ('amber-theme','theme','Menú · Terminal ámbar',8700),
 ('flame-badge','badge','Emblema · Fuego',9300),
 ('holo-frame','frame','Marco · Holográfico',9600),
 ('spiral-galaxy','background','Fondo · Galaxia violeta',10200),
 ('terminal-font','font','Tipografía · Terminal',10500),
 ('comet-badge','badge','Emblema · Cometa',11100),
 ('violet-theme','theme','Menú · Violeta nocturno',11400),
 ('cyber-visor','glasses','Accesorio · Visor cyber',12000),
 ('pulse-frame','frame','Marco animado · Pulso neón',12300),
 ('laser-grid','background','Fondo · Horizonte láser',12900),
 ('star-badge','badge','Emblema · Estrella',13200),
 ('jade-theme','theme','Menú · Jade',13800),
 ('champion-frame','frame','Marco animado · Campeón',14100)
on conflict(id) do update set slot=excluded.slot,name=excluded.name,required_xp=excluded.required_xp;
create or replace function public.arcade_equip_cosmetic(p_slot text,p_item text default null)
returns public.arcade_profiles language plpgsql security definer set search_path='' as $$
declare player public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_slot not in ('glasses','hat','background','frame','badge','theme','font') or p_slot is null then raise exception 'Invalid cosmetic slot'; end if;
 select * into player from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_item is not null and not exists(select 1 from public.arcade_cosmetics where id=p_item and slot=p_slot and required_xp<=player.xp) then raise exception 'Cosmetic locked or invalid'; end if;
 update public.arcade_profiles set cosmetics=case when p_item is null then cosmetics-p_slot else jsonb_set(cosmetics,array[p_slot],to_jsonb(p_item),true) end
 where id=auth.uid() returning * into player;
 return player;
end $$;

notify pgrst, 'reload schema';
commit;
select slot,count(*) as cosmetics from public.arcade_cosmetics group by slot order by slot;
