import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudyPlan } from '../src/study-plan.js';

const proficient = {
  experience: '参加过相关实训',
  confidence: '基本清楚',
  focus: '题库练习',
  answers: { safety: '0', drawing: '1', program: '2' },
};

test('a missed safety answer takes priority over novice status and a selected focus', () => {
  const plan = getStudyPlan({
    ...proficient,
    experience: '第一次学习',
    answers: { ...proficient.answers, safety: '1' },
  });
  assert.equal(plan.view, 'tutor');
  assert.equal(plan.targetId, 'safety');
  assert.match(plan.reason, /安全/);
});

test('a learner who needs basics starts at the introductory video', () => {
  const plan = getStudyPlan({
    ...proficient,
    confidence: '需要从基础开始',
    answers: { ...proficient.answers, drawing: '2' },
  });
  assert.equal(plan.view, 'video');
  assert.equal(plan.targetId, 'intro');
});

test('a learner with a knowledge gap starts at the matching chapter', () => {
  const drawingPlan = getStudyPlan({ ...proficient, answers: { ...proficient.answers, drawing: '0' } });
  const programPlan = getStudyPlan({ ...proficient, answers: { ...proficient.answers, program: '1' } });
  assert.equal(drawingPlan.view, 'tutor');
  assert.equal(drawingPlan.targetId, 'drawing');
  assert.equal(programPlan.view, 'tutor');
  assert.equal(programPlan.targetId, 'program');
});

test('a learner without a diagnosed gap starts with the focus chosen in the survey', () => {
  const expectedTargets = [
    ['设备认知', 'video', 'intro'],
    ['实训安全', 'tutor', 'safety'],
    ['图纸与工艺', 'tutor', 'drawing'],
    ['程序理解', 'tutor', 'program'],
    ['题库练习', 'theory', null],
  ];
  for (const [focus, view, targetId] of expectedTargets) {
    const plan = getStudyPlan({ ...proficient, focus });
    assert.equal(plan.view, view);
    assert.equal(plan.targetId, targetId);
  }
});

test('missing answers in an older record are not treated as incorrect', () => {
  const { answers, ...olderRecord } = proficient;
  const plan = getStudyPlan(olderRecord);
  assert.equal(plan.view, 'theory');
  assert.equal(plan.targetId, null);
});

test('without a pre-assessment there is no personalized plan', () => {
  assert.equal(getStudyPlan(null), null);
});
