import test from 'node:test';
import assert from 'node:assert/strict';
import { cncChapters, cncPracticeQuestions, cncAssessmentQuestions, drawChapterRound } from '../src/cnc-course.js';
import { questions, gradeAttempt } from '../src/learning-data.js';

test('each of the six chapter banks has 100 distinct, reviewable questions and excludes the formal assessment', () => {
  assert.equal(cncPracticeQuestions.length, 600);
  assert.equal(new Set(cncPracticeQuestions.map(q => q.id)).size, 600);
  assert.equal(new Set(cncPracticeQuestions.map(q => q.prompt)).size, 600);
  const exam = [...questions, ...cncAssessmentQuestions];
  assert.ok(cncPracticeQuestions.every(q => !exam.some(e => e.id === q.id || e.prompt === q.prompt)));
  for (const chapter of cncChapters) {
    const bank = cncPracticeQuestions.filter(q => q.chapterId === chapter.id);
    assert.equal(bank.length, 100);
    for (let n = 3; n <= 10; n++) assert.ok(bank.some(q => q.id === `cnc-${chapter.id.replace('.', '')}-${n}`));
    for (const q of bank) {
      assert.ok(q.id.startsWith(`cnc-${chapter.id.replace('.', '')}-`));
      assert.equal(new Set(q.options).size, 4);
      assert.ok(Number.isInteger(q.answer) && q.options[q.answer]);
      assert.ok(q.topic && q.explanation);
    }
  }
});

test('chapter rounds sample ten different questions without changing the source bank', t => {
  const random = t.mock.method(Math, 'random');
  for (const chapter of cncChapters) {
    const bank = cncPracticeQuestions.filter(q => q.chapterId === chapter.id);
    const original = bank.slice();
    random.mock.mockImplementation(() => 0.25);
    const first = drawChapterRound(bank);
    random.mock.mockImplementation(() => 0.75);
    const second = drawChapterRound(bank);
    for (const round of [first, second]) {
      assert.equal(new Set(round.map(q => q.id)).size, 10);
      assert.equal(round.length, 10);
      assert.ok(round.every(q => bank.includes(q)));
    }
    assert.ok(second.some(q => !first.includes(q)));
    assert.deepEqual(bank, original);
  }
});

test('the comprehensive assessment retains the original 17 questions and safety gate', () => {
  const exam = [...questions, ...cncAssessmentQuestions];
  assert.equal(exam.length, 17);
  assert.deepEqual(cncAssessmentQuestions.map(q => q.id),
    cncChapters.flatMap(ch => [1, 2].map(n => `cnc-${ch.id.replace('.', '')}-${n}`)));
  const safety = exam.filter(q => q.category === '安全知识');
  assert.equal(safety.length, 4);
  const answers = Object.fromEntries(exam.map(q => [q.id, q.answer]));
  answers[safety[0].id] = (safety[0].answer + 1) % safety[0].options.length;
  const result = gradeAttempt(exam, answers, { totalPass: 80, safetyAll: true });
  assert.ok(result.score >= 80);
  assert.equal(result.passed, false);
  assert.equal(result.safetyPassed, false);
});
