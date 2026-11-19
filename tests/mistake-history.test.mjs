import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAttempt, questions } from '../src/learning-data.js';
import { cncPracticeQuestions } from '../src/cnc-course.js';
import { chapterCases, coordinateFigure } from '../src/case-exercises.js';
import { literacyQuestions } from '../src/literacy-questions.js';
import { mistakeHistory } from '../src/mistake-history.js';

const rules = { totalPass: 80, safetyAll: true };
const at = day => `2026-11-${day}T12:00:00Z`;

test('submitted chapter and exam answers retain option zero and previous errors after correction', () => {
  const exam = questions[0];
  const q = cncPracticeQuestions[0];
  const failed = gradeAttempt([exam], { [exam.id]: '0' }, rules);
  assert.equal(failed.details[0].selectedIndex, 0);
  assert.equal(gradeAttempt([exam], {}, rules).details[0].selectedIndex, null);
  const record = {
    attempts: [{ at: at(15), ...failed }],
    practice: [
      { at: at(14), details: [{ id: q.id, correct: false }] },
      { at: at(16), mode: 'mistake-review', details: [{ id: exam.id, correct: true, selectedIndex: exam.answer }] },
    ],
  };
  const [chapterMistake, examMistake] = mistakeHistory(record);
  assert.equal(chapterMistake.source, '章节练习');
  assert.equal(chapterMistake.selectedText, '');
  assert.equal(chapterMistake.correctText, q.options[q.answer]);
  assert.equal(examMistake.source, '综合测评');
  assert.equal(examMistake.selectedText, exam.options[0]);
  assert.equal(examMistake.wrongCount, 1);
  assert.equal(examMistake.resolved, true);
  record.practice.push({ at: at(17), mode: 'mistake-review', details: [{ id: exam.id, correct: false, selectedIndex: 2 }] });
  const again = mistakeHistory(record).find(item => item.key === exam.id);
  assert.equal(again.wrongCount, 2);
  assert.equal(again.resolved, false);
  assert.equal(again.selectedText, exam.options[2]);
  assert.equal(again.lastWrongAt, at(17));
});

test('only identifiable case variants are grouped and correction on another figure leaves the original open', () => {
  const original = chapterCases('8.2')[0];
  const coordinate = { chapterId: '8.1', caseId: 'case-8.1' };
  const record = { casePractice: [
    { ...coordinate, at: at(11), exerciseId: 'case-8.1-0', correct: false, response: { origin: '轴肩', sign: '正' } },
    { ...coordinate, at: at(13), round: 1, correct: true },
    { ...coordinate, at: at(12), round: 1, correct: false, response: { origin: '右端面', sign: '正' } },
    { ...coordinate, at: at(14), transfer: true, correct: false },
    { chapterId: '8.2', at: at(14), transfer: true, correct: false, response: { option: 0 } },
  ] };
  const mistakes = mistakeHistory(record);
  assert.equal(mistakes.length, 3);
  const drawing = mistakes.find(item => item.key === 'case-8.1-0');
  assert.equal(drawing.correctText, '右端面 · 负');
  assert.equal(drawing.selectedText, '轴肩 · 正');
  assert.equal(drawing.resolved, false);
  const transfer = mistakes.find(item => item.key === 'case-8.1-1');
  assert.ok(transfer.prompt.includes(coordinateFigure(1).point));
  assert.equal(transfer.resolved, true);
  const ordinary = mistakes.find(item => item.caseId === original.id);
  assert.equal(ordinary.round, 1);
  assert.equal(ordinary.correctText, original.transfer.options[original.transfer.correctIndex]);
  assert.equal(ordinary.selectedText, original.transfer.options[0]);
});

test('only submitted, identifiable literacy responses count, and practice corrects them independently', () => {
  const record = { preAssessment: { answers: { drawing: '0', program: '2' }, score: 67, focus: '设备认知', at: at(14) },
    preAssessmentDraft: { answers: { safety: '1' } }, practice: [{ at: at(15), mode: 'mistake-review',
      details: [{ id: 'pre-drawing', selectedIndex: 1, correct: true }] }] };
  const [item, ...others] = mistakeHistory(record);
  assert.equal(others.length, 0);
  assert.equal(item.key, 'pre-drawing');
  assert.equal(item.resolved, true);
  assert.equal(item.source, '课前测评');
  assert.equal(item.chapterId, '8.3');
  assert.equal(item.selectedText, literacyQuestions[1].options[0]);
  assert.equal(record.preAssessment.answers.drawing, '0');
  assert.deepEqual(mistakeHistory({ preAssessmentDraft: record.preAssessmentDraft,
    preAssessment: { score: 67 }, practice: [{ correct: false }, { details: [{ id: 'retired', correct: false }] }] }), []);
});
