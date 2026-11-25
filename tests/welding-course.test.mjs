import assert from 'node:assert/strict';
import test from 'node:test';
import { getCoursePath } from '../src/learning-data.js';
import { mistakeHistory } from '../src/mistake-history.js';
import { recommendMistakeQuestions } from '../src/mistake-recommendations.js';
import { weldingQuestions as preQuestions } from '../src/welding-assessment.js';
import { weldingLessons, weldingQuestions, weldingRubric } from '../src/welding-course.js';

const trade = { id: 'welding' };
test('welding practical requires the questionnaire, micro-lesson and theory pass, independently of electives', () => {
  const record = { videos: {}, attempts: [{ passed: true }], submissions: [], feedback: [] };
  const practical = () => getCoursePath(record, trade).find(step => step.id === 'practical');
  assert.equal(practical().locked, true);
  record.preAssessment = { score: 90 };
  assert.equal(practical().locked, true);
  const required = weldingLessons.filter(lesson => !lesson.elective);
  assert.equal(required.length, 1);
  record.videos[required[0].id] = { completed: true };
  assert.equal(practical().locked, false);
  record.attempts[0].passed = false;
  assert.equal(practical().locked, true);
  assert.equal(weldingRubric.reduce((sum, item) => sum + item.max, 0), 60);
});

test('welding safety errors in pre-assessment and practice are both traceable, with course-specific follow-up', () => {
  const q = preQuestions[0];
  const wrong = (q.answer + 1) % q.options.length;
  const record = {
    preAssessment: { tradeId: trade.id, at: '2026-11-24T01:00:00Z', answers: { [q.id]: String(wrong) } },
    practice: [{ at: '2026-11-24T01:01:00Z', details: [{ id: q.id, selectedIndex: wrong, correct: false }] }],
  };
  const mistakes = mistakeHistory(record, trade);
  assert.equal(mistakes.length, 1);
  assert.equal(mistakes[0].source, '课前测评');
  assert.equal(mistakes[0].wrongCount, 2);
  assert.ok(mistakes.every(item => item.prompt === q.prompt && item.selectedText === q.options[wrong]));
  const suggestions = recommendMistakeQuestions(mistakes, record, 10, weldingQuestions);
  assert.ok(suggestions.length && suggestions.every(item => weldingQuestions.includes(item.question)));
});
