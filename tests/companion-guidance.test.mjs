import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompanionReply, getStarters, appendVideoTakeaway } from '../src/companion-guidance.js';
import { unitKnowledge } from '../src/unit-knowledge.js';

const coordinate = { chapterId: '8.1', questionId: 'case-8.1-1' };

test('a chapter case shortcut uses the selected scenario and pauses during a test', () => {
  const context = { view: 'tutor', chapterId: '8.1', caseId: 'case-8.1-datum-shift',
    questionId: 'case-8.1-datum-shift-0', caseHint: '先在同一条轴上标出三个位置。', caseTopic: '更换端面零点' };
  const [prompt] = getStarters(context);
  const turn = getCompanionReply(prompt, context);
  assert.equal(turn.reply, context.caseHint);
  assert.ok(turn.source.includes(context.caseTopic));
  assert.equal(getCompanionReply(prompt, { ...context, examActive: true }), null);
});

test('coordinate coaching follows the learner from origin confusion to a sign check', () => {
  const turns = [];
  const ask = query => {
    const turn = getCompanionReply(query, coordinate, { tutoring: turns });
    turns.push(turn);
    return turn;
  };
  assert.equal(ask('零件没动，为什么P点坐标会变？').step, 'diagnose');
  assert.equal(ask('我不确定从哪里量').step, 'origin');
  assert.equal(ask('从固定左端开始').step, 'origin');
  assert.equal(ask('从标出的 O 开始').step, 'direction');
  assert.equal(ask('应取正号').step, 'direction');
  assert.equal(ask('应取负号').step, 'finished');
});

test('a request for help uses the actual recent error and stays separate from an exam', () => {
  const ask = cause => getCompanionReply('给点提示', coordinate, { casePractice: [{ chapterId: '8.1', correct: false, cause }] });
  assert.equal(ask('direction').step, 'direction');
  assert.equal(ask('origin').step, 'origin');
  assert.equal(getCompanionReply('从固定左端开始', { ...coordinate, examActive: true }, { tutoring: [ask('origin')] }), null);
  assert.equal(getCompanionReply('应取负号', { chapterId: '8.5' }, { tutoring: [ask('direction')] }).step, undefined);
});

test('chapter follow-ups, video sources and missing evidence are distinct', () => {
  const context = { chapterId: '8.3' };
  const first = getCompanionReply('图纸上的要求怎样写进工艺方案？', context);
  const retry = getCompanionReply('我找不到图纸要求', context, { tutoring: [first] });
  assert.match(retry.reply, /尺寸、单位/);
  assert.match(retry.source, /8\.3/);
  assert.match(getCompanionReply('我对画面中的图有疑问', { lessonId: 'safety' }).reply, /补充图号/);
  assert.match(getCompanionReply('这节视频的学习要点是什么？', { lessonId: 'safety' }).source, /课程目录/);
  assert.match(getCompanionReply('这个未知牌号能用吗', context).reply, /补充章节/);
});

test('each unit answers from the selected reading, its example and its own pitfalls', () => {
  for (const [chapterId, unit] of Object.entries(unitKnowledge)) {
    const context = { view: 'tutor', chapterId };
    for (const section of unit.sections) {
      const reply = getCompanionReply(`请讲解“${section.title}”。`, { ...context, readingTopic: section.title });
      assert.equal(reply.reply, section.text);
      assert.ok(reply.source.endsWith(section.title));
    }
    assert.equal(getCompanionReply('能举个例子吗？', context).reply, unit.example.text);
    const pitfalls = getCompanionReply('有哪些常见误区？', context);
    for (const entry of unit.pitfalls) assert.ok(pitfalls.reply.includes(entry.text));
  }
});

