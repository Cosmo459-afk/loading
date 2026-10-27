-- From v45: registration is required for NEW weekly attempts. No data reset.
-- Existing attempts/results keep their original timing and can still be completed.
begin;
create or replace function public.arcade_weekly_access() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and not coalesce(u.is_anonymous,false)
  and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null
   or exists(select 1 from auth.identities i where i.user_id=u.id and i.provider in ('google','facebook'))))
$$;
revoke all on function public.arcade_weekly_access() from public,anon;
grant execute on function public.arcade_weekly_access() to authenticated;

create or replace function public.arcade_weekly_play(p_challenge uuid,p_position integer default null,p_answer integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c arcade_private.weekly_challenges;a arcade_private.weekly_attempts;q jsonb;stamp timestamptz;timed_out boolean;changed boolean=false;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 select * into c from arcade_private.weekly_challenges where id=p_challenge for share;
 if not found or c.status='draft' then raise exception 'Weekly unavailable'; end if;
 stamp=clock_timestamp();
 select * into a from arcade_private.weekly_attempts where challenge_id=c.id and player_id=auth.uid() for update;
 if not found then
  if not public.arcade_weekly_access() then raise exception 'Verified account required for weekly challenge' using errcode='42501'; end if;
  if c.status<>'live' or stamp<c.starts_at or stamp>=c.ends_at then raise exception 'Weekly closed'; end if;
  insert into arcade_private.weekly_attempts(challenge_id,player_id,question_started,deadline) values(c.id,auth.uid(),stamp,least(stamp+make_interval(secs=>c.seconds),c.ends_at)) returning * into a;
 end if;
 if a.finished_at is null then
  -- Catch up expired slots after a disconnect; going offline never pauses the clock.
  while a.position<20 and (stamp>=a.deadline or c.status<>'live' or stamp>=c.ends_at) loop
   a.answers:=a.answers||jsonb_build_array(jsonb_build_object('position',a.position,'answer',null,'correct',false,'ms',c.seconds*1000));
   a.elapsed_ms:=a.elapsed_ms+c.seconds*1000;a.position:=a.position+1;a.question_started:=a.deadline;a.deadline:=least(a.deadline+make_interval(secs=>c.seconds),c.ends_at);changed:=true;
  end loop;
  -- Stale/repeated submissions cannot answer the next question.
  if a.position<20 and not changed and p_position is not null and p_position=a.position then
   if p_answer is not null and (p_answer<0 or p_answer>3) then raise exception 'Invalid answer'; end if;
   if p_answer is null then -- A timer poll before expiry must not skip a live question.
    null;
   else
    q:=c.questions->a.position;
    a.correct:=a.correct+case when p_answer=(q->>'correct_index')::integer then 1 else 0 end;
    a.elapsed_ms:=a.elapsed_ms+greatest(0,floor(extract(epoch from (stamp-a.question_started))*1000)::bigint);
    a.answers:=a.answers||jsonb_build_array(jsonb_build_object('position',a.position,'answer',p_answer,'correct',p_answer=(q->>'correct_index')::integer,'ms',greatest(0,floor(extract(epoch from (stamp-a.question_started))*1000)::bigint)));
    a.position:=a.position+1;a.question_started:=stamp;a.deadline:=least(stamp+make_interval(secs=>c.seconds),c.ends_at);
   end if;
  end if;
  update arcade_private.weekly_attempts set position=a.position,question_started=a.question_started,deadline=a.deadline,correct=a.correct,elapsed_ms=a.elapsed_ms,answers=a.answers where id=a.id;
  if a.position>=20 then perform arcade_private.finish_weekly(a.id);select * into a from arcade_private.weekly_attempts where id=a.id;end if;
 end if;
 q:=c.questions->a.position;
 return jsonb_build_object('challenge_id',c.id,'title',c.title,'position',a.position,'total',20,'server_now',clock_timestamp(),'deadline',a.deadline,'finished',a.finished_at is not null,
 'question',case when a.finished_at is null then jsonb_build_object('prompt',q->>'prompt','choices',q->'choices') else null end,
 'correct',case when a.finished_at is not null then a.correct else null end,'xp',case when a.finished_at is not null then a.correct*100 else null end,
 'elapsed_ms',case when a.finished_at is not null then a.elapsed_ms else null end,'exclusive',a.finished_at is not null and a.correct=20);
end $$;

revoke all on function public.arcade_weekly_play(uuid,integer,integer) from public,anon;
grant execute on function public.arcade_weekly_play(uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
