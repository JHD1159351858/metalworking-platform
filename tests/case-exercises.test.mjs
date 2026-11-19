import test from 'node:test';
import assert from 'node:assert/strict';
import { caseExercises, chapterCases, checkCoordinate, coordinateFigure, recordedCaseId, referenceFigure, transferExercises, usedCaseHelp } from '../src/case-exercises.js';
import { cncChapters } from '../src/cnc-course.js';

test('the two teaching diagrams keep the same point and Z direction while changing the origin', () => {
  const figure = coordinateFigure(0);
  assert.equal(referenceFigure.pointX, figure.pointX);
  assert.equal(referenceFigure.rightward, figure.rightward);
  assert.equal(checkCoordinate(figure, '左端面', '负').cause, 'origin');
  assert.equal(checkCoordinate(figure, '右端面', '正').cause, 'direction');
  assert.equal(checkCoordinate(figure, '右端面', '负').correct, true);
});

test('transfer diagrams vary origins and direction and evaluate the sign from the visible geometry', () => {
  const figures = [1, 2, 3, 4, 5, 6].map(coordinateFigure);
  assert.deepEqual(new Set(figures.map(f => f.origin)), new Set(['轴肩', '左端面', '右端面']));
  assert.equal(new Set(figures.map(f => f.rightward)).size, 2);
  for (const f of figures) {
    assert.notEqual(f.originX, f.pointX);
    const sign = (f.pointX - f.originX) * (f.rightward ? 1 : -1) > 0 ? '正' : '负';
    assert.equal(checkCoordinate(f, f.origin, sign).correct, true);
    assert.equal(checkCoordinate(f, f.origin, sign === '正' ? '负' : '正').cause, 'direction');
  }
});

test('a retry or requested hint cannot count as independent transfer, including with older records', () => {
  const history = [{ exerciseId: 'case-8.1-1', correct: false }, { exerciseId: 'case-8.2-0' }];
  assert.equal(usedCaseHelp(history, undefined, 'case-8.1-1'), true);
  assert.equal(usedCaseHelp(history, { 'case-8.1-2': true }, 'case-8.1-2'), true);
  assert.equal(usedCaseHelp(history, undefined, 'case-8.1-3'), false);
});

test('each remaining chapter has its own complete student case', () => {
  assert.deepEqual(Object.keys(caseExercises), cncChapters.slice(1).map(chapter => chapter.id));
  for (const [id, first] of Object.entries(caseExercises)) {
    const second = transferExercises[id];
    assert.notEqual(first.situation, second.situation);
    for (const task of [first, second]) {
      assert.ok(task.situation && task.prompt && task.hint && task.feedback);
      assert.ok(task.options[task.correctIndex]);
    }
  }
});

test('all six units contain eight distinct cases and separate transfer prompts', () => {
  const ids = new Set(), topics = new Set(), situations = new Set();
  for (const { id } of cncChapters) {
    const tasks = chapterCases(id);
    assert.equal(tasks.length, 8);
    assert.equal(tasks[0].id, recordedCaseId({ chapterId: id }));
    assert.equal(recordedCaseId({ chapterId: id, caseId: tasks[1].id }), tasks[1].id);
    for (const task of tasks) {
      ids.add(task.id);
      topics.add(task.topic);
      if (task.id === 'case-8.1') continue;
      for (const item of [task, task.transfer]) {
        assert.ok(item.situation && item.prompt && item.hint && item.feedback);
        assert.ok(item.options[item.correctIndex]);
        assert.equal(new Set(item.options).size, item.options.length);
        assert.ok(!situations.has(item.situation));
        situations.add(item.situation);
      }
    }
  }
  assert.equal(ids.size, 48);
  assert.equal(topics.size, 48);
  assert.equal(situations.size, 94);
});
