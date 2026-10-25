-- From v18. Profile likes, text forum and perfect-trivia streaks. No reset.
begin;
alter table public.arcade_profiles add column if not exists perfect_streak integer not null default 0 check(perfect_streak>=0);
alter table public.arcade_profiles add column if not exists best_perfect_streak integer not null default 0 check(best_perfect_streak>=perfect_streak);
-- Historical completed catalog attempts count; practice does not count or break a streak.
with attempts as (
 select player_id,id,finished_at,(correct=5 and passed) as perfect,
 sum(case when correct=5 and passed then 0 else 1 end) over(partition by player_id order by finished_at,id) as run
 from public.arcade_games where finished_at is not null and quiz_id is not null
), runs as (
 select player_id,run,count(*) filter(where perfect)::integer as n from attempts group by player_id,run
), totals as (
 select player_id,max(n) as best,(array_agg(n order by run desc))[1] as current from runs group by player_id
)
update public.arcade_profiles p set perfect_streak=t.current,best_perfect_streak=t.best from totals t where p.id=t.player_id;
create or replace function arcade_private.track_perfect_streak() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.finished_at is null and new.finished_at is not null and new.quiz_id is not null then
  update public.arcade_profiles set
   perfect_streak=case when new.correct=5 and new.passed then perfect_streak+1 else 0 end,
   best_perfect_streak=greatest(best_perfect_streak,case when new.correct=5 and new.passed then perfect_streak+1 else 0 end)
   where id=new.player_id;
 end if;
 return new;
end $$;
revoke all on function arcade_private.track_perfect_streak() from public,anon,authenticated;
drop trigger if exists arcade_perfect_streak on public.arcade_games;
create trigger arcade_perfect_streak after update of finished_at on public.arcade_games for each row execute function arcade_private.track_perfect_streak();

create table if not exists arcade_private.profile_likes (
 actor uuid not null references public.arcade_profiles(id) on delete cascade,
 target uuid not null references public.arcade_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(actor,target),check(actor<>target)
);
create index if not exists profile_likes_target on arcade_private.profile_likes(target);
revoke all on arcade_private.profile_likes from public,anon,authenticated;
create or replace function public.arcade_set_profile_like(p_public_id uuid,p_liked boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for no key update;
 if not found then raise exception 'Create your profile first'; end if;
 select id into target_id from public.arcade_profiles where community_id=p_public_id;
 if not found then raise exception 'Player unavailable'; end if;
 if target_id=auth.uid() or p_liked is null then raise exception 'Invalid reaction'; end if;
 if p_liked then insert into arcade_private.profile_likes(actor,target) values(auth.uid(),target_id) on conflict do nothing;
 else delete from arcade_private.profile_likes where actor=auth.uid() and target=target_id; end if;
 return jsonb_build_object('likes',(select count(*) from arcade_private.profile_likes where target=target_id),'liked_by_me',p_liked);
end $$;
revoke all on function public.arcade_set_profile_like(uuid,boolean) from public,anon;
grant execute on function public.arcade_set_profile_like(uuid,boolean) to authenticated;

create table if not exists arcade_private.forum_threads (
 id uuid primary key default gen_random_uuid(),author_id uuid not null references public.arcade_profiles(id) on delete cascade,
 category text not null check(category in ('charlas','ayuda','arcade')),
 title text not null check(char_length(title) between 5 and 100),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),hidden boolean not null default false,locked boolean not null default false
);
create table if not exists arcade_private.forum_posts (
 id uuid primary key default gen_random_uuid(),thread_id uuid not null references arcade_private.forum_threads(id) on delete cascade,
 author_id uuid not null references public.arcade_profiles(id) on delete cascade,
 body text not null check(char_length(body)<=3000),request_id uuid not null,
 created_at timestamptz not null default now(),deleted boolean not null default false,hidden boolean not null default false,
 unique(author_id,request_id)
);
create index if not exists forum_threads_activity on arcade_private.forum_threads(category,updated_at desc,id);
create index if not exists forum_posts_thread on arcade_private.forum_posts(thread_id,created_at,id);
create index if not exists forum_posts_author on arcade_private.forum_posts(author_id,created_at desc);
create table if not exists arcade_private.forum_reports (
 post_id uuid not null references arcade_private.forum_posts(id) on delete cascade,
 reporter_id uuid not null references public.arcade_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(post_id,reporter_id)
);
revoke all on arcade_private.forum_threads,arcade_private.forum_posts,arcade_private.forum_reports from public,anon,authenticated;

