-- Development migration. Apply once after v0.8 only when the matching release is ready.
-- OWNER AUTHORIZED TEST RESET: removes old cards, XP, game history and tier unlocks.
-- Preserves accounts, nickname, chosen avatar, email links and trivia content.
begin;
alter table public.arcade_cards add column collection_id text not null default 'legacy';
alter table public.arcade_cards add column description text not null default '';
-- Owner authorized removal of all previous test collectibles and progression reset.
-- Keep identities, email links, nicknames, chosen avatars and the published trivia bank.
update public.arcade_profiles set xp=0,games=0,featured='{}'::text[],cosmetics='{}'::jsonb,rewards_seen_xp=0;
delete from public.arcade_games;
delete from arcade_private.tier_unlocks;
delete from public.arcade_cards;
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('key','Llave insignia',0,'object','common','re4','Una llave de metal con una elaborada insignia.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-pearl-pendant','Colgante de perlas',0,'object','common','re4','Un collar de cuentas con un colgante ovalado.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-red-hawk','Balas Red Hawk',0,'object','common','re4','Munición de 9 mm para las pistolas de Leon.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-beerstein','Jarra de cerveza',0,'object','common','re4','Una jarra decorativa que puede combinarse con gemas.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-blue-medallion','Medallón azul',0,'object','common','re4','Un medallón azul del encargo del Buhonero.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-spinel','Espinela',0,'object','common','re4','Una pequeña gema de color rosado para vender al Buhonero.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-velvet-blue','Terciopelo azul',0,'object','common','re4','Un tesoro cristalino que se puede vender al Buhonero.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-heavyfield','Cartuchos de escopeta — Heavyfield',0,'object','common','re4','Cartuchos del calibre 12 para las escopetas de Leon.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-prl-412','P.R.L. 412',0,'weapon','epic','re4','Un arma especial capaz de lanzar una potente descarga de energía.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-chicago','Chicago Typewriter',0,'weapon','epic','re4','Un arma automática de aspecto clásico y munición infinita.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-typewriter','Máquina de escribir',0,'object','epic','re4','Un lugar para guardar la partida y tomar un respiro.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-matilda','Matilda',0,'weapon','epic','re4','Pistola de 9 mm con capacidad de disparo en ráfagas.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-merchant','El Buhonero',0,'character','legendary','re4','El misterioso comerciante que vende y mejora tus armas.');
insert into public.arcade_cards(id,name,required_xp,kind,rarity,collection_id,description) values ('re4-leon','Leon S. Kennedy',0,'character','legendary','re4','El agente enviado a rescatar a la hija del presidente.');
alter table public.arcade_cards drop column required_xp;
alter table public.arcade_games drop constraint arcade_games_score_check;
alter table public.arcade_games add constraint arcade_games_score_check check(score between 0 and 900);
create table public.arcade_chests (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 level integer not null check(level>=2),
 source_game_id uuid not null references public.arcade_games(id) on delete cascade,
 created_at timestamptz not null default now(),
 opened_at timestamptz,
 prize_kind text check(prize_kind in ('common','epic','legendary')),
 card_id text references public.arcade_cards(id),
 unique(player_id,level),
 check((opened_at is null and prize_kind is null and card_id is null) or (opened_at is not null and prize_kind is not null and card_id is not null))
);
create table public.arcade_owned_cards (
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 card_id text not null references public.arcade_cards(id) on delete cascade,
 source_chest_id uuid not null unique references public.arcade_chests(id) on delete cascade,
 obtained_at timestamptz not null default now(),
 primary key(player_id,card_id)
);
alter table public.arcade_chests enable row level security;
alter table public.arcade_owned_cards enable row level security;
create policy own_chests on public.arcade_chests for select to authenticated using(player_id=(select auth.uid()));
create policy own_cards on public.arcade_owned_cards for select to authenticated using(player_id=(select auth.uid()));
revoke all on public.arcade_chests,public.arcade_owned_cards from public,anon,authenticated;
grant select on public.arcade_chests,public.arcade_owned_cards to authenticated;
create index arcade_chests_player_time on public.arcade_chests(player_id,created_at desc);

