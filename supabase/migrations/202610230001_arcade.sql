-- Run once in the SQL Editor of a new Supabase project.
-- No secrets. Browser clients receive only their own records and quiz prompts.
begin;
create schema if not exists arcade_private;
revoke all on schema arcade_private from public, anon, authenticated;

create table public.arcade_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  avatar smallint not null default 0 check (avatar between 0 and 7),
  photo text check (photo is null or (char_length(photo)<=100000 and photo ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
  xp bigint not null default 0 check (xp>=0),
  games integer not null default 0 check (games>=0),
  featured text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.arcade_cards (
  id text primary key,
  name text not null,
  required_xp integer not null check (required_xp>=0)
);
insert into public.arcade_cards(id,name,required_xp) values
 ('herb','Hierba verde',200),('spray','Spray de primeros auxilios',500),
 ('key','Llave misteriosa',900),('blade','Espadas del caos',1500),
 ('guns','Pistolas gemelas',2500),('crystal','Cristal de guardado',3500),
 ('box','Caja de cartón',5000),('crown','Leyenda retro',7500);
create table arcade_private.questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check(category in ('ps1','ps2')),
  difficulty text not null check(difficulty in ('normal','expert')),
  prompt text not null,
  choices jsonb not null check(jsonb_typeof(choices)='array' and jsonb_array_length(choices)=4),
  correct_index integer not null check(correct_index between 0 and 3),
  explanation text not null,
  active boolean not null default true
);
create table public.arcade_games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.arcade_profiles(id) on delete cascade,
  category text not null check(category in ('ps1','ps2','mix')),
  difficulty text not null check(difficulty in ('normal','expert')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  correct integer check(correct between 0 and 5),
  score integer check(score between 0 and 700)
);
create index arcade_games_player_time on public.arcade_games(player_id,started_at desc);
create table arcade_private.game_questions (
  game_id uuid not null references public.arcade_games(id) on delete cascade,
  position integer not null check(position between 0 and 4),
  question_id uuid not null,
  prompt text not null,
  choices jsonb not null,
  correct_index integer not null,
  explanation text not null,
  chosen_index integer check(chosen_index between 0 and 3),
  primary key(game_id,position)
);

alter table public.arcade_profiles enable row level security;
alter table public.arcade_cards enable row level security;
alter table public.arcade_games enable row level security;
alter table arcade_private.questions enable row level security;
alter table arcade_private.game_questions enable row level security;
create policy own_profile on public.arcade_profiles for select to authenticated using(id=(select auth.uid()));
create policy own_games on public.arcade_games for select to authenticated using(player_id=(select auth.uid()));
create policy card_catalog on public.arcade_cards for select to authenticated using(true);
revoke all on public.arcade_profiles,public.arcade_games,public.arcade_cards from anon,authenticated;
grant select on public.arcade_profiles,public.arcade_games,public.arcade_cards to authenticated;

create function public.arcade_save_profile(p_nickname text,p_avatar integer,p_photo text default null)
returns public.arcade_profiles
language plpgsql security definer set search_path=''
as $$
declare result public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.arcade_profiles(id,nickname,avatar,photo)
 values(auth.uid(),btrim(p_nickname),p_avatar,p_photo)
 on conflict(id) do update set nickname=excluded.nickname,avatar=excluded.avatar,photo=excluded.photo
 returning * into result;
 return result;
end $$;

create function public.arcade_feature_cards(p_ids text[])
returns public.arcade_profiles
language plpgsql security definer set search_path=''
as $$
declare result public.arcade_profiles; n integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into result from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_ids is null or cardinality(p_ids)>3 then raise exception 'Choose at most three cards'; end if;
 select count(distinct id) into n from public.arcade_cards where id=any(p_ids) and required_xp<=result.xp;
 if n<>cardinality(p_ids) then raise exception 'Invalid, duplicate or locked card'; end if;
 update public.arcade_profiles set featured=p_ids where id=auth.uid() returning * into result;
 return result;
end $$;

create function public.arcade_start_game(p_category text,p_difficulty text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare g public.arcade_games; prompts jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
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

create function public.arcade_submit_game(p_game_id uuid,p_answers integer[])
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
 return jsonb_build_object('game_id',g.id,'correct',g.correct,'score',g.score,'review',review);
end $$;

revoke all on function public.arcade_save_profile(text,integer,text) from public,anon;
revoke all on function public.arcade_feature_cards(text[]) from public,anon;
revoke all on function public.arcade_start_game(text,text) from public,anon;
revoke all on function public.arcade_submit_game(uuid,integer[]) from public,anon;
grant execute on function public.arcade_save_profile(text,integer,text),public.arcade_feature_cards(text[]),public.arcade_start_game(text,text),public.arcade_submit_game(uuid,integer[]) to authenticated;
commit;
