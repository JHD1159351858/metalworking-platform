begin;

-- The first completed assessment is the permanent course-entry record.
-- Repeated submissions may read it but cannot replace its answers or timestamp.
revoke update on public.metalwork_pre_assessments from authenticated;
revoke update (user_id, trade_id, experience, confidence, focus, note, answers)
  on public.metalwork_pre_assessments from authenticated;

drop policy if exists metalwork_update_own_pre_assessment
  on public.metalwork_pre_assessments;

commit;
