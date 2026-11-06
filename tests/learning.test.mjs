import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { questions, gradeAttempt, loadRecord, saveRecord, getSummary } from '../src/learning-data.js';

beforeEach(() => {
  const items = new Map();
  globalThis.localStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  };
  globalThis.window = { dispatchEvent() {} };
});

const correctAnswers = () => Object.fromEntries(questions.map(q => [q.id, String(q.answer)]));
const rules = { totalPass: 80, safetyAll: true };

test('80 points with an incorrect safety answer does not unlock practical assessment', () => {
  const answers = correctAnswers();
  answers.q1 = '0';
  const result = gradeAttempt(questions, answers, rules);
  assert.equal(result.score, 80);
  assert.equal(result.safetyPassed, false);
  assert.equal(result.passed, false);
});

test('80 points with only a non-safety answer incorrect passes both requirements', () => {
  const answers = correctAnswers();
  answers.q3 = '0';
  const result = gradeAttempt(questions, answers, rules);
  assert.equal(result.score, 80);
  assert.equal(result.safetyPassed, true);
  assert.equal(result.passed, true);
});

test('retry history is retained and records stay separate for each student and trade', () => {
  const student = { id: 'student-a' };
  const otherStudent = { id: 'student-b' };
  const lathe = { id: 'lathe' };
  const mill = { id: 'mill' };
  const failed = { id: 'attempt-1', passed: false, score: 60 };
  const passed = { id: 'attempt-2', passed: true, score: 100 };

  const initial = loadRecord(student, lathe);
  saveRecord(student, lathe, { ...initial, attempts: [...initial.attempts, failed] });
  const retry = loadRecord(student, lathe);
  saveRecord(student, lathe, { ...retry, attempts: [...retry.attempts, passed] });

  assert.deepEqual(loadRecord(student, lathe).attempts, [failed, passed]);
  assert.equal(getSummary(student, lathe).attempts, 2);
  assert.equal(getSummary(student, lathe).examPassed, true);
  assert.deepEqual(loadRecord(otherStudent, lathe).attempts, []);
  assert.deepEqual(loadRecord(student, mill).attempts, []);
  assert.equal(getSummary(otherStudent, lathe).examPassed, false);
  assert.equal(getSummary(student, mill).examPassed, false);
});
