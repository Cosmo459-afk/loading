-- Read-only owner statistics, from v41+ database. No new tracking or resets.
begin;
create index if not exists arcade_stats_normal_start on public.arcade_games(started_at)
 where quiz_id is not null and weekly_id is null;
create index if not exists arcade_stats_normal_finish on public.arcade_games(finished_at)
 where quiz_id is not null and weekly_id is null and finished_at is not null;
create index if not exists arcade_stats_weekly_start on arcade_private.weekly_attempts(started_at);
create index if not exists arcade_stats_weekly_finish on arcade_private.weekly_attempts(finished_at) where finished_at is not null;
create index if not exists arcade_stats_players_created on public.arcade_profiles(created_at);

create or replace function public.arcade_admin_stats(p_days integer default 7) returns jsonb
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=statement_timestamp();tz text:='America/Argentina/Buenos_Aires';first_day date;since timestamptz;result jsonb;
begin
 perform arcade_private.require_admin();
 if p_days is null or p_days not in (7,30) then raise exception 'Choose 7 or 30 days' using errcode='22023'; end if;
 first_day:=(stamp at time zone tz)::date-(p_days-1);
 since:=first_day::timestamp at time zone tz;
 with normal as (
  select g.player_id,g.category,q.difficulty,g.started_at,g.finished_at,g.correct from public.arcade_games g
  join public.arcade_quizzes q on q.id=g.quiz_id
  where g.quiz_id is not null and g.weekly_id is null
   and ((g.started_at>=since and g.started_at<stamp) or (g.finished_at>=since and g.finished_at<stamp))
 ),weekly as (
  select player_id,started_at,finished_at,correct from arcade_private.weekly_attempts
  where (started_at>=since and started_at<stamp) or (finished_at>=since and finished_at<stamp)
 ),starts as (
  select player_id,(started_at at time zone tz)::date as day from normal where started_at>=since and started_at<stamp
  union select player_id,(started_at at time zone tz)::date from weekly where started_at>=since and started_at<stamp
 ),activity as (
  select player_id,day from starts
  union select player_id,(finished_at at time zone tz)::date from normal where finished_at>=since and finished_at<stamp
  union select player_id,(finished_at at time zone tz)::date from weekly where finished_at>=since and finished_at<stamp
 ),back as (
  select player_id from starts group by player_id having count(distinct day)>=2
 ),normal_counts as (
  select count(*) filter(where started_at>=since and started_at<stamp) as started,
   count(*) filter(where finished_at>=since and finished_at<stamp) as finished,
   count(*) filter(where started_at>=since and started_at<stamp and finished_at<stamp) as completed_from_started,
   count(*) filter(where started_at>=since and started_at<stamp and finished_at is null and started_at>stamp-interval '24 hours') as pending,
   count(*) filter(where started_at>=since and started_at<stamp and finished_at is null and started_at<=stamp-interval '24 hours') as expired,
   round(avg(correct) filter(where finished_at>=since and finished_at<stamp),1) as average_correct
  from normal
 ),weekly_counts as (
  select count(*) filter(where started_at>=since and started_at<stamp) as started,
   count(*) filter(where finished_at>=since and finished_at<stamp) as finished,
   count(*) filter(where started_at>=since and started_at<stamp and finished_at<stamp) as completed_from_started,
   count(*) filter(where started_at>=since and started_at<stamp and finished_at is null) as unfinished,
   count(*) filter(where finished_at>=since and finished_at<stamp and correct=20) as perfect
  from weekly
 ),daily as (
  select d::date as day,
   (select count(*) from activity a where a.day=d::date) as active,
   (select count(*) from public.arcade_profiles p where p.created_at>=(d at time zone tz) and p.created_at<((d+interval '1 day') at time zone tz) and p.created_at<stamp) as new_players,
   (select count(*) from normal n where (n.started_at at time zone tz)::date=d::date and n.started_at<stamp) as normal_started,
   (select count(*) from normal n where (n.finished_at at time zone tz)::date=d::date and n.finished_at<stamp) as normal_finished,
   (select count(*) from weekly w where (w.started_at at time zone tz)::date=d::date and w.started_at<stamp) as weekly_started,
   (select count(*) from weekly w where (w.finished_at at time zone tz)::date=d::date and w.finished_at<stamp) as weekly_finished
  from generate_series(first_day::timestamp,(stamp at time zone tz)::date::timestamp,interval '1 day') d
 ),breakdown as (
  select category,difficulty,count(*) filter(where started_at>=since and started_at<stamp) as started,
   count(*) filter(where finished_at>=since and finished_at<stamp) as finished
  from normal group by category,difficulty
 ),levels as (
  select floor(xp/1800)+1 as level,count(*) as players from public.arcade_profiles group by floor(xp/1800)+1
 )
 select jsonb_build_object('generated_at',stamp,'timezone',tz,'days',p_days,'from',since,'until',stamp,
  'summary',jsonb_build_object(
   'players_total',(select count(*) from public.arcade_profiles),
   'new_players',(select count(*) from public.arcade_profiles where created_at>=since and created_at<stamp),
   'active_players',(select count(distinct player_id) from activity),
   'returning_players',(select count(*) from back),
   'returning_rate',round(100.0*(select count(*) from back)/nullif((select count(distinct player_id) from activity),0),1)),
  'normal',(select to_jsonb(n)||jsonb_build_object('completion_rate',round(100.0*n.completed_from_started/nullif(n.started,0),1)) from normal_counts n),
  'weekly',(select to_jsonb(w)||jsonb_build_object('completion_rate',round(100.0*w.completed_from_started/nullif(w.started,0),1)) from weekly_counts w),
  'daily',(select coalesce(jsonb_agg(to_jsonb(d) order by d.day),'[]'::jsonb) from daily d),
  'breakdown',(select coalesce(jsonb_agg(to_jsonb(b) order by category,case difficulty when 'easy' then 1 when 'medium' then 2 else 3 end),'[]'::jsonb) from breakdown b),
  'levels',(select coalesce(jsonb_agg(to_jsonb(l) order by level),'[]'::jsonb) from levels l)
 ) into result;
 return result;
end $$;
revoke all on function public.arcade_admin_stats(integer) from public,anon;
grant execute on function public.arcade_admin_stats(integer) to authenticated;
notify pgrst,'reload schema';
commit;