-- Base weights: 85 common / 10 epic / 5 legendary. Exhausted rarities are
-- removed from the draw; remaining weights are normalized, never repeat a card.
create function arcade_private.chest_prize(p_roll double precision,p_common boolean default true,p_epic boolean default true,p_legendary boolean default true) returns text
language plpgsql immutable set search_path='' as $$
declare wc integer=case when p_common then 85 else 0 end; we integer=case when p_epic then 10 else 0 end; wl integer=case when p_legendary then 5 else 0 end; n double precision;
begin
 if p_roll is null or p_roll<0 or p_roll>=1 then raise exception 'Invalid roll'; end if;
 if wc+we+wl=0 then raise exception 'Collection complete';end if;
 n=p_roll*(wc+we+wl);
 return case when n<wc then 'common' when n<wc+we then 'epic' else 'legendary' end;
end $$;
revoke all on function arcade_private.chest_prize(double precision,boolean,boolean,boolean) from public,anon,authenticated;
create function arcade_private.grant_level_chests(p_old_xp bigint,p_new_xp bigint,p_game uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.arcade_chests(player_id,level,source_game_id)
 select auth.uid(),n::integer,p_game from generate_series(p_old_xp/1800+2,p_new_xp/1800+1) n
 on conflict(player_id,level) do nothing;
end $$;
revoke all on function arcade_private.grant_level_chests(bigint,bigint,uuid) from public,anon,authenticated;

create or replace function public.arcade_feature_cards(p_ids text[]) returns public.arcade_profiles
language plpgsql security definer set search_path='' as $$
declare p public.arcade_profiles; n integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_ids is null or cardinality(p_ids)>3 then raise exception 'Choose at most three cards'; end if;
 select count(distinct card_id) into n from public.arcade_owned_cards where player_id=auth.uid() and card_id=any(p_ids);
 if n<>cardinality(p_ids) then raise exception 'Invalid, duplicate or unowned card'; end if;
 update public.arcade_profiles set featured=p_ids where id=auth.uid() returning * into p;
 return p;
end $$;

create function public.arcade_open_chest(p_chest_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.arcade_profiles; chest public.arcade_chests; prize text; chosen text; has_common boolean; has_epic boolean; has_legendary boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Same lock order as submission: player first, then the individual record.
 select * into p from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 select * into chest from public.arcade_chests where id=p_chest_id and player_id=auth.uid() for update;
 if not found then raise exception 'Chest not found'; end if;
 if chest.opened_at is null then
  select coalesce(bool_or(c.rarity='common'),false),coalesce(bool_or(c.rarity='epic'),false),coalesce(bool_or(c.rarity='legendary'),false)
   into has_common,has_epic,has_legendary from public.arcade_cards c where
   not exists(select 1 from public.arcade_owned_cards o where o.player_id=auth.uid() and o.card_id=c.id);
  prize=arcade_private.chest_prize(random(),has_common,has_epic,has_legendary);
  select c.id into chosen from public.arcade_cards c where c.rarity=prize
   and not exists(select 1 from public.arcade_owned_cards o where o.player_id=auth.uid() and o.card_id=c.id)
   order by random() limit 1;
  if chosen is null then raise exception 'Collection complete';end if;
  update public.arcade_chests set opened_at=now(),prize_kind=prize,card_id=chosen where id=chest.id returning * into chest;
  insert into public.arcade_owned_cards(player_id,card_id,source_chest_id) values(auth.uid(),chosen,chest.id);
 end if;
 -- A retry or second device gets the same stored prize without rewarding twice.
 return to_jsonb(chest);
end $$;
revoke all on function public.arcade_open_chest(uuid) from public,anon;
grant execute on function public.arcade_open_chest(uuid) to authenticated;
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
   approved=g.quiz_id is not null and n>=3;
   if g.quiz_id is not null and exists(select 1 from public.arcade_games where player_id=auth.uid() and quiz_id=g.quiz_id and passed and id<>g.id) then
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
 into review from arcade_private.game_questions where game_id=g.id and (g.passed or g.quiz_id is null);
 perform arcade_private.refresh_unlocks();
 return jsonb_build_object('game_id',g.id,'correct',g.correct,'score',g.score,'passed',g.passed,'review',coalesce(review,'[]'::jsonb),'chests_earned',(select count(*) from public.arcade_chests where player_id=auth.uid() and source_game_id=g.id));
end $$;
commit;
select collection_id,rarity,count(*) as cartas from public.arcade_cards group by collection_id,rarity order by rarity;
