begin;

alter table public.metalwork_course_feedback
  drop constraint metalwork_course_feedback_trade_id_check,
  add check (trade_id in ('lathe', 'milling', 'wire', 'turning', 'fitting', 'welding'));

-- Return null for missing, extra, non-string or out-of-range answers.
create function metalwork_private.pre_assessment_score(course text, responses jsonb)
returns integer language sql immutable strict set search_path = '' as $$
  with answer_key as (
    select case when course = 'welding' then
      '{"weld-safety-01":"1","weld-safety-02":"2","weld-safety-03":"1","weld-safety-04":"1","weld-safety-05":"1","weld-safety-06":"1","weld-safety-07":"1","weld-safety-08":"1","weld-safety-09":"0","weld-safety-10":"1"}'::jsonb
      else '{"safety":"0","drawing":"1","program":"2"}'::jsonb end as expected
  )
  select case when jsonb_typeof(responses) = 'object' then
    case when responses - array_agg(key) = '{}'::jsonb
      and bool_and(coalesce(jsonb_typeof(responses -> key) = 'string' and
        (responses ->> key) ~ (case when course = 'welding' then '^[0-3]$' else '^[0-2]$' end), false))
    then round(100.0 * count(*) filter (where responses -> key = value) / count(*))::integer end
  end
  from answer_key, jsonb_each(expected);
$$;
revoke all on function metalwork_private.pre_assessment_score(text, jsonb) from public;
grant execute on function metalwork_private.pre_assessment_score(text, jsonb) to authenticated;

-- Recompute the derived column from the existing answers; saved submissions,
-- timestamps, access policies and per-student/per-course uniqueness are preserved.
alter table public.metalwork_pre_assessments
  drop constraint metalwork_pre_assessments_trade_id_check,
  drop constraint metalwork_pre_assessments_focus_check,
  drop constraint metalwork_pre_assessments_answers_check,
  drop column score,
  add check (trade_id in ('lathe', 'milling', 'wire', 'turning', 'fitting', 'welding')),
  add check (case when trade_id = 'welding' then focus in ('焊接安全防护', '焊接设备与工艺', '焊缝缺陷识别')
    else focus in ('设备认知', '实训安全', '图纸与工艺', '程序理解', '题库练习') end);
alter table public.metalwork_pre_assessments add column score integer generated always as
  (metalwork_private.pre_assessment_score(trade_id, answers)) stored check (score is not null);

commit;
