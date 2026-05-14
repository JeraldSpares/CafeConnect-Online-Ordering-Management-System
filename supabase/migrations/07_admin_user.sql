-- Create the first admin user.
--
-- Two options — pick ONE of these. Option A is faster, Option B is "the proper
-- Supabase way" and works even if pgcrypto isn't exposed in your schema.

-- =========================================================================
-- OPTION A — pure SQL (uses pgcrypto, fast, no UI clicks)
-- =========================================================================
-- pgcrypto is enabled by default on Supabase. If this errors with "function
-- crypt does not exist", use Option B below.
do $$
declare
  v_user_id  uuid := gen_random_uuid();
  v_email    text := 'admin@cafeconnect.local';
  v_password text := 'CafeConnect2026!';
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'User % already exists — skipping insert.', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    jsonb_build_object('full_name','Cafe Admin','role','admin'),
    now(), now(),
    '', '', '', ''
  );

  -- the handle_new_user trigger reads role from metadata, so the
  -- profiles row is already 'admin'. Confirm:
  update public.profiles
     set role = 'admin', full_name = 'Cafe Admin'
   where id = v_user_id;
end $$;

-- Verify
select id, email from auth.users where email = 'admin@cafeconnect.local';
select id, full_name, role from public.profiles
 where id in (select id from auth.users where email = 'admin@cafeconnect.local');

-- =========================================================================
-- OPTION B — via Supabase Dashboard (use this if Option A errored)
-- =========================================================================
--
-- 1. Authentication → Users → "Add user" (or "Invite")
-- 2. Email:    admin@cafeconnect.local
--    Password: CafeConnect2026!
--    Tick "Auto Confirm User" so they can sign in immediately.
-- 3. Click Create.
-- 4. Run this snippet here to promote the new user to admin:
--
--    update public.profiles
--       set role = 'admin', full_name = 'Cafe Admin'
--     where id = (select id from auth.users where email = 'admin@cafeconnect.local');
