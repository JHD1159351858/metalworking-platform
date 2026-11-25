import { weldingQuestions } from './welding-assessment.js';

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
  if (preAssessment.tradeId === 'welding') {
    const gaps = weldingQuestions.filter(q => answers?.[q.id] != null && String(answers[q.id]) !== String(q.answer));
    const preview = { view: 'video', targetId: 'weld-preview', target: { lessonId: 'weld-preview' }, title: '焊接课前预习微课' };
    if (gaps.length) return { ...preview, reason: '课前安全题中还需巩固' + gaps.map(q => q.topic).join('、') + '。请带着这些问题观看微课，并向指导教师核实。' };
    if (experience === '第一次学习' || confidence === '需要从基础开始') return { ...preview, reason: '从预习微课开始，先建立对焊接实训的基本认识。' };
    if (focus === '焊缝缺陷识别') return { view: 'tutor', target: { chapterId: 'weld-elective-2' }, title: '从海上平台事故看焊接质量', reason: '你选择了焊缝缺陷识别，可以先学习外观观察与质量检查。' };
    if (focus === '焊接设备与工艺') return { view: 'tutor', target: { chapterId: 'weld-elective-1' }, title: '5分钟了解焊接基础', reason: '你选择了焊接设备与工艺，可以先比较课中介绍的焊接方法。' };
    return { ...preview, reason: '结合你选择的学习重点「' + focus + '」，从预习微课开始。' };
  }

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
