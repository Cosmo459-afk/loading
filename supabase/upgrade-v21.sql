-- From v20. Discoverable forum feed and personal/public post indexes. Preserves all content.
begin;
-- Repair an omitted v18: v19/v20 can install without the community identifier and RPCs.
-- Existing public IDs, posts, roles and progress are preserved.
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

-- Keep v19 likes and streak fields in visitable profiles.
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
  'cosmetics',p.cosmetics,'level',floor(p.xp/1800)+1,'is_me',p.id=auth.uid(),'featured_ids',shown,'perfect_streak',p.perfect_streak,'best_perfect_streak',p.best_perfect_streak,
  'likes',(select count(*) from arcade_private.profile_likes where target=p.id),
  'liked_by_me',exists(select 1 from arcade_private.profile_likes where target=p.id and actor=auth.uid()));
end $$;


create or replace function public.arcade_forum_feed(p_scope text default 'all',p_author uuid default null,p_category text default null,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare selected_author uuid;selected_name text;result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_scope is null or p_scope not in ('all','mine','replies','author','author_replies') or p_offset is null or p_offset<0 or p_offset>1000000
  or (p_category is not null and p_category not in ('charlas','ayuda','arcade')) then raise exception 'Invalid forum page'; end if;
 if p_scope in ('author','author_replies') then
  select id,nickname into selected_author,selected_name from public.arcade_profiles where community_id=p_author;
  if not found then raise exception 'Player unavailable'; end if;
 else selected_author=auth.uid(); end if;
 with visible as (
  select t.*,p.nickname,p.community_id,p.avatar,p.cosmetics,
   (select id from arcade_private.forum_posts where thread_id=t.id order by created_at,id limit 1) as opening_id
  from arcade_private.forum_threads t join public.arcade_profiles p on p.id=t.author_id
  where not t.hidden and (p_category is null or t.category=p_category)
 ), filtered as (
  select v.* from visible v where p_scope='all' or (p_scope in ('mine','author') and v.author_id=selected_author)
   or (p_scope in ('replies','author_replies') and exists(select 1 from arcade_private.forum_posts m where m.thread_id=v.id and m.author_id=selected_author and m.id<>v.opening_id and not m.hidden))
 ), page as (select * from filtered order by updated_at desc,id limit 20 offset p_offset)
 select jsonb_build_object('author_name',selected_name,'offset',p_offset,'has_more',(select count(*) from filtered)>p_offset::bigint+20,'total',(select count(*) from filtered),
 'threads',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'category',v.category,'locked',v.locked,
 'author',v.nickname,'author_public_id',v.community_id,'avatar',v.avatar,'cosmetics',v.cosmetics,'created_at',v.created_at,'updated_at',v.updated_at,
 'excerpt',case when p_scope in ('replies','author_replies') then coalesce((select case when m.deleted then '' else left(m.body,280) end from arcade_private.forum_posts m where m.thread_id=v.id and m.author_id=selected_author and m.id<>v.opening_id and not m.hidden order by m.created_at desc,m.id desc limit 1),'') else coalesce((select case when m.deleted then '' else left(m.body,280) end from arcade_private.forum_posts m where m.id=v.opening_id and not m.hidden),'') end,
 'replies',(select count(*) from arcade_private.forum_posts m where m.thread_id=v.id and m.id<>v.opening_id and not m.hidden),
 'target_post',case when p_scope in ('replies','author_replies') then (select m.id from arcade_private.forum_posts m where m.thread_id=v.id and m.author_id=selected_author and m.id<>v.opening_id and not m.hidden order by m.created_at desc,m.id desc limit 1) else null end
 ) order by v.updated_at desc,v.id) from page v),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.arcade_forum_locate(p_thread uuid,p_post uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare m arcade_private.forum_posts;result integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from arcade_private.forum_threads where id=p_thread and not hidden) then raise exception 'Thread unavailable'; end if;
 select * into m from arcade_private.forum_posts where id=p_post and thread_id=p_thread and not hidden;
 if not found then raise exception 'Message unavailable'; end if;
 select greatest(0,((count(*)-1)/30)*30)::integer into result from arcade_private.forum_posts where thread_id=p_thread and not hidden and (created_at,id)<=(m.created_at,m.id);
 return result;
end $$;
revoke all on function public.arcade_forum_feed(text,uuid,text,integer),public.arcade_forum_locate(uuid,uuid) from public,anon;
grant execute on function public.arcade_forum_feed(text,uuid,text,integer),public.arcade_forum_locate(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
select 'Portada, mis publicaciones, respuestas y publicaciones por perfil. Se conservan todos los temas anteriores.' as update;
