-- Run after upgrade-v14.sql. Preserves all accounts, games, XP and earned prizes.
begin;
create table if not exists public.arcade_owned_cosmetics (
 player_id uuid not null references public.arcade_profiles(id) on delete cascade,
 item_id text not null references public.arcade_cosmetics(id),
 unlocked_at timestamptz not null default now(),
 primary key(player_id,item_id)
);
alter table public.arcade_owned_cosmetics enable row level security;
drop policy if exists own_cosmetics on public.arcade_owned_cosmetics;
create policy own_cosmetics on public.arcade_owned_cosmetics for select to authenticated using(player_id=(select auth.uid()));
revoke all on public.arcade_owned_cosmetics from public,anon,authenticated;
grant select on public.arcade_owned_cosmetics to authenticated;

-- Capture ownership BEFORE changing pacing. Never take an unlocked item away.
insert into public.arcade_owned_cosmetics(player_id,item_id)
select p.id,c.id from public.arcade_profiles p cross join public.arcade_cosmetics c
where c.required_xp<=p.xp or p.cosmetics->>c.slot=c.id on conflict do nothing;

-- Explicit stable schedule, safe to rerun: one cosmetic halfway through each level.
with schedule(id,position) as (values
 ('pink-glasses',0),('sunset-drive',1),('violet-grid',2),('blue-glasses',3),
 ('retro-cap',4),('neon-city',5),('aurora',6),('night-sky',7),('arcade-room',8),
 ('gold-crown',9),('deep-space',10),('pixel-frame',11),('ghost-badge',12),
 ('pixel-font',13),('ocean-theme',14),('gold-frame',15),('zen-garden',16),
 ('retro-headphones',17),('amber-theme',18),('flame-badge',19),('holo-frame',20),
 ('spiral-galaxy',21),('terminal-font',22),('comet-badge',23),('violet-theme',24),
 ('cyber-visor',25),('pulse-frame',26),('laser-grid',27),('star-badge',28),
 ('jade-theme',29),('champion-frame',30))
update public.arcade_cosmetics c set required_xp=900+1800*s.position from schedule s where c.id=s.id;

create table if not exists public.arcade_coupons (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null unique references public.arcade_profiles(id) on delete cascade,
 code text not null unique default ('LD5-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
 discount_percent integer not null default 10 check(discount_percent=10),
 earned_level integer not null default 5 check(earned_level=5),
 issued_at timestamptz not null default now(),
 requested_at timestamptz,
 redeemed_at timestamptz,
 redemption_note text
);
alter table public.arcade_coupons enable row level security;
drop policy if exists own_coupons on public.arcade_coupons;
create policy own_coupons on public.arcade_coupons for select to authenticated using(player_id=(select auth.uid()));
revoke all on public.arcade_coupons from public,anon,authenticated;
grant select on public.arcade_coupons to authenticated;

create or replace function arcade_private.grant_progress_rewards() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 insert into public.arcade_owned_cosmetics(player_id,item_id)
 select p.id,c.id from public.arcade_profiles p cross join public.arcade_cosmetics c
 where p.id=auth.uid() and p.xp>=c.required_xp on conflict do nothing;
 insert into public.arcade_coupons(player_id)
 select id from public.arcade_profiles where id=auth.uid() and xp>=7200 on conflict(player_id) do nothing;
end $$;
revoke all on function arcade_private.grant_progress_rewards() from public,anon,authenticated;

create or replace function arcade_private.grant_level_chests(p_old_xp bigint,p_new_xp bigint,p_game uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.arcade_chests(player_id,level,source_game_id)
 select auth.uid(),n::integer,p_game from generate_series(p_old_xp/1800+2,p_new_xp/1800+1) n
 where n<>5 on conflict(player_id,level) do nothing;
 perform arcade_private.grant_progress_rewards();
end $$;
revoke all on function arcade_private.grant_level_chests(bigint,bigint,uuid) from public,anon,authenticated;

insert into public.arcade_coupons(player_id)
select id from public.arcade_profiles where xp>=7200 on conflict(player_id) do nothing;

create or replace function public.arcade_get_coupon() returns public.arcade_coupons
language plpgsql security definer set search_path='' as $$
declare result public.arcade_coupons;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform id from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 perform arcade_private.grant_progress_rewards();
 select * into result from public.arcade_coupons where player_id=auth.uid();
 return result;
end $$;

create or replace function public.arcade_request_coupon_redemption(p_coupon_id uuid) returns public.arcade_coupons
language plpgsql security definer set search_path='' as $$
declare result public.arcade_coupons;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.arcade_coupons set requested_at=coalesce(requested_at,now())
 where id=p_coupon_id and player_id=auth.uid() and redeemed_at is null returning * into result;
 if not found then raise exception 'Coupon unavailable or already redeemed'; end if;
 return result;
end $$;
revoke all on function public.arcade_get_coupon(),public.arcade_request_coupon_redemption(uuid) from public,anon;
grant execute on function public.arcade_get_coupon(),public.arcade_request_coupon_redemption(uuid) to authenticated;

-- Merchant-only final validation. Opening Instagram does NOT consume the benefit.
create or replace function public.arcade_redeem_coupon(p_code text,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.arcade_coupons;
begin
 select * into c from public.arcade_coupons where code=upper(trim(p_code)) for update;
 if not found then raise exception 'Coupon not found'; end if;
 if c.redeemed_at is not null then
  return jsonb_build_object('code',c.code,'discount_percent',c.discount_percent,'already_redeemed',true,'redeemed_at',c.redeemed_at);
 end if;
 update public.arcade_coupons set redeemed_at=now(),redemption_note=left(p_note,500) where id=c.id returning * into c;
 return jsonb_build_object('code',c.code,'discount_percent',c.discount_percent,'already_redeemed',false,'redeemed_at',c.redeemed_at);
end $$;
revoke all on function public.arcade_redeem_coupon(text,text) from public,anon,authenticated;
grant execute on function public.arcade_redeem_coupon(text,text) to service_role;

create or replace function public.arcade_equip_cosmetic(p_slot text,p_item text default null)
returns public.arcade_profiles language plpgsql security definer set search_path='' as $$
declare player public.arcade_profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_slot not in ('glasses','hat','background','frame','badge','theme','font') or p_slot is null then raise exception 'Invalid cosmetic slot'; end if;
 select * into player from public.arcade_profiles where id=auth.uid() for update;
 if not found then raise exception 'Create your profile first'; end if;
 if p_item is not null then
  if not exists(select 1 from public.arcade_cosmetics c where c.id=p_item and c.slot=p_slot and
   (c.required_xp<=player.xp or exists(select 1 from public.arcade_owned_cosmetics o where o.player_id=player.id and o.item_id=c.id))) then raise exception 'Cosmetic locked or invalid'; end if;
  insert into public.arcade_owned_cosmetics(player_id,item_id) values(player.id,p_item) on conflict do nothing;
 end if;
 update public.arcade_profiles set cosmetics=case when p_item is null then cosmetics-p_slot else jsonb_set(cosmetics,array[p_slot],to_jsonb(p_item),true) end
 where id=auth.uid() returning * into player;
 return player;
end $$;
notify pgrst, 'reload schema';
commit;
select '10% · nivel 5 · un uso · no acumulable · sin vencimiento' as coupon,
 (select count(*) from public.arcade_cosmetics) as cosmetics;
