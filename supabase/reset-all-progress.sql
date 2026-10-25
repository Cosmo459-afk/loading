-- COMPLETE TEST-PROGRESS RESET for v25/v26. Run manually in Supabase SQL Editor.
-- Deletes ALL players' normal/weekly games, XP, streaks, cards (including Ada),
-- chests, cosmetic unlocks/equipment, coupons and tier unlocks.
-- Preserves accounts, nicknames, base avatars, public profile links, admin access,
-- trivia banks, weekly questions/dates/status, forum posts and reactions.
-- Close game tabs before running; refresh/reopen the game afterwards.
-- This is destructive. Execute the whole script together, not isolated statements.
begin;
set local lock_timeout='5s';
-- Every player-scoring/reward operation first locks the player; serialize the reset.
lock table public.arcade_profiles in access exclusive mode;

-- Dependency order matters: weekly attempts reference their awarded game.
delete from public.arcade_weekly_exclusives;
delete from arcade_private.weekly_attempts;
delete from public.arcade_owned_cards;
delete from public.arcade_chests;
delete from public.arcade_owned_cosmetics;
delete from public.arcade_coupons;
delete from arcade_private.tier_unlocks;
delete from public.arcade_games; -- game_questions are removed by their FK cascade.

update public.arcade_profiles set
 xp=0,games=0,perfect_streak=0,best_perfect_streak=0,rewards_seen_xp=0,
 featured='{}'::text[],cosmetics='{}'::jsonb;

-- Invalidate stale open weekly clients without changing the questions or dates.
-- All referencing progress rows were removed above. Fresh clients discover the new ID.
update arcade_private.weekly_challenges set id=gen_random_uuid() where status='live';
insert into arcade_private.admin_audit(actor_id,action,entity)
values(auth.uid(),'progress_reset_all','All players: normal + weekly; accounts/content preserved');
commit;

select
 (select count(*) from public.arcade_profiles) as jugadores_conservados,
 (select coalesce(sum(xp),0) from public.arcade_profiles) as xp_totales,
 (select count(*) from public.arcade_games) as partidas,
 (select count(*) from arcade_private.weekly_attempts) as intentos_semanales,
 (select count(*) from public.arcade_owned_cards) as cartas,
 (select count(*) from public.arcade_weekly_exclusives) as exclusivas,
 (select count(*) from public.arcade_chests) as cofres,
 (select count(*) from public.arcade_owned_cosmetics) as cosmeticos_desbloqueados,
 (select count(*) from public.arcade_coupons) as cupones;
