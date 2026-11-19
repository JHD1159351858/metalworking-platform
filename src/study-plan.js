const introduction = { view: 'video', targetId: 'intro', target: { lessonId: 'intro' }, title: '课程导入与设备认知' };
const safety = { view: 'tutor', targetId: 'safety', target: { chapterId: '8.2', activity: 'case' }, title: '实训前的现场确认' };
const drawing = { view: 'tutor', targetId: 'drawing', target: { chapterId: '8.3', activity: 'case' }, title: '图样要求与检验记录' };
const program = { view: 'tutor', targetId: 'program', target: { chapterId: '8.4', activity: 'case' }, title: '程序段与轴肩轮廓' };
const practice = { view: 'theory', targetId: null, title: '题库练习' };

const focusDestinations = new Map([
  ['设备认知', introduction],
  ['实训安全', safety],
  ['图纸与工艺', drawing],
  ['程序理解', program],
  ['题库练习', practice],
]);

function missed(answer, correct) {
  return ['0', '1', '2'].includes(answer) && answer !== correct;
}

export function getStudyPlan(preAssessment) {
  if (!preAssessment) return null;
  const { answers, experience, confidence, focus } = preAssessment;

  if (missed(answers?.safety, '0')) {
    return { ...safety, reason: '课前测评的安全题答错了，建议先复习现场安全规范。' };
  }
  if (experience === '第一次学习' || confidence === '需要从基础开始') {
    return { ...introduction, reason: '根据你的学习经历和准备情况，建议先熟悉课程安排和实训设备。' };
  }
  if (missed(answers?.drawing, '1')) {
    return { ...drawing, reason: '课前测评的图纸题答错了，建议先复习任务书和图纸的阅读方法。' };
  }
  if (missed(answers?.program, '2')) {
    return { ...program, reason: '课前测评的程序题答错了，建议先学习如何判断程序的适用条件。' };
  }

  const selected = focusDestinations.get(focus);
  if (selected) {
    return { ...selected, reason: `你在课前问卷中选择了重点加强「${focus}」。` };
  }
  return { ...introduction, reason: '建议从课程导入开始，了解课程安排和实训设备。' };
}
