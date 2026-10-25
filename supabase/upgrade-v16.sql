-- Apply after v15. No reset: preserves XP, inventory, games and rewards.
begin;
alter table public.arcade_profiles alter column community_visible set default true;
update public.arcade_profiles set community_visible=true where not community_visible;
-- Community is now automatic. Old clients cannot toggle an obsolete setting.
revoke execute on function public.arcade_set_community_visibility(boolean) from public,anon,authenticated;
create or replace function public.arcade_community()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 with ranked as (
  select p.id,p.nickname,p.avatar,p.cosmetics,p.xp,
   floor(p.xp/1800)+1 as level,rank() over(order by p.xp desc) as position
  from public.arcade_profiles p
 ), safe as (
  select id,nickname,position,jsonb_build_object('nickname',nickname,'avatar',avatar,
   'cosmetics',cosmetics,'level',level,'xp',xp,'position',position,'is_me',id=auth.uid()) as item
  from ranked
 )
 select jsonb_build_object('total',(select count(*) from ranked),
  'players',coalesce((select jsonb_agg(item order by position,nickname,id)
    from (select * from safe order by position,nickname,id limit 12) top_players),'[]'::jsonb),
  'me',(select item from safe where id=auth.uid())) into result;
 return result;
end $$;
revoke all on function public.arcade_community() from public,anon;
grant execute on function public.arcade_community() to authenticated;
notify pgrst,'reload schema';
commit;
select 'Comunidad automática · ranking por XP · empates comparten puesto' as community;
