import assert from 'node:assert/strict';
import test from 'node:test';
import { cncChapters } from '../src/cnc-course.js';
import { getCncTaskPhases, taskModules } from '../src/task-engine.js';

const byId = record => new Map(getCncTaskPhases(record).flatMap(phase => phase.tasks).map(task => [task.id, task]));

test('keeps the source module counts separate from the tasks built for chapter 8', () => {
  assert.deepEqual(taskModules.map(module => module.sourceCount), [12, 12, 15, 11, 0, 0, 0, 0, 0]);
  assert.deepEqual(getCncTaskPhases({}).map(phase => phase.title), ['导入', '前测', '精讲', '实操', '综合']);
  const tasks = byId({});
  for (const chapter of cncChapters) {
    assert.equal(tasks.get(`read-${chapter.id}`).chapterId, chapter.id);
    assert.equal(tasks.get(`practice-${chapter.id}`).route, 'theory');
  }
  assert.equal(tasks.size, 17);
});

test('uses the exported source groups, activity types and counts for all nine modules', () => {
  const [lathe, mill, , , , cnc] = taskModules;
  assert.equal(lathe.sourceId, 5055841);
  assert.deepEqual(lathe.groups.map(group => group.title), ['导入', '前测', '精讲', '实操', '综合']);
  assert.deepEqual(mill.groups.map(group => group.title), ['回接·导入', '前测', '精讲', '实操', '综合']);
  assert.equal(cnc.groups[0].title, '默认分组');
  assert.deepEqual(cnc.groups[0].tasks, []);
  const byType = {};
  for (const module of taskModules) {
    const points = module.groups.flatMap(group => group.tasks);
    assert.equal(points.length, module.sourceCount);
    for (const point of points) byType[point.type] = (byType[point.type] || 0) + 1;
  }
  assert.deepEqual(byType, { 主题讨论: 4, 作业: 4, AI实践: 14, 章节: 22, 线下课堂: 5, 问卷: 1 });
});

test('derives task progress from learning records and keeps chapter practice separate from practical eligibility', () => {
  const study = {
    completedChapters: { '8.1': true },
    practice: [
      { chapterId: '8.1', correct: true },
      { chapterId: '8.2', correct: false },
    ],
    attempts: [{ passed: false }],
  };
  const tasks = byId(study);
  assert.equal(tasks.get('read-8.1').complete, true);
  assert.equal(tasks.get('practice-8.1').complete, true);
  assert.equal(tasks.get('practice-8.2').complete, false);
  assert.equal(tasks.get('practical').locked, true);

  const later = byId({
    ...study,
    attempts: [{ passed: true }],
    submissions: [{ status: '通过' }, { status: '待教师评价' }],
  });
  assert.equal(later.get('practical').locked, false);
  assert.equal(later.get('practical').complete, true);
  assert.equal(later.get('teacher-review').complete, false);
  assert.equal(later.get('teacher-review').status, '待教师评价');
});
