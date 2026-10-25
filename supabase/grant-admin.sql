-- Run in Supabase SQL Editor as project owner, AFTER upgrade-v20.sql.
-- Set admin_email below to the owner's verified Arcade email IN SQL EDITOR ONLY.
-- Keep the personal email out of the public repository. Never put service keys in the browser.
begin;
do $$
declare admin_email text := 'CORREO_DEL_DUENO'; account_id uuid; n integer;
begin
 select count(*) into n from auth.users where lower(email)=lower(admin_email) and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if n<>1 then raise exception 'No unique verified Arcade account found. Sign into the Arcade and confirm/link this email before granting access.'; end if;
 select id into account_id from auth.users where lower(email)=lower(admin_email) and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 insert into arcade_private.admin_accounts(user_id) values(account_id) on conflict do nothing;
end $$;
commit;
select 'Acceso habilitado para la cuenta verificada del dueño. Recargá el Arcade.' as result;
