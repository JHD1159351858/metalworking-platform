export const lessons = [
  { id: 'intro', title: '课程导入与设备认知', topic: '认识数控车实训', duration: '待配置', summary: '了解实训目标、数控车床的基本组成，以及本课程的学习顺序。正式视频与设备资料由教师提供。' },
  { id: 'safety', title: '实训安全与操作规范', topic: '先安全，后操作', duration: '待配置', summary: '进入实训场地前，先学习本校、本机床的安全要求；设备运行和异常处置均应服从现场教师指导。' },
  { id: 'process', title: '图纸理解与工艺认知', topic: '从图纸到加工任务', duration: '待配置', summary: '对照教师任务书识别尺寸、公差、表面要求和提交材料。条件不足时先确认，不自行推定加工条件。' },
  { id: 'program', title: '程序结构与典型案例', topic: '理解程序的适用条件', duration: '待配置', summary: '数控程序需要结合控制系统、工件、刀具和坐标条件理解。示例程序与轨迹视图不能替代教师审核和现场验证。' },
];

export const knowledge = [
  { id: 'safety', title: '上机之前，先确认哪些事项？', chapter: '安全规范 · 第一节', tags: ['安全', '上机', '检查', '异常'], content: '先阅读教师发布的安全要求，确认已获得现场教师许可，并核对当前设备的操作规程。遇到异常时，应按现场规程处理并立即报告教师；不要凭网页回答继续操作。', source: '《数控车实训安全学习提纲》示例 v0.1' },
  { id: 'drawing', title: '如何读懂实操任务书？', chapter: '工艺认知 · 第二节', tags: ['图纸', '任务', '尺寸', '工艺', '测量'], content: '可以按“加工对象—图纸要求—工艺要求—提交材料—评分标准”逐项整理。缺少图纸、材料或设备条件时，先记录疑问并向教师确认，不能自行补全关键参数。', source: '《任务书阅读清单》示例 v0.1' },
  { id: 'program', title: '同一段程序能直接用于不同机床吗？', chapter: '程序辅导 · 第三节', tags: ['程序', '代码', 'G代码', 'G00', 'G01', '坐标', '刀具'], content: '不能默认通用。理解程序前，需要明确控制系统、加工任务、工件、刀具和坐标条件。网页仅展示教学解释；程序修改、校验与上机由教师结合实际教学条件确认。', source: '《程序适用条件说明》示例 v0.1' },
  { id: 'assessment', title: '理论通过后，可以直接上机吗？', chapter: '考核说明 · 第四节', tags: ['考核', '成绩', '理论', '实操', '资格', '通过'], content: '理论通过只表示取得平台中的实操考核资格。现场上机仍需教师确认；操作规范、工艺执行、安全习惯和成品质量，最终均由教师评价。', source: '《课程学习流程说明》示例 v0.1' },
];

export const questions = [
  { id: 'q1', category: '安全知识', topic: '现场上机许可', prompt: '理论考核通过后，进入现场操作前还需要什么？', options: ['直接启动设备', '获得现场教师确认', '只需查看网页轨迹', '由同学代为确认'], answer: 1 },
  { id: 'q2', category: '安全知识', topic: '异常情况处置', prompt: '学习或实训中发现设备异常，合理的做法是？', options: ['忽略异常继续任务', '自行试改设备设置', '按现场规程处理并报告教师', '仅在平台留言后继续'], answer: 2 },
  { id: 'q3', category: '工艺理论', topic: '程序适用条件', prompt: '理解一段数控程序前，应优先明确什么？', options: ['网页主题颜色', '程序行数是否足够多', '其他同学的考试分数', '控制系统、任务、刀具和坐标等适用条件'], answer: 3 },
  { id: 'q4', category: '工艺理论', topic: '图纸与任务要求', prompt: '任务书缺少关键图纸或工艺条件时，应如何处理？', options: ['补充假定参数后直接加工', '先向教师核实缺少的条件', '只参考成品照片', '跳过缺少信息的工序'], answer: 1 },
  { id: 'q5', category: '工艺理论', topic: '实操最终评价', prompt: '实操考核的最终评分与通过结论由谁决定？', options: ['智能体根据照片自动决定', '学生自评后自动通过', '教师结合现场表现和提交材料决定', '理论分数自动换算决定'], answer: 2 },
];

export const defaultRules = { totalPass: 80, safetyAll: true, task: '按教师正式任务书完成指定工件加工，并提交程序、结果照片、测量数据与过程记录。当前为流程示例，正式图纸、工艺要求和评分表待教师配置。' };
const keyFor = (profile, trade) => `metalwork:record:v1:${encodeURIComponent(profile.id)}:${trade.id}`;
const freshRecord = () => ({ videos: {}, tutoring: [], practice: [], attempts: [], submissions: [] });
export function loadRecord(profile, trade) {
  try { return { ...freshRecord(), ...JSON.parse(localStorage.getItem(keyFor(profile, trade)) || 'null') }; }
  catch { return freshRecord(); }
}
export function saveRecord(profile, trade, record) {
  localStorage.setItem(keyFor(profile, trade), JSON.stringify(record));
  window.dispatchEvent(new Event('learning-updated'));
}
export function loadRules(trade) {
  try { return { ...defaultRules, ...JSON.parse(localStorage.getItem(`metalwork:rules:v1:${trade.id}`) || 'null') }; }
  catch { return { ...defaultRules }; }
}
export function saveRules(trade, rules) {
  localStorage.setItem(`metalwork:rules:v1:${trade.id}`, JSON.stringify(rules));
  window.dispatchEvent(new Event('learning-updated'));
}
export function getSummary(profile, trade) {
  const r = loadRecord(profile, trade);
  return { videoCompleted: Object.values(r.videos).filter(v => v.completed).length, videoTotal: lessons.length, examPassed: r.attempts.some(a => a.passed), attempts: r.attempts.length, practicalStatus: r.submissions.at(-1)?.status || '未提交' };
}
export function gradeAttempt(order, answers, rules) {
  const details = order.map(q => ({ id: q.id, topic: q.topic, category: q.category, correct: Number(answers[q.id]) === q.answer }));
  const score = Math.round(details.filter(q => q.correct).length / order.length * 100);
  const safetyPassed = details.filter(q => q.category === '安全知识').every(q => q.correct);
  return { score, safetyPassed, passed: score >= rules.totalPass && (!rules.safetyAll || safetyPassed), details, rules: { totalPass: rules.totalPass, safetyAll: rules.safetyAll } };
}
export function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function downloadRecords(profile, trade) {
  const blob = new Blob([JSON.stringify({ student: profile, trade, record: loadRecord(profile, trade), exportedAt: new Date().toISOString(), note: '浏览器本地演示记录；附件仅保存文件信息，不含原文件。' }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${trade.name}-学习记录.json`; a.click(); URL.revokeObjectURL(url);
}
