-- v27: public weekly announcement/ranking without requiring a player profile.
-- Preserves active editions, banks, attempts, XP and rewards. No reset.
begin;
create or replace function public.arcade_weekly_public_hub() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;board jsonb;
begin
 result:=public.arcade_weekly_hub(null);
 select coalesce(jsonb_agg(item-'is_me' order by ordinal),'[]'::jsonb) into board
 from jsonb_array_elements(result->'top') with ordinality entries(item,ordinal);
 -- Public presentation only: no personal attempt or own position, no question bank.
 return (result-'mine'-'attempt')||jsonb_build_object('top',board);
end $$;
revoke all on function public.arcade_weekly_public_hub() from public;
grant execute on function public.arcade_weekly_public_hub() to anon,authenticated;
notify pgrst,'reload schema';
commit;