create or replace function public.arcade_forum_list(p_category text,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_category is null or p_category not in ('charlas','ayuda','arcade') or p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Invalid forum page'; end if;
 select jsonb_build_object('offset',p_offset,'has_more',(select count(*) from arcade_private.forum_threads where category=p_category and not hidden)>p_offset::bigint+20,
 'threads',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'locked',t.locked,'author',p.nickname,'author_public_id',p.community_id,'updated_at',t.updated_at,
 'replies',greatest(0,(select count(*) from arcade_private.forum_posts m where m.thread_id=t.id and not m.hidden and m.id<>(select id from arcade_private.forum_posts where thread_id=t.id order by created_at,id limit 1)))) order by t.updated_at desc,t.id)
 from (select * from arcade_private.forum_threads where category=p_category and not hidden order by updated_at desc,id limit 20 offset p_offset) t join public.arcade_profiles p on p.id=t.author_id),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.arcade_forum_thread(p_thread uuid,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t arcade_private.forum_threads;result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_offset is null or p_offset<0 or p_offset>1000000 then raise exception 'Invalid forum page'; end if;
 select * into t from arcade_private.forum_threads where id=p_thread and not hidden;
 if not found then raise exception 'Thread unavailable'; end if;
 select jsonb_build_object('id',t.id,'title',t.title,'category',t.category,'locked',t.locked,'offset',p_offset,
 'has_more',(select count(*) from arcade_private.forum_posts where thread_id=t.id and not hidden)>p_offset::bigint+30,
 'posts',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'body',case when m.deleted then '' else m.body end,'deleted',m.deleted,'created_at',m.created_at,
 'author',p.nickname,'author_public_id',p.community_id,'avatar',p.avatar,'cosmetics',p.cosmetics,'is_mine',m.author_id=auth.uid(),
 'reported',exists(select 1 from arcade_private.forum_reports where post_id=m.id and reporter_id=auth.uid())) order by m.created_at,m.id)
 from (select * from arcade_private.forum_posts where thread_id=t.id and not hidden order by created_at,id limit 30 offset p_offset) m join public.arcade_profiles p on p.id=m.author_id),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.arcade_forum_publish(p_thread uuid,p_category text,p_title text,p_body text,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous arcade_private.forum_posts;t arcade_private.forum_threads;new_post_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_request is null then raise exception 'Request ID required'; end if;
 select * into previous from arcade_private.forum_posts where author_id=auth.uid() and request_id=p_request;
 if found then return jsonb_build_object('thread_id',previous.thread_id,'post_id',previous.id,'post_offset',(select greatest(0,((count(*)-1)/30)*30) from arcade_private.forum_posts where thread_id=previous.thread_id and not hidden and (created_at,id)<=(previous.created_at,previous.id))); end if;
 if p_body is null or char_length(trim(p_body))<2 or char_length(trim(p_body))>3000 then raise exception 'Message must contain 2 to 3000 characters'; end if;
 if exists(select 1 from arcade_private.forum_posts where author_id=auth.uid() and created_at>now()-interval '10 seconds') then raise exception 'Wait 10 seconds before posting again'; end if;
 if p_thread is null then
  if p_category is null or p_category not in ('charlas','ayuda','arcade') or p_title is null or char_length(trim(p_title))<5 or char_length(trim(p_title))>100 then raise exception 'Invalid topic'; end if;
  if exists(select 1 from arcade_private.forum_threads where author_id=auth.uid() and created_at>now()-interval '60 seconds') then raise exception 'Wait 60 seconds before creating another topic'; end if;
  insert into arcade_private.forum_threads(author_id,category,title) values(auth.uid(),p_category,trim(p_title)) returning * into t;
 else
  select * into t from arcade_private.forum_threads where id=p_thread and not hidden for update;
  if not found then raise exception 'Thread unavailable'; end if;
  if t.locked then raise exception 'Thread locked'; end if;
 end if;
 insert into arcade_private.forum_posts(thread_id,author_id,body,request_id) values(t.id,auth.uid(),trim(p_body),p_request) returning id into new_post_id;
 update arcade_private.forum_threads set updated_at=now() where id=t.id;
 return jsonb_build_object('thread_id',t.id,'post_id',new_post_id,'post_offset',(select greatest(0,((count(*)-1)/30)*30) from arcade_private.forum_posts where thread_id=t.id and not hidden and (created_at,id)<=(select created_at,id from arcade_private.forum_posts where id=new_post_id)));
end $$;
create or replace function public.arcade_forum_remove(p_post uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update arcade_private.forum_posts set deleted=true,body='' where id=p_post and author_id=auth.uid();
 if not found then raise exception 'Message unavailable'; end if;
end $$;
create or replace function public.arcade_forum_report(p_post uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from arcade_private.forum_posts m join arcade_private.forum_threads t on t.id=m.thread_id where m.id=p_post and m.author_id<>auth.uid() and not m.hidden and not m.deleted and not t.hidden) then raise exception 'Message unavailable'; end if;
 insert into arcade_private.forum_reports(post_id,reporter_id) values(p_post,auth.uid()) on conflict do nothing;
end $$;
-- Owner moderation from SQL Editor/service backend; never available to players.
create or replace function public.arcade_forum_moderate(p_thread uuid,p_post uuid,p_hide boolean,p_lock boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_post is not null then update arcade_private.forum_posts set hidden=p_hide where id=p_post;
 elsif p_thread is not null then update arcade_private.forum_threads set hidden=p_hide,locked=p_lock where id=p_thread;
 else raise exception 'Choose a topic or post'; end if;
 if not found then raise exception 'Content unavailable'; end if;
end $$;
revoke all on function public.arcade_forum_list(text,integer),public.arcade_forum_thread(uuid,integer),public.arcade_forum_publish(uuid,text,text,text,uuid),public.arcade_forum_remove(uuid),public.arcade_forum_report(uuid) from public,anon;
grant execute on function public.arcade_forum_list(text,integer),public.arcade_forum_thread(uuid,integer),public.arcade_forum_publish(uuid,text,text,text,uuid),public.arcade_forum_remove(uuid),public.arcade_forum_report(uuid) to authenticated;
revoke all on function public.arcade_forum_moderate(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.arcade_forum_moderate(uuid,uuid,boolean,boolean) to service_role;

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

notify pgrst,'reload schema';
commit;
select 'Likes · foro · insignias de racha perfecta' as update;
