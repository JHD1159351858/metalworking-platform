import test from 'node:test';
import assert from 'node:assert/strict';
import { courseSuggestions, coordinateClassSummary, learningSnapshot } from '../src/course-recommendations.js';

const initial = { chapterId: '8.1', id: 'wrong', at: '2026-11-18T10:00:00Z', topic: '零点与方向', cause: 'origin', correct: false, transfer: false, assisted: false };
const retried = { ...initial, id: 'retry', at: '2026-11-18T10:01:00Z', cause: null, correct: true, assisted: true };
const independent = { ...retried, id: 'new-figure', at: '2026-11-18T10:02:00Z', assisted: false, transfer: true };

test('different coordinate mistakes get different hints, a prompted retry stays in the plan and an independent transfer retires it', () => {
  const suggestions = casePractice => courseSuggestions({ casePractice });
  assert.match(suggestions([initial])[0].reason, /零点/);
  assert.match(suggestions([{ ...initial, cause: 'direction' }])[0].reason, /正方向/);
  assert.equal(suggestions([initial, retried])[0].target.chapterId, '8.1');
  assert.ok(suggestions([initial, retried, independent]).every(item => item.target?.chapterId !== '8.1'));
});

test('teacher return deep-links to the requested field and a resubmission clears the request', () => {
  const submission = { id: 'a', status: '需补交材料', review: { comment: '注明测量位置', field: 'measurements' } };
  const record = { submissions: [submission], casePractice: [initial] };
  assert.deepEqual(courseSuggestions(record)[0].target, { field: 'measurements' });
  assert.equal(courseSuggestions(record)[0].reason, '注明测量位置');
  record.submissions.push({ id: 'b', status: '待教师评价' });
  assert.ok(courseSuggestions(record).every(item => item.view !== 'practical'));
});

test('a learner can skip a particular suggestion or request another chapter without losing the original evidence', () => {
  const record = { casePractice: [initial], skippedSuggestions: ['drill-wrong'], studyPreference: { chapterId: '8.4', at: '2026-11-18T11:00:00Z', note: '想先读程序' } };
  const picks = courseSuggestions(record);
  assert.equal(picks[0].target.chapterId, '8.4');
  assert.ok(picks.every(item => item.key !== 'drill-wrong'));
  assert.equal(record.casePractice.length, 1);
});

test('class counts use unique students and distinguish a failed independent retest from a prompted answer', () => {
  const students = [[initial, retried, independent], [initial, { ...independent, correct: false }], [], [initial, { ...retried, transfer: true }]].map(casePractice => ({ record: { casePractice } }));
  assert.deepEqual(coordinateClassSummary(students), { participated: 3, missedOrigin: 3, stillMissed: 1, independent: 1 });
});


test('combines repeated chapter misses, exam answers and case observations, and retires corrected evidence independently', () => {
  const detail = { id: 'cnc-81-1', topic: '坐标基准', correct: false, category: '工艺理论' };
  const attempt = (id, day, correct) => ({
    id, at: '2026-11-' + day + 'T08:00:00Z', details: [{ ...detail, correct }], score: correct ? 100 : 0,
  });
  const first = { ...attempt('d1', '11', false), chapterId: '8.1', correct: false };
  const record = { completedChapters: { '8.1': true }, practice: [first], attempts: [attempt('exam', '12', false)],
    casePractice: [initial] };
  const [combined] = courseSuggestions(record);
  assert.deepEqual(combined.target, { chapterId: '8.1' });
  assert.match(combined.reason, /找对零点/);
  assert.match(combined.reason, /连续答错 2 次/);
  assert.match(combined.reason, /已标记为已读/);
  assert.equal(combined.followUp.target.activity, 'case');
  record.practice.push({ ...attempt('d2', '13', true), chapterId: '8.1', correct: true });
  assert.doesNotMatch(courseSuggestions(record)[0].reason, /连续答错/);
  record.casePractice.push({ ...independent, caseId: 'case-8.1' });
  assert.ok(courseSuggestions(record).every(item => item.target?.chapterId !== '8.1'));
});

test('resolving a different case does not hide the exact case which still needs a retest', () => {
  const one = { ...initial, caseId: 'case-8.1-origin', topic: '改换零点' };
  const other = { ...independent, caseId: 'case-8.1-table', topic: '点位表' };
  const [pick] = courseSuggestions({ casePractice: [one, other] });
  assert.deepEqual(pick.target, { chapterId: '8.1', activity: 'case', caseId: one.caseId });
  assert.equal(coordinateClassSummary([{ record: { casePractice: [one, other] } }]).participated, 0);
});

test('cold start, a partial video, and reading completion produce actionable routes without inventing mistakes', () => {
  assert.equal(courseSuggestions({})[0].view, 'pre');
  const record = { videos: { intro: { watchedSeconds: 42, position: 73, duration: 420 } }, completedChapters: { '8.3': true } };
  let picks = courseSuggestions(record);
  assert.equal(picks[0].target.lessonId, 'intro');
  assert.match(picks[0].reason, /1:13/);
  assert.ok(picks.some(item => item.target?.chapterId === '8.3' && item.label === '读后应用'));
  record.videos.intro.completed = true;
  picks = courseSuggestions(record);
  assert.ok(picks.every(item => item.key !== 'resume-intro'));
  assert.ok(picks.every(item => !item.reason.includes('失分')));
});

test('saved survey informs recommendations until supported learning resolves its direction', () => {
  const record = { preAssessment: { focus: '程序理解', answers: { safety: '0', drawing: '1', program: '2' } } };
  assert.equal(courseSuggestions(record)[0].target.chapterId, '8.4');
  record.casePractice = [{ chapterId: '8.4', correct: true, assisted: false, transfer: true, at: '2026-11-18', id: 'program-check' }];
  assert.ok(courseSuggestions(record).every(item => item.key !== 'pre-program'));
});

test('student snapshot counts only the course units and uses the saved attempt and teacher fields', () => {
  const snapshot = learningSnapshot({ videos: { intro: { completed: true }, other: { completed: true } },
    completedChapters: { '8.2': true, program: true }, attempts: [{ passed: true, score: 90 }],
    submissions: [{ status: '需补交材料', review: { field: 'measurements' } }] });
  const row = label => snapshot.find(item => item.label === label);
  assert.equal(row('教学视频').value, '1 / 4');
  assert.equal(row('课程章节').value, '1 / 6');
  assert.equal(row('综合测评').value, '已达标');
  assert.equal(row('实操与评阅').detail, '测量记录');
});

