import test from 'node:test';
import assert from 'node:assert/strict';
import { cncPracticeQuestions, cncAssessmentQuestions } from '../src/cnc-course.js';
import { recommendMistakeQuestions } from '../src/mistake-recommendations.js';

const practiceIds = new Set(cncPracticeQuestions.map(q => q.id));
test('different diagnosed causes in coordinate cases receive separate recommendations', () => {
  const item = { chapterId: '8.1', topic: '阶梯轴的零点与轴向方向', prompt: '读图指出零点和方向', wrongCount: 1, resolved: false };
  const picks = recommendMistakeQuestions([
    { ...item, key: 'case-8.1-0', cause: 'origin' },
    { ...item, key: 'case-8.1-1', cause: 'direction' },
  ], {}, 2);
  assert.equal(new Set(picks.map(p => p.mistakeKey)).size, 2);
  assert.match(picks[0].reason, /最近错在坐标零点定位/);
  assert.match(picks[1].reason, /最近错在轴向正方向与读数符号/);
});

function miss(id, changes = {}) {
  const q = [...cncPracticeQuestions, ...cncAssessmentQuestions].find(item => item.id === id);
  return { ...q, key: 'quiz/' + id, questionId: id, wrongCount: 1, lastWrongAt: '2026-11-15', resolved: false, ...changes };
}

test('recommends concrete related questions for a single alarm mistake without redisplaying its original', () => {
  const alarm = miss('cnc-85-8');
  const picks = recommendMistakeQuestions([alarm], {}, 3);
  assert.equal(picks.length, 3);
  assert.equal(new Set(picks.map(pick => pick.question.id)).size, 3);
  assert.ok(picks.every(({ question, mistakeKey, reason }) =>
    question.chapterId === '8.5' && question.id !== alarm.questionId && practiceIds.has(question.id)
    && mistakeKey === alarm.key && reason.includes(alarm.topic)));
  assert.ok(picks.some(({ question }) => question.id === 'cnc-85-9'));
});

test('covers different weak points, prioritizes recurrence and uses recency to break ties', () => {
  const alarm = miss('cnc-85-8');
  const tolerance = miss('cnc-83-4', { wrongCount: 2 });
  const recent = miss('cnc-81-6', { lastWrongAt: '2026-11-18' });
  const picks = recommendMistakeQuestions([alarm, recent, tolerance], {}, 3);
  assert.deepEqual(picks.map(item => item.mistakeKey), [tolerance.key, recent.key, alarm.key]);
  assert.match(picks[0].question.topic, /公差|偏差/);
  assert.match(picks[1].question.topic, /直径|半径/);
});

test('uses only practice questions, removes solved weaknesses, honors subsequent correct answers and avoids copies', () => {
  const formal = miss('cnc-85-2');
  const solved = miss('cnc-83-4', { resolved: true });
  assert.deepEqual(recommendMistakeQuestions([solved], {}), []);
  assert.deepEqual(recommendMistakeQuestions([], {}), []);
  const first = recommendMistakeQuestions([formal], {}, 1)[0];
  assert.ok(first);
  const record = { practice: [
    { at: '2026-11-18', details: [{ id: first.question.id, correct: true }] },
    { at: '2026-11-17', details: [{ id: first.question.id, correct: false }] },
  ] };
  const picks = recommendMistakeQuestions([solved, formal], record);
  assert.ok(picks.length > 0 && picks.every(p => p.question.id !== first.question.id && p.question.chapterId === formal.chapterId));
  assert.ok(picks.every(p => practiceIds.has(p.question.id) && p.mistakeKey === formal.key));
  const calculation = miss('cnc-86-96');
  const shapes = recommendMistakeQuestions([calculation], {}).map(p => p.question.prompt.replace(/[+−-]?\d+(?:\.\d+)?/g, '#'));
  assert.equal(new Set(shapes).size, shapes.length);
});

test('a chapter case can prompt practice before a quiz, and an exhausted chapter yields no unrelated questions', () => {
  const caseMiss = { key: 'case/fixture', chapterId: '8.3', topic: '轴肩长度与允许偏差', prompt: '测量超出公差应如何记录？',
    explanation: '', wrongCount: 2, lastWrongAt: '2026-11-19', resolved: false };
  const picks = recommendMistakeQuestions([caseMiss], {}, 2);
  assert.equal(picks.length, 2);
  assert.ok(picks.every(p => p.question.chapterId === '8.3' && p.mistakeKey === caseMiss.key));
  const details = cncPracticeQuestions.filter(q => q.chapterId === '8.3').map(q => ({ id: q.id, correct: true }));
  assert.deepEqual(recommendMistakeQuestions([caseMiss], { practice: [{ details }] }), []);
});
