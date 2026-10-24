import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const body=async file=>{const s=await readFile(new URL(file,root),'utf8');return s.slice(0,s.lastIndexOf('\ncommit;')).replace(/^begin;\n/m,'');};
const v08=await body('supabase/upgrade-v08.sql'),v09=await body('supabase/upgrade-v09.sql');
const sql=`-- Upgrade a v0.7 or v0.8 project to v0.9 in one transaction.
-- OWNER AUTHORIZED TEST RESET ON FIRST INSTALLATION: old XP, games, tiers and cards removed.
-- Accounts, nicknames, avatar choices, email links and question bank remain.
-- Running this wrapper again after successful installation does NOT reset progress again.
begin;
do $arcade_upgrade$
begin
 if to_regclass('public.arcade_cosmetics') is null then
  raise exception 'Install v0.7 before this update';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='arcade_games' and column_name='passed') then
  execute $arcade_v08$
${v08}
$arcade_v08$;
 end if;
 if to_regclass('public.arcade_chests') is null then
  execute $arcade_v09$
${v09}
$arcade_v09$;
 elsif to_regclass('public.arcade_owned_cards') is null or exists(select 1 from information_schema.columns where table_schema='public' and table_name='arcade_cards' and column_name='required_xp') then
  raise exception 'Incomplete v0.9 installation; no changes were applied';
 end if;
end
$arcade_upgrade$;
commit;
select collection_id,rarity,count(*) as cartas from public.arcade_cards group by collection_id,rarity order by rarity;
`;
await writeFile(new URL('supabase/upgrade-to-v09.sql',root),sql);
console.log('Generated single-step v0.7/v0.8 → v0.9 SQL; successful reruns preserve progress.');
