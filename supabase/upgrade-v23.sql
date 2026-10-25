-- v23: initial publication separated from comments; one removable approval per player.
-- Run after v21. Preserves all posts, progress and existing permissions.
begin;
create table if not exists arcade_private.forum_post_likes (
 post_id uuid not null references arcade_private.forum_posts(id) on delete cascade,
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(post_id,player_id)
);
alter table arcade_private.forum_post_likes enable row level security;
revoke all on arcade_private.forum_post_likes from public,anon,authenticated;
create or replace function public.arcade_forum_conversation(p_thread uuid,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;opening_id uuid;opening jsonb;messages jsonb;
begin
 result:=public.arcade_forum_thread(p_thread,p_offset);
 select id into opening_id from arcade_private.forum_posts where thread_id=p_thread order by created_at,id limit 1;
 -- Identify the actual first message, even when moderation has hidden it.
 select m into opening from jsonb_array_elements(public.arcade_forum_thread(p_thread,0)->'posts') m where m->>'id'=opening_id::text;
 if opening is not null then
  opening:=opening||jsonb_build_object('likes',(select count(*) from arcade_private.forum_post_likes where post_id=opening_id),'liked',exists(select 1 from arcade_private.forum_post_likes where post_id=opening_id and player_id=auth.uid()));
 end if;
 select coalesce(jsonb_agg(m||jsonb_build_object('likes',(select count(*) from arcade_private.forum_post_likes where post_id=(m->>'id')::uuid),'liked',exists(select 1 from arcade_private.forum_post_likes where post_id=(m->>'id')::uuid and player_id=auth.uid())) order by ordinal),'[]'::jsonb) into messages
 from jsonb_array_elements(result->'posts') with ordinality e(m,ordinal);
 return result||jsonb_build_object('posts',messages,'opening',opening,'opening_id',opening_id,'reply_count',(select count(*) from arcade_private.forum_posts where thread_id=p_thread and not hidden and id<>opening_id));
end $$;
create or replace function public.arcade_set_post_like(p_post uuid,p_liked boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare post arcade_private.forum_posts;
begin
 if auth.uid() is null or not exists(select 1 from public.arcade_profiles where id=auth.uid()) then raise exception 'Authentication required'; end if;
 if p_liked is null then raise exception 'Invalid reaction'; end if;
 select m.* into post from arcade_private.forum_posts m join arcade_private.forum_threads t on t.id=m.thread_id where m.id=p_post and not m.hidden and not m.deleted and not t.hidden for update of m;
 if not found then raise exception 'Message unavailable'; end if;
 if post.author_id=auth.uid() then raise exception 'Cannot like your own message'; end if;
 if p_liked then insert into arcade_private.forum_post_likes(post_id,player_id) values(p_post,auth.uid()) on conflict do nothing;
 else delete from arcade_private.forum_post_likes where post_id=p_post and player_id=auth.uid(); end if;
 return jsonb_build_object('post_id',p_post,'likes',(select count(*) from arcade_private.forum_post_likes where post_id=p_post),'liked',p_liked);
end $$;
revoke all on function public.arcade_forum_conversation(uuid,integer),public.arcade_set_post_like(uuid,boolean) from public,anon;
grant execute on function public.arcade_forum_conversation(uuid,integer),public.arcade_set_post_like(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
