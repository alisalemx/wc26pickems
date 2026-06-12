-- Proper auth: Google OAuth + email/password.
-- OAuth users have no sign-up form to pick a handle, so they get an
-- auto-generated one flagged as "not yet chosen"; the app then prompts them.
-- Email/password sign-ups still pass a username in metadata and are done.

-- Track whether the user has deliberately picked their handle (vs. the
-- email-derived fallback assigned on OAuth sign-up).
alter table public.profiles
  add column username_chosen boolean not null default false;

-- Update the new-user trigger to set the flag appropriately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := nullif(new.raw_user_meta_data ->> 'username', '');
  base text;
  candidate text;
  suffix int := 0;
begin
  if requested is not null then
    -- Username chosen at sign-up (email/password path): trust it. The format +
    -- unique constraints reject anything malformed or taken, failing sign-up
    -- cleanly. Marked chosen so the app won't prompt for a handle.
    insert into public.profiles (id, username, username_chosen)
    values (new.id, lower(requested), true);
    return new;
  end if;

  -- Fallback (OAuth, or any path with no username): derive a valid,
  -- guaranteed-unique handle from the email local-part. Left unchosen so the
  -- app prompts the user to pick a real handle on first sign-in.
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  base := substr(base, 1, 20);
  if length(base) < 3 then
    base := base || 'fan';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := substr(base, 1, 16) || suffix::text;
  end loop;

  insert into public.profiles (id, username, username_chosen)
  values (new.id, candidate, false);
  return new;
end;
$$;

-- Lets a signed-in user set/change their own handle through one validated path,
-- which also flips username_chosen. Centralizing this avoids widening the
-- column grant on profiles (which only exposes the username column to updates).
-- Raises on a malformed or already-taken handle so the client can show why.
create or replace function public.set_username(name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  handle text := lower(name);
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if handle !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username format' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.profiles
    where username = handle and id <> uid
  ) then
    raise exception 'username taken' using errcode = '23505';
  end if;

  update public.profiles
  set username = handle, username_chosen = true
  where id = uid;
end;
$$;

grant execute on function public.set_username(text) to authenticated;
