begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table metalwork_private.teacher_password (
  singleton boolean primary key default true check (singleton),
  password_hash text not null
);

insert into metalwork_private.teacher_password (password_hash)
values (extensions.crypt('123456', extensions.gen_salt('bf', 10)));

create table metalwork_private.teacher_password_attempts (
  user_id uuid primary key references public.metalwork_profiles(user_id) on delete cascade,
  failures integer not null default 0,
  expires_at timestamptz not null
);

create table metalwork_private.teacher_access (
  user_id uuid not null references public.metalwork_profiles(user_id) on delete cascade,
  session_id uuid not null,
  expires_at timestamptz not null,
  primary key (user_id, session_id)
);

revoke all on table metalwork_private.teacher_password,
  metalwork_private.teacher_password_attempts, metalwork_private.teacher_access
from public, anon, authenticated;

-- A signed token can outlive sign-out. Require the session row to still exist.
create function metalwork_private.current_teacher_session()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select session.id
  from auth.sessions session
  join public.metalwork_profiles profile on profile.user_id = session.user_id
  where profile.role = 'teacher'
    and session.user_id = (select auth.uid())
    and session.id = case
      when (auth.jwt() ->> 'session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (auth.jwt() ->> 'session_id')::uuid
    end;
$$;

revoke all on function metalwork_private.current_teacher_session() from public, anon, authenticated;

create function public.metalwork_teacher_access_active()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from metalwork_private.teacher_access access
    where access.user_id = (select auth.uid())
      and access.session_id = metalwork_private.current_teacher_session()
      and access.expires_at > now()
  );
$$;

create function public.metalwork_unlock_teacher(password text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_session uuid := metalwork_private.current_teacher_session();
  attempt metalwork_private.teacher_password_attempts%rowtype;
  window_end timestamptz := now() + interval '15 minutes';
  stored_hash text;
begin
  if current_session is null or password is null or octet_length(password) > 72 then
    return false;
  end if;

  insert into metalwork_private.teacher_password_attempts (user_id, expires_at)
  values (actor, window_end) on conflict (user_id) do nothing;

  select * into attempt from metalwork_private.teacher_password_attempts
  where user_id = actor for update;

  if attempt.expires_at <= now() then
    attempt.failures := 0;
    attempt.expires_at := window_end;
  elsif attempt.failures >= 5 then
    return false;
  end if;

  select password_hash into stored_hash from metalwork_private.teacher_password where singleton;
  if stored_hash is null or extensions.crypt(password, stored_hash) <> stored_hash then
    update metalwork_private.teacher_password_attempts
    set failures = attempt.failures + 1, expires_at = attempt.expires_at where user_id = actor;
    return false;
  end if;

  update metalwork_private.teacher_password_attempts
  set failures = 0, expires_at = window_end where user_id = actor;
  delete from metalwork_private.teacher_access where user_id = actor and expires_at <= now();
  insert into metalwork_private.teacher_access (user_id, session_id, expires_at)
  values (actor, current_session, now() + interval '8 hours')
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  return true;
end;
$$;

revoke all on function public.metalwork_unlock_teacher(text), public.metalwork_teacher_access_active()
from public, anon, authenticated;
grant execute on function public.metalwork_unlock_teacher(text), public.metalwork_teacher_access_active()
to authenticated;

-- Preserve students' own data access and require an unlocked teacher session
-- for the existing same-class read allowance.
create or replace function metalwork_private.can_read_student(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select public.metalwork_teacher_access_active()) and exists (
    select 1
    from public.metalwork_profiles viewer
    join public.metalwork_profiles student on student.class_name = viewer.class_name
    where viewer.user_id = (select auth.uid()) and viewer.role = 'teacher'
      and student.user_id = target_user_id and student.role = 'student'
  );
$$;

commit;
