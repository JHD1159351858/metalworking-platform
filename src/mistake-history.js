import { answerIndex, knowledge, questions } from './learning-data.js';
import { cncAssessmentQuestions, cncPracticeQuestions } from './cnc-course.js';
import { chapterCases, checkCoordinate, coordinateFigure, recordedCaseId, recordedCaseRound } from './case-exercises.js';
import { literacyQuestions } from './literacy-questions.js';

const examReferences = {
  q1: ['8.2', 'safety'], q2: ['8.5', 'alarm-handling'], q3: ['8.4', 'program'],
  q4: ['8.3', 'drawing'], q5: ['8.2', 'assessment'],
};
const questionBank = new Map([
  ...questions.map(q => {
    const [chapterId, reference] = examReferences[q.id];
    return { ...q, chapterId, explanation: knowledge.find(item => item.id === reference)?.content };
  }),
  ...cncAssessmentQuestions, ...cncPracticeQuestions,
  ...literacyQuestions.map(q => ({ ...q, id: 'pre-' + q.id, category: q.id === 'safety' ? '安全知识' : '素养测评' })),
].map(q => [q.id, q]));

function caseContent(entry) {
  const caseId = recordedCaseId(entry);
  const task = chapterCases(entry.chapterId).find(item => item.id === caseId);
  const round = recordedCaseRound(entry);
  if (!task || round === null) return null;
  const base = { key: caseId + '-' + round, questionId: caseId + '-' + round, caseId, round,
    chapterId: entry.chapterId, topic: task.topic, category: '案例练习' };
  if (caseId === 'case-8.1') {
    const figure = coordinateFigure(round);
    const right = figure.pointX > figure.originX;
    const sign = right === figure.rightward ? '正' : '负';
    const response = entry.response;
    return { ...base, prompt: `${round ? '复测图 ' + round : '图乙'}，O 标在${figure.origin}，${figure.point} 在 O 的${right ? '右' : '左'}侧，+Z 箭头向${figure.rightward ? '右' : '左'}。指出零点位置和该点的轴向读数符号。`,
      options: [], correctText: figure.origin + ' · ' + sign,
      selectedText: response?.origin && response?.sign ? response.origin + ' · ' + response.sign : '',
      explanation: checkCoordinate(figure, figure.origin, sign).feedback, cause: entry.cause || '' };
  }
  const exercise = round === 0 ? task : task.transfer;
  if (!exercise || round > 1) return null;
  return { ...base, prompt: exercise.situation + ' ' + exercise.prompt, options: exercise.options,
    selectedText: exercise.options[answerIndex(entry.response?.option, exercise.options)] || '',
    correctText: exercise.options[exercise.correctIndex], explanation: exercise.feedback };
}

export function mistakeHistory(record) {
  const mistakes = new Map();
  const events = [];
  const pre = record.preAssessment;
  if (pre) {
    for (const q of literacyQuestions) {
      const selectedIndex = answerIndex(pre.answers?.[q.id], q.options);
      if (selectedIndex !== null) events.push({ id: 'pre-' + q.id, at: pre.at, source: '课前测评',
        correct: selectedIndex === q.answer, selectedIndex });
    }
  }
  for (const [list, source] of [[record.practice, '章节练习'], [record.attempts, '综合测评']]) {
    for (const entry of list || []) {
      for (const detail of entry.details || []) {
        events.push({ ...detail, at: entry.at, source: entry.mode === 'mistake-review' ? '专项练习' : source });
      }
    }
  }
  for (const entry of record.casePractice || []) {
    const content = caseContent(entry);
    if (content) events.push({ id: content.key, content, at: entry.at, correct: entry.correct, source: '案例练习' });
  }
  events.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  for (const event of events) {
    if (typeof event.correct !== 'boolean') continue;
    const prior = mistakes.get(event.id);
    if (event.correct) {
      if (prior) prior.resolved = true;
      continue;
    }
    let content = event.content;
    if (!content) {
      const q = questionBank.get(event.id);
      if (!q) continue;
      content = { key: q.id, questionId: q.id, chapterId: q.chapterId, topic: q.topic,
        category: q.category, prompt: q.prompt, options: q.options, correctText: q.options[q.answer],
        selectedText: q.options[answerIndex(event.selectedIndex, q.options)] || '', explanation: q.explanation || '' };
    }
    mistakes.set(event.id, { ...content, source: prior?.source || event.source,
      wrongCount: (prior?.wrongCount || 0) + 1, lastWrongAt: event.at || '', resolved: false });
  }
  return [...mistakes.values()].sort((a,b) => Number(a.resolved) - Number(b.resolved) || b.lastWrongAt.localeCompare(a.lastWrongAt));
}