test('typed terms retrieve matching reading passages only in the current unit', () => {
  for (const [chapterId, term, section] of [
    ['8.1', '参考点', 1], ['8.2', '卡盘', 0], ['8.3', '量具', 2],
    ['8.4', 'g01', 2], ['8.5', '每转进给', 1], ['8.6', '后置处理', 2],
  ]) {
    assert.equal(getCompanionReply(`什么是${term}？`, { chapterId }).reply, unitKnowledge[chapterId].sections[section].text);
  }
  const context = { chapterId: '8.6' };
  assert.doesNotMatch(getCompanionReply('什么是卡盘？', context).source || '', /单元基础知识/);
  assert.equal(getCompanionReply('举个例子', { ...context, examActive: true }), null);
});

test('review uses the latest graded attempt and gives priority to its own safety mistake', () => {
  const record = { attempts: [{ details: [] }, { details: [
    { id: 'cnc-81-1', topic: '坐标', category: '工艺理论', correct: false },
    { id: 'q2', topic: '异常情况处置', category: '安全知识', correct: false },
  ] }] };
  const response = getCompanionReply('帮我回顾最近一次综合测评', {}, record);
  assert.match(response.reply, /2 道错题/);
  assert.match(response.reply, /异常情况处置/);
  assert.match(response.options[0], /报警/);
  assert.equal(getCompanionReply('错题', { examActive: true }, record), null);
});

test('practical reading uses the correct paper or submitted range and never assigns a machining cause', () => {
  const context = { view: 'practical' };
  const record = { caseDraft: { sampleReading: '20.12' } };
  const paper = getCompanionReply('我的20.12是否由刀具导致？', context, record);
  assert.match(paper.reply, /高于上限 0.02 mm/);
  assert.match(paper.reply, /无法确定是否与刀具有关/);
  record.submissions = [{ drawing: 'B2', measurements: '记录', measurement: {
    value: '28.23', item: '长度', unit: 'mm', standard: { item: '长度', lower: '28.01', upper: '28.25' },
  } }];
  assert.equal(getCompanionReply('我的测量结果怎么看？', context, record).options.length, 2);
  assert.match(getCompanionReply('看看最近提交的测量记录', context, record).reply, /28.01 至 28.25 mm，位于允许范围内/);
  record.submissions[0].measurement.standard = null;
  assert.match(getCompanionReply('看看最近提交的测量记录', context, record).reply, /核实允许范围/);
});

test('elective coaching cites the actual recommendation and the latest teacher review', () => {
  const context = { view: 'feedback', suggestions: [{ title: '换图再试', reason: '上次使用过提示' }] };
  const record = { submissions: [{ status: '需补交材料', review: { comment: '注明量具编号', field: 'measurements' } }] };
  assert.match(getCompanionReply('为什么推荐给我？', context, record).reply, /换图再试.*上次使用过提示/);
  assert.match(getCompanionReply('老师让我补哪一项？', context, record).reply, /注明量具编号.*测量记录/);
  record.submissions.push({ status: '待教师评价' });
  assert.match(getCompanionReply('老师让我补哪一项？', context, record).reply, /等待教师评价/);
  assert.match(getCompanionReply('哪道题应该选哪个？', { view: 'pre' }, record).reply, /独立作答/);
  assert.match(getCompanionReply('填一半可以退出吗？', { view: 'pre' }, record).reply, /同一浏览器/);
});

test('edited takeaway goes to the original lesson, keeping old notes and avoiding duplicates or truncation', () => {
  const record = { videoNotes: { intro: '旧笔记', safety: '另一节' }, tutoring: [{ id: 't1', lessonId: 'intro' }] };
  const next = appendVideoTakeaway(record, 't1', ' 我总结的要点 ');
  assert.deepEqual(next.videoNotes, { intro: '旧笔记\n我总结的要点', safety: '另一节' });
  assert.equal(appendVideoTakeaway(next, 't1', '又一次'), null);
  assert.equal(appendVideoTakeaway(record, 't1', '长'.repeat(3000)), null);
  assert.equal(record.videoNotes.intro, '旧笔记');
});
