-- From v40: unique permanent nicknames. Owner authorized removal of the two Pepito test profiles.
-- Other players, active weekly edition, rankings and rewards are preserved.
begin;
set local lock_timeout='5s';
lock table public.arcade_profiles in access exclusive mode;

create or replace function public.arcade_nickname_key(p_name text) returns text
language sql immutable strict parallel safe set search_path='' as $$
 select lower(btrim(regexp_replace(p_name,'[[:space:]]+',' ','g')))
$$;
revoke all on function public.arcade_nickname_key(text) from public,anon;
grant execute on function public.arcade_nickname_key(text) to authenticated;

-- Delete only the explicitly authorized pair. Keep Auth access records, so no emails are removed.
-- Profile-owned test games, weekly scores, posts and rewards cascade with those two profiles.
do $$
declare targets uuid[];n integer;
begin
 select array_agg(id),count(*) into targets,n from public.arcade_profiles
 where public.arcade_nickname_key(nickname)='pepito';
 if n>2 then raise exception 'More than two Pepito profiles found. Review their IDs before deleting.'; end if;
 if n=2 then
  if exists(select 1 from arcade_private.admin_accounts where user_id=any(targets)) then
   raise exception 'A Pepito profile is an administrator. No profiles were deleted.';
  end if;
  delete from public.arcade_profiles where id=any(targets);
  insert into arcade_private.admin_audit(action,entity) values('remove_authorized_pepito_test_profiles',array_to_string(targets,','));
 end if;
end $$;

-- Do not silently rename or delete any other duplicate players.
do $$
begin
 if exists(select 1 from public.arcade_profiles group by public.arcade_nickname_key(nickname) having count(*)>1) then
  raise exception 'Other duplicate nicknames exist. No changes applied; review duplicates before installing v41.';
 end if;
end $$;
create unique index if not exists arcade_profiles_unique_nickname_v41
 on public.arcade_profiles(public.arcade_nickname_key(nickname));

create or replace function arcade_private.protect_nickname() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.nickname is distinct from old.nickname then
  raise exception 'Nickname cannot be changed' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function arcade_private.protect_nickname() from public,anon,authenticated;
drop trigger if exists arcade_nickname_immutable on public.arcade_profiles;
create trigger arcade_nickname_immutable before update of nickname on public.arcade_profiles
 for each row execute function arcade_private.protect_nickname();

create or replace function public.arcade_save_profile(p_nickname text,p_avatar integer,p_photo text default null)
returns public.arcade_profiles language plpgsql security definer set search_path='' as $$
declare result public.arcade_profiles;chosen text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_avatar is null or p_avatar<0 or p_avatar>7 then raise exception 'Invalid avatar'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 select * into result from public.arcade_profiles where id=auth.uid() for update;
 if found then
  if p_nickname is distinct from result.nickname then raise exception 'Nickname cannot be changed' using errcode='23514'; end if;
  update public.arcade_profiles set avatar=p_avatar,photo=null where id=auth.uid() returning * into result;
 else
  chosen:=btrim(regexp_replace(p_nickname,'[[:space:]]+',' ','g'));
  if chosen is null or char_length(chosen) not between 2 and 20 then raise exception 'Nickname must have 2 to 20 characters'; end if;
  begin
   insert into public.arcade_profiles(id,nickname,avatar,photo) values(auth.uid(),chosen,p_avatar,null) returning * into result;
  exception when unique_violation then
   raise exception 'Nickname already in use' using errcode='23505';
  end;
 end if;
 return result;
end $$;
revoke all on function public.arcade_save_profile(text,integer,text) from public,anon;
grant execute on function public.arcade_save_profile(text,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
select count(*) as players_preserved from public.arcade_profiles;
