-- Public share links expose only the same chosen public profile presentation.
-- No emails, Auth IDs, inventory, coupons, attempts or voter identities.
begin;
create or replace function public.arcade_share_profile(p_public_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('public_id',p.community_id,'nickname',p.nickname,'avatar',p.avatar,'cosmetics',p.cosmetics,
 'level',p.xp/1800+1,'likes',(select count(*) from arcade_private.profile_likes where target=p.id),'perfect_streak',p.perfect_streak,'best_perfect_streak',p.best_perfect_streak,
 'featured_ids',coalesce((select jsonb_agg(f.id order by f.ordinal) from unnest(p.featured) with ordinality f(id,ordinal)
 join public.arcade_owned_cards o on o.player_id=p.id and o.card_id=f.id),'[]'::jsonb)) into result
 from public.arcade_profiles p where p.community_id=p_public_id;
 if result is null then raise exception 'Player unavailable'; end if;
 return result;
end $$;
revoke all on function public.arcade_share_profile(uuid) from public;
grant execute on function public.arcade_share_profile(uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
