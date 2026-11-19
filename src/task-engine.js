import { cncChapters, unitLabel } from './cnc-course.js';
import sourceModules from './chaoxing-task-catalogue.json' with { type: 'json' };

const moduleLabels = {
  5055841: { id: 'manual-lathe', title: '车床实训' },
  5055859: { id: 'manual-mill', title: '铣床实训' },
  5055860: { id: 'shaper-grinder', title: '刨床与磨床实训' },
  5055862: { id: 'bench', title: '钳工实训' },
  5055864: { id: 'welding-casting', title: '焊接与铸造实训' },
  5055869: { id: 'cnc-lathe', title: '数控车实训' },
  5055871: { id: 'cnc-mill', title: '数控铣实训', outlineIds: ['9'] },
  5055874: { id: 'special-machining', title: '线切割与五轴加工实训', outlineIds: ['10', '11'] },
  5055876: { id: 'final-project', title: '综合项目（匠心铸件）' },
};

export const taskModules = sourceModules.map(source => ({
  ...source,
  ...moduleLabels[source.sourceId],
  sourceTitle: source.title,
  sourceCount: source.groups.reduce((count, group) => count + group.tasks.length, 0),
}));

export function getCncTaskPhases(record) {
  const theoryPassed = record.attempts?.some(attempt => attempt.passed) ?? false;
  const submission = record.submissions?.at(-1);
  const [openingChapter, ...readAndPractice] = cncChapters.flatMap(chapter => [
    {
      id: `read-${chapter.id}`, title: `${unitLabel(chapter.id)} · ${chapter.title}`,
      criterion: '阅读章节并记录学习完成。',
      complete: Boolean(record.completedChapters?.[chapter.id]),
      route: 'tutor', chapterId: chapter.id, action: '阅读章节',
    },
    {
      id: `practice-${chapter.id}`, title: `${unitLabel(chapter.id)} · 随单元练习`,
      criterion: '本节题目全部答对后完成。',
      complete: record.practice?.some(entry => entry.chapterId === chapter.id && entry.correct === true) ?? false,
      route: 'theory', chapterId: chapter.id, action: '做练习',
    },
  ]);

  return [
    { id: 'intro', title: '导入', tasks: [openingChapter] },
    {
      id: 'preparation', title: '前测',
      tasks: [{
        id: 'survey', title: '素养测评与调查问卷', criterion: '完成并提交课前测评。',
        complete: Boolean(record.preAssessment), route: 'pre', action: '填写测评',
      }],
    },
    {
      id: 'learning', title: '精讲',
      tasks: [...readAndPractice, {
        id: 'theory', title: '综合题库练习',
        criterion: '按课程规则达到总分，并满足安全知识要求后获得平台实操资格。',
        complete: theoryPassed, route: 'theory', action: '开始刷题',
      }],
    },
    {
      id: 'practice', title: '实操',
      tasks: [
        {
          id: 'practical', title: '提交实操材料',
          criterion: '按任务要求记录附件信息、测量数据和实操过程。',
          complete: Boolean(submission), locked: !theoryPassed,
          route: 'practical', action: submission ? '查看提交' : '提交材料',
        },
        {
          id: 'teacher-review', title: '教师实操评价',
          criterion: '由教师查看实操材料并给出评价。',
          complete: submission?.status === '通过',
          status: submission ? submission.status : '待提交材料',
        },
      ],
    },
    {
      id: 'review', title: '综合',
      tasks: [{
        id: 'feedback', title: '智能选学及课程反馈',
        criterion: '查看选学建议，并提交至少一条课程反馈。',
        complete: Boolean(record.feedback?.length), route: 'feedback', action: '进入反馈',
      }],
    },
  ];
}
