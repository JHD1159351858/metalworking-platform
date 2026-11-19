import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { questions, gradeAttempt, loadRecord, saveRecord, getSummary, getCoursePath, rememberStudent, readLocalStudents } from '../src/learning-data.js';

beforeEach(() => {
  const items = new Map();
  globalThis.localStorage = {
    get length() { return items.size; },
    key: index => [...items.keys()][index] ?? null,
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

test('old records get the new course fields without losing theory eligibility', () => {
  const student = { id: 'returning-student' };
  const trade = { id: 'lathe' };
  saveRecord(student, trade, { attempts: [{ passed: true }] });
  const record = loadRecord(student, trade);
  assert.deepEqual(record.videoNotes, {});
  assert.equal(record.preAssessment, null);
  assert.deepEqual(record.feedback, []);
  assert.equal(getCoursePath(record)[2].locked, false);

  const newStudent = { id: 'new-student' };
  const newRecord = { ...loadRecord(newStudent, trade), preAssessment: { score: 100 }, videoNotes: { intro: '安全规范' } };
  saveRecord(newStudent, trade, newRecord);
  assert.equal(getCoursePath(loadRecord(newStudent, trade))[0].complete, true);
  assert.equal(getCoursePath(loadRecord(newStudent, trade))[2].locked, true);
  assert.deepEqual(loadRecord(student, trade).videoNotes, {});
});

test('the local roster keeps each saved identity and its current trade data', () => {
  const lathe = { id: 'lathe' };
  const mill = { id: 'milling' };
  const first = { id: '2026:一', name: '小陈', className: '金工一班', major: '机械设计' };
  const second = { id: 'student-b', name: '小王', className: '金工二班', studentNumber: '0102' };
  assert.deepEqual(readLocalStudents(lathe), []);
  rememberStudent(first);
  rememberStudent(second);
  rememberStudent({ id: 'teacher', name: '教师', role: 'teacher' });
  rememberStudent({ id: 'invalid', name: ' ' });
  saveRecord(first, lathe, { preAssessment: { score: 100 }, preAssessmentDraft: { note: '未提交' } });
  saveRecord(first, mill, { preAssessment: { score: 80 } });
  localStorage.setItem('metal-profile', JSON.stringify(second));

  const roster = new Map(readLocalStudents(lathe).map(student => [student.profile.id, student]));
  assert.deepEqual([...roster.keys()], [first.id, second.id]);
  assert.equal(roster.get(first.id).profile.className, '金工一班');
  assert.equal(roster.get(first.id).profile.studentNumber, first.id);
  assert.equal(roster.get(first.id).record.preAssessment.score, 100);
  assert.equal('preAssessmentDraft' in roster.get(first.id).record, false);
  assert.equal(roster.get(second.id).profile.studentNumber, '0102');
  assert.equal(roster.get(second.id).record.preAssessment, null);
  assert.equal(readLocalStudents(mill).find(student => student.profile.id === first.id).record.preAssessment.score, 80);
});

test('the local roster reads legacy students without copying records from another trade', () => {
  const lathe = { id: 'lathe' };
  const mill = { id: 'milling' };
  const legacy = { id: '历史:学生' };
  const current = { id: 'current', name: '小张', className: '机械一班' };
  saveRecord(legacy, lathe, { attempts: [{ score: 85 }] });
  saveRecord({ id: 'mill-only' }, mill, { feedback: [{ text: '课程建议' }] });
  localStorage.setItem('metal-profile', JSON.stringify(current));
  localStorage.setItem('metalwork:record:v1:%:lathe', '{}');

  const roster = readLocalStudents(lathe);
  assert.deepEqual(roster.map(student => student.profile.id), [current.id, legacy.id]);
  assert.equal(roster[0].profile.name, current.name);
  assert.equal(roster[1].profile.name, legacy.id);
  assert.equal(roster[1].profile.className, '班级未知');
  assert.deepEqual(roster[1].record.attempts, [{ score: 85 }]);
});
