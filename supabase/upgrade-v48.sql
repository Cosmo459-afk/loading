-- Four featured slots, including earned weekly exclusives. No reset or automatic selection.
begin;
create or replace function public.arcade_feature_cards(p_ids text[]) returns public.arcade_profiles
language plpgsql security definer set search_path='' as $$
declare p public.arcade_profiles;n integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_ids is null or cardinality(p_ids)>4 then raise exception 'Choose at most four cards'; end if;
 select count(distinct id) into n from (
  select card_id as id from public.arcade_owned_cards where player_id=auth.uid() and card_id=any(p_ids)
  union select 'weekly-'||challenge_id::text from public.arcade_weekly_exclusives where player_id=auth.uid() and ('weekly-'||challenge_id::text)=any(p_ids)
 ) owned;
 if n<>cardinality(p_ids) then raise exception 'Invalid, duplicate or unowned card'; end if;
 update public.arcade_profiles set featured=p_ids where id=auth.uid() returning * into p;
 return p;
end $$;
revoke all on function public.arcade_feature_cards(text[]) from public,anon;
grant execute on function public.arcade_feature_cards(text[]) to authenticated;

-- Only the four selected, still-owned IDs become public. Unselected exclusive editions stay private.
create or replace function arcade_private.featured_public(p_player uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with visible as (
  select f.id,min(f.ordinal) as ordinal from public.arcade_profiles p,
   lateral unnest(p.featured) with ordinality f(id,ordinal)
  where p.id=p_player and (
   exists(select 1 from public.arcade_owned_cards o where o.player_id=p.id and o.card_id=f.id)
   or exists(select 1 from public.arcade_weekly_exclusives e where e.player_id=p.id and ('weekly-'||e.challenge_id::text)=f.id))
  group by f.id order by min(f.ordinal) limit 4
 )
 select jsonb_build_object('featured_ids',coalesce((select jsonb_agg(v.id order by v.ordinal) from visible v),'[]'::jsonb),
  'featured_exclusives',coalesce((select jsonb_agg(jsonb_build_object('challenge_id',e.challenge_id,'name',e.name,'edition',e.edition) order by v.ordinal)
   from visible v join public.arcade_weekly_exclusives e on e.player_id=p_player and ('weekly-'||e.challenge_id::text)=v.id),'[]'::jsonb))
$$;
revoke all on function arcade_private.featured_public(uuid) from public,anon,authenticated;

create or replace function public.arcade_share_profile(p_public_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.arcade_profiles;
begin
 select * into p from public.arcade_profiles where community_id=p_public_id;
 if not found then raise exception 'Player unavailable'; end if;
 return jsonb_build_object('public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,
 'level',p.xp/1800+1,'likes',(select count(*) from arcade_private.profile_likes where target=p.id),
 'perfect_streak',p.perfect_streak,'best_perfect_streak',p.best_perfect_streak)||arcade_private.featured_public(p.id);
end $$;
revoke all on function public.arcade_share_profile(uuid) from public;
grant execute on function public.arcade_share_profile(uuid) to anon,authenticated;

create or replace function public.arcade_visit_player(p_public_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into p from public.arcade_profiles where community_id=p_public_id;
 if not found then raise exception 'Player unavailable'; end if;
 return jsonb_build_object('public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,
 'level',p.xp/1800+1,'is_me',p.id=auth.uid(),'perfect_streak',p.perfect_streak,'best_perfect_streak',p.best_perfect_streak,
 'likes',(select count(*) from arcade_private.profile_likes where target=p.id),
 'liked_by_me',exists(select 1 from arcade_private.profile_likes where target=p.id and actor=auth.uid()))||arcade_private.featured_public(p.id);
end $$;
revoke all on function public.arcade_visit_player(uuid) from public,anon;
grant execute on function public.arcade_visit_player(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
