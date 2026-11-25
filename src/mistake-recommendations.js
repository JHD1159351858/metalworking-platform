import { cncPracticeQuestions } from './cnc-course.js';

// Chinese character pairs keep technical terms searchable without a separate dictionary.
function termCounts({ topic = '', prompt = '', explanation = '' }) {
  const counts = new Map();
  for (const [text, weight] of [[topic, 4], [prompt, 2], [explanation, 1]]) {
    const words = text.toLowerCase().match(/[\u3400-\u9fff]+|[a-z]+\d*/g) || [];
    for (const word of words) {
      if (word.length === 1 || /^[a-z]/.test(word)) {
        counts.set(word, (counts.get(word) || 0) + weight);
      } else {
        for (let i = 1; i < word.length; i++) {
          const term = word.slice(i - 1, i + 1);
          counts.set(term, (counts.get(term) || 0) + weight);
        }
      }
    }
  }
  return counts;
}

function unitVector(counts, idf) {
  const vector = new Map();
  let sum = 0;
  for (const [term, count] of counts) {
    if (!idf.has(term)) continue;
    const weight = Math.log1p(count) * idf.get(term);
    vector.set(term, weight);
    sum += weight * weight;
  }
  const norm = Math.sqrt(sum);
  for (const [term, weight] of vector) vector.set(term, weight / norm);
  return vector;
}

const bankIndexes = new WeakMap();
function bankIndex(bank) {
  if (bankIndexes.has(bank)) return bankIndexes.get(bank);
  const rows = bank.map(question => ({ question, counts: termCounts(question) }));
  const idf = new Map();
  for (const { counts } of rows) {
    for (const term of counts.keys()) idf.set(term, (idf.get(term) || 0) + 1);
  }
  for (const [term, frequency] of idf) idf.set(term, Math.log((1 + rows.length) / (1 + frequency)));
  const byChapter = new Map();
  for (const { question, counts } of rows) {
    if (!byChapter.has(question.chapterId)) byChapter.set(question.chapterId, []);
    byChapter.get(question.chapterId).push({
      question, vector: unitVector(counts, idf), topicVector: unitVector(termCounts({ topic: question.topic }), idf),
      template: question.prompt.replace(/[+−-]?\d+(?:\.\d+)?/g, '#'),
    });
  }
  const index = { idf, byChapter };
  bankIndexes.set(bank, index);
  return index;
}

function similarity(a, b) {
  let dot = 0;
  for (const [term, weight] of a) dot += weight * (b.get(term) || 0);
  return dot;
}

export function recommendMistakeQuestions(mistakes, record, limit = 10, bank = cncPracticeQuestions) {
  const pending = mistakes.filter(item => !item.resolved && item.chapterId && item.topic)
    .sort((a, b) => b.wrongCount - a.wrongCount || String(b.lastWrongAt || '').localeCompare(String(a.lastWrongAt || '')));
  if (!pending.length || limit <= 0) return [];
  const { idf, byChapter } = bankIndex(bank);
  const lastAnswers = new Map();
  const rounds = [...(record.practice || []), ...(record.attempts || [])]
    .sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  for (const round of rounds) {
    for (const answer of round.details || []) {
      if (typeof answer.correct === 'boolean') lastAnswers.set(answer.id, answer.correct);
    }
  }
  // Retrying the original is a separate action. This list offers related bank questions.
  const omitted = new Set(mistakes.map(item => item.questionId));
  const originalPrompts = new Set(mistakes.map(item => item.prompt));
  const usedTemplates = new Set();
  const coveredTopics = new Set();
  const queues = [];
  const result = [];

  function takeNext(queue) {
    while (queue.choices.length) {
      const { question, template, score } = queue.choices.shift();
      if (omitted.has(question.id) || usedTemplates.has(template)) continue;
      omitted.add(question.id);
      usedTemplates.add(template);
      const miss = queue.mistake;
      const link = score >= 0.085 ? '相关知识点' : '同章延伸练习';
      const cause = queue.focus === miss.topic ? '' : `最近错在${queue.focus}，`;
      result.push({ question, mistakeKey: miss.key,
        reason: `「${miss.topic}」答错 ${miss.wrongCount} 次，${cause}${link}为「${question.topic}」。` });
      return true;
    }
    return false;
  }

  // Give each distinct weak topic a turn before assigning a second related exercise.
  for (const mistake of pending) {
    const focus = mistake.cause === 'origin' ? '坐标零点定位' : mistake.cause === 'direction' ? '轴向正方向与读数符号' : mistake.topic;
    const key = mistake.chapterId + '/' + focus;
    if (coveredTopics.has(key)) continue;
    const vector = unitVector(termCounts(mistake), idf);
    const topicVector = unitVector(termCounts({ topic: focus }), idf);
    const candidates = byChapter.get(mistake.chapterId) || [];
    const ranked = candidates
      .filter(({ question: q }) => !omitted.has(q.id) && !originalPrompts.has(q.prompt) && lastAnswers.get(q.id) !== true)
      .map(row => ({ ...row, score: similarity(vector, row.vector) + 0.65 * similarity(topicVector, row.topicVector) }))
      .sort((a, b) => Number(lastAnswers.has(a.question.id)) - Number(lastAnswers.has(b.question.id)) || b.score - a.score);
    const close = ranked.filter(row => row.score >= 0.085);
    const queue = { mistake, focus, choices: close.length ? close : ranked.slice(0, 3) };
    if (takeNext(queue)) {
      coveredTopics.add(key);
      queues.push(queue);
      if (result.length === limit) return result;
    }
  }
  let added;
  do {
    added = false;
    for (const queue of queues) {
      if (takeNext(queue)) added = true;
      if (result.length === limit) return result;
    }
  } while (added);
  return result;
}
