-- From v16/v17. Community directory and read-only public profiles; no data reset.
begin;
-- Public profile identifiers are distinct from authentication user IDs.
alter table public.arcade_profiles add column if not exists community_id uuid not null default gen_random_uuid();
create unique index if not exists arcade_profiles_community_id on public.arcade_profiles(community_id);
create or replace function public.arcade_list_players(p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Invalid page'; end if;
 select jsonb_build_object('total',(select count(*) from public.arcade_profiles),
  'offset',p_offset,'limit',24,
  'has_more',(select count(*) from public.arcade_profiles)>p_offset::bigint+24,
  'players',coalesce((select jsonb_agg(jsonb_build_object(
    'public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,
    'level',floor(p.xp/1800)+1,'is_me',p.id=auth.uid()) order by lower(p.nickname),p.community_id)
   from (select * from public.arcade_profiles order by lower(nickname),community_id limit 24 offset p_offset) p),'[]'::jsonb)) into result;
 return result;
end $$;
-- Keep old callers working without restoring a top/ranking.
create or replace function public.arcade_community() returns jsonb
language sql security definer set search_path='' as $$ select public.arcade_list_players(0) $$;
create or replace function public.arcade_visit_player(p_public_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.arcade_profiles;shown jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.arcade_profiles where community_id=p_public_id;
 if not found then raise exception 'Player unavailable'; end if;
 -- Filter every featured ID against actual ownership, preserve display order, limit three.
 select coalesce(jsonb_agg(card_id order by n),'[]'::jsonb) into shown
 from (select f.card_id,min(f.n) as n from unnest(p.featured) with ordinality f(card_id,n)
  join public.arcade_owned_cards o on o.player_id=p.id and o.card_id=f.card_id
  join public.arcade_cards c on c.id=o.card_id
  group by f.card_id order by min(f.n) limit 3) visible;
 return jsonb_build_object('public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,
  'cosmetics',p.cosmetics,'level',floor(p.xp/1800)+1,'is_me',p.id=auth.uid(),'featured_ids',shown);
end $$;
revoke all on function public.arcade_list_players(integer),public.arcade_visit_player(uuid),public.arcade_community() from public,anon;
grant execute on function public.arcade_list_players(integer),public.arcade_visit_player(uuid),public.arcade_community() to authenticated;
notify pgrst,'reload schema';
commit;
select 'Comunidad · perfiles visitables · solo cartas exhibidas' as update;
