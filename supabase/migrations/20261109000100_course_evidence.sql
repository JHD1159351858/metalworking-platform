begin;

-- Accounts are assigned by an administrator. class_name is the full, unique
-- cohort/class label shared by that class's students and teachers.
create table public.metalwork_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40 and display_name = btrim(display_name)),
  student_number text check (char_length(student_number) between 1 and 40 and student_number = btrim(student_number)),
  class_name text not null check (char_length(class_name) between 1 and 80 and class_name = btrim(class_name)),
  role text not null check (role in ('student', 'teacher'))
);

create table public.metalwork_pre_assessments (
  user_id uuid not null references public.metalwork_profiles(user_id) on delete cascade,
  trade_id text not null check (trade_id in ('lathe', 'milling', 'wire', 'turning', 'fitting')),
  experience text not null check (experience in ('第一次学习', '看过相关资料或演示', '参加过相关实训')),
  confidence text not null check (confidence in ('需要从基础开始', '了解一些，想再巩固', '基本清楚')),
  focus text not null check (focus in ('设备认知', '实训安全', '图纸与工艺', '程序理解', '题库练习')),
  note text not null default '' check (char_length(note) <= 500),
  answers jsonb not null check (
    (answers -> 'safety' in ('"0"'::jsonb, '"1"'::jsonb, '"2"'::jsonb)) is true
    and (answers -> 'drawing' in ('"0"'::jsonb, '"1"'::jsonb, '"2"'::jsonb)) is true
    and (answers -> 'program' in ('"0"'::jsonb, '"1"'::jsonb, '"2"'::jsonb)) is true
    and answers = jsonb_build_object('safety', answers -> 'safety', 'drawing', answers -> 'drawing', 'program', answers -> 'program')
  ),
  score integer generated always as (
    round(100.0 * (
      ((answers ->> 'safety') = '0')::integer
      + ((answers ->> 'drawing') = '1')::integer
      + ((answers ->> 'program') = '2')::integer
    ) / 3)::integer
  ) stored,
  updated_at timestamptz not null default now(),
  primary key (user_id, trade_id)
);

create table public.metalwork_course_feedback (
  id uuid primary key,
  user_id uuid not null references public.metalwork_profiles(user_id) on delete cascade,
  trade_id text not null check (trade_id in ('lathe', 'milling', 'wire', 'turning', 'fitting')),
  type text not null check (type in ('学习心得', '给老师的建议', '课程建议')),
  text text not null check (char_length(text) <= 1000 and text ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);

create index metalwork_course_feedback_student_trade on public.metalwork_course_feedback(user_id, trade_id, created_at desc);

create schema metalwork_private;
revoke all on schema metalwork_private from public;
grant usage on schema metalwork_private to authenticated;

-- This avoids a recursive policy when authorizing reads of the profile table.
-- The actor is derived from Supabase Auth. Neither the class nor the role is
-- taken from a client parameter or writable auth user metadata.
create function metalwork_private.can_read_student(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.metalwork_profiles viewer
    join public.metalwork_profiles student on student.class_name = viewer.class_name
    where viewer.user_id = (select auth.uid()) and viewer.role = 'teacher'
      and student.user_id = target_user_id and student.role = 'student'
  );
$$;

revoke all on function metalwork_private.can_read_student(uuid) from public, anon, authenticated;
grant execute on function metalwork_private.can_read_student(uuid) to authenticated;

create function metalwork_private.update_pre_assessment()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.user_id <> old.user_id or new.trade_id <> old.trade_id then
    raise exception 'Course evidence keys cannot change' using errcode = '23514';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function metalwork_private.update_pre_assessment() from public, anon, authenticated;
create trigger metalwork_pre_assessment_update
before update on public.metalwork_pre_assessments
for each row execute function metalwork_private.update_pre_assessment();

alter table public.metalwork_profiles enable row level security;
alter table public.metalwork_pre_assessments enable row level security;
alter table public.metalwork_course_feedback enable row level security;

revoke all on table public.metalwork_profiles, public.metalwork_pre_assessments, public.metalwork_course_feedback from public, anon, authenticated;
grant select on table public.metalwork_profiles, public.metalwork_pre_assessments, public.metalwork_course_feedback to authenticated;

grant insert (user_id, trade_id, experience, confidence, focus, note, answers),
      update (user_id, trade_id, experience, confidence, focus, note, answers)
  on public.metalwork_pre_assessments to authenticated;
grant insert (id, user_id, trade_id, type, text) on public.metalwork_course_feedback to authenticated;

create policy metalwork_read_profiles on public.metalwork_profiles
for select to authenticated using (
  user_id = (select auth.uid()) or metalwork_private.can_read_student(user_id)
);

create policy metalwork_read_pre_assessments on public.metalwork_pre_assessments
for select to authenticated using (
  user_id = (select auth.uid()) or metalwork_private.can_read_student(user_id)
);

create policy metalwork_insert_own_pre_assessment on public.metalwork_pre_assessments
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.metalwork_profiles p where p.user_id = (select auth.uid()) and p.role = 'student'
  )
);

create policy metalwork_update_own_pre_assessment on public.metalwork_pre_assessments
for update to authenticated
using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.metalwork_profiles p where p.user_id = (select auth.uid()) and p.role = 'student'
  )
)
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.metalwork_profiles p where p.user_id = (select auth.uid()) and p.role = 'student'
  )
);

create policy metalwork_read_course_feedback on public.metalwork_course_feedback
for select to authenticated using (
  user_id = (select auth.uid()) or metalwork_private.can_read_student(user_id)
);

create policy metalwork_insert_own_course_feedback on public.metalwork_course_feedback
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.metalwork_profiles p where p.user_id = (select auth.uid()) and p.role = 'student'
  )
);

commit;
