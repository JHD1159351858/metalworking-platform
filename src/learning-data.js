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
  { id: 'machine-structure', title: '数控车床由哪些部分组成？', chapter: '机床认知 · 第五节', tags: ['数控车床', '机床组成', '主轴箱', '刀架', '尾座', '进给系统', '床身'], content: '数控车床一般由床身与导轨、主轴箱（主传动与卡盘）、刀架或转塔刀架、X/Z 两轴进给伺服系统、尾座、数控装置与操作面板，以及冷却、润滑、排屑等辅助装置组成。认识各部件的作用和安全边界，是看懂程序、判断异常的前提；具体型号配置以本机床说明书和教师讲解为准。', source: '《数控车床结构与组成》示例 v0.1' },
  { id: 'coordinate-system', title: '数控机床的坐标系与参考点怎么理解？', chapter: '编程基础 · 第六节', tags: ['坐标系', '机床坐标系', '工件坐标系', '参考点', '回零', '程序原点'], content: '数控车床的 Z 轴沿主轴轴线方向、以远离工件的方向为正，X 轴垂直于主轴轴线（按直径方向标注）。机床坐标系以机床参考点为基准，开机回零或回参考点后建立；工件坐标系（程序原点）由 G54 等零点偏置或 G50 设定。对刀与坐标系设定必须经教师确认，写错原点会导致超程或撞刀。', source: '《数控机床坐标系认知》示例 v0.1' },
  { id: 'arc-interpolation', title: '圆弧插补 G02 与 G03 有什么区别？', chapter: '编程基础 · 第七节', tags: ['G02', 'G03', '圆弧插补', '圆弧', 'R 编程', 'I K'], content: 'G02 为顺时针圆弧插补，G03 为逆时针；判断顺逆要沿垂直于加工平面的坐标轴（车床为 Y 轴）观察。圆弧可用终点坐标加半径 R 编程，也可用圆心相对起点的 I、K 增量编程；部分系统会拒绝 R 取负值或圆心与起点重合等写法。示例只说明概念，能否用于本机床须按控制系统说明书并经教师审核。', source: '《圆弧插补与 R 编程》示例 v0.1' },
  { id: 'tool-nose-compensation', title: '刀尖圆弧半径补偿（G41/G42）是做什么的？', chapter: '编程基础 · 第八节', tags: ['刀尖圆弧', '半径补偿', '刀补', 'G41', 'G42', 'G40', '补偿方向'], content: '编程按理想刀尖点计算，而实际切削由刀尖圆弧完成，加工锥面、圆弧和端面时会出现过切或欠切，因此需要刀尖圆弧半径补偿：G41 为左补偿、G42 为右补偿，G40 取消补偿。补偿方向与刀具安装方位、加工内轮廓还是外轮廓有关，设置错误会造成尺寸偏差或过切。补偿半径与刀尖方位号须由教师核对后再使用。', source: '《刀尖圆弧半径补偿说明》示例 v0.1' },
  { id: 'cutting-parameters', title: '切削用量三要素该怎么选？', chapter: '工艺参数 · 第九节', tags: ['切削用量', '背吃刀量', '进给量', '切削速度', '粗加工', '精加工'], content: '切削用量包括背吃刀量 ap、进给量 f 和切削速度 vc。粗加工以去除余量为主，可选较大的 ap 与 f；精加工优先保证尺寸精度和表面质量，宜减小 f 与 ap、适当提高转速。具体数值要结合工件材料、刀具牌号、机床刚性和冷却条件查手册并经教师确认，不能照搬网页数据或他人参数。', source: '《切削用量选择要点》示例 v0.1' },
  { id: 'spindle-speed', title: '主轴转速与恒线速（G96/G97）有什么关系？', chapter: '工艺参数 · 第十节', tags: ['主轴转速', '恒线速', 'G96', 'G97', 'S 指令', '最高转速限制'], content: 'G97 指定恒定主轴转速（r/min），G96 指定恒线速度（m/min）：使用恒线速时系统会随工件直径变化自动调整转速，直径变小则转速升高，因此通常要用 G50 设定最高转速限制，避免超速。指令切换条件与限速值必须结合本机床控制系统和工艺要求，由教师确认后使用。', source: '《主轴转速与恒线速说明》示例 v0.1' },
  { id: 'first-piece-check', title: '首件试切前要做哪些校验准备？', chapter: '实训操作 · 第十一节', tags: ['首件试切', '空运行', '图形模拟', '单段执行', '对刀', '安全距离'], content: '首件试切前建议依次完成：核对程序与图纸、确认坐标原点与刀补、用图形模拟或空运行检查轨迹、检查夹紧状态与安全距离、以单段和低倍率试切。首件试切须有教师在场确认，出现异常立即停止进给并按现场规程处理；网页说明不能替代现场验证。', source: '《首件试切校验清单》示例 v0.1' },
  { id: 'alarm-handling', title: '机床出现报警时怎么初步处理？', chapter: '故障处理 · 第十二节', tags: ['报警', '超程', '伺服报警', '急停', '复位', '异常排查'], content: '出现超程、伺服、急停或程序格式报警时，先停止进给、保持现场并记录报警号与画面信息，再按本机床说明书和现场规程处理，并及时报告教师。不得自行短接急停、屏蔽报警或修改参数；报警原因未查清前不要重新启动程序。', source: '《数控机床报警初判》示例 v0.1' }
];

export const questions = [
  { id: 'q1', category: '安全知识', topic: '现场上机许可', prompt: '理论考核通过后，进入现场操作前还需要什么？', options: ['直接启动设备', '获得现场教师确认', '只需查看网页轨迹', '由同学代为确认'], answer: 1 },
  { id: 'q2', category: '安全知识', topic: '异常情况处置', prompt: '学习或实训中发现设备异常，合理的做法是？', options: ['忽略异常继续任务', '自行试改设备设置', '按现场规程处理并报告教师', '仅在平台留言后继续'], answer: 2 },
  { id: 'q3', category: '工艺理论', topic: '程序适用条件', prompt: '理解一段数控程序前，应优先明确什么？', options: ['网页主题颜色', '程序行数是否足够多', '其他同学的考试分数', '控制系统、任务、刀具和坐标等适用条件'], answer: 3 },
  { id: 'q4', category: '工艺理论', topic: '图纸与任务要求', prompt: '任务书缺少关键图纸或工艺条件时，应如何处理？', options: ['补充假定参数后直接加工', '先向教师核实缺少的条件', '只参考成品照片', '跳过缺少信息的工序'], answer: 1 },
  { id: 'q5', category: '工艺理论', topic: '实操最终评价', prompt: '实操考核的最终评分与通过结论由谁决定？', options: ['智能体根据照片自动决定', '学生自评后自动通过', '教师结合现场表现和提交材料决定', '理论分数自动换算决定'], answer: 2 },
];

export const defaultRules = { totalPass: 80, safetyAll: true, task: '按教师发布的任务书与图纸完成指定工件加工，并提交程序、结果照片、测量数据与过程记录。' };
const recordPrefix = 'metalwork:record:v1:';
const studentPrefix = 'metalwork:student:v1:';
const keyFor = (profile, trade) => `${recordPrefix}${encodeURIComponent(profile.id)}:${trade.id}`;
const freshRecord = () => ({ videos: {}, videoNotes: {}, completedChapters: {}, caseDraft: {}, casePractice: [], preAssessment: null, preAssessmentDraft: null, feedback: [], tutoring: [], practice: [], attempts: [], submissions: [] });
export function loadRecord(profile, trade) {
  try { return { ...freshRecord(), ...JSON.parse(localStorage.getItem(keyFor(profile, trade)) || 'null') }; }
  catch { return freshRecord(); }
}
export function saveRecord(profile, trade, record) {
  localStorage.setItem(keyFor(profile, trade), JSON.stringify(record));
  window.dispatchEvent(new Event('learning-updated'));
}

function localStudentProfile(profile) {
  if (!profile || (profile.role && profile.role !== 'student')) return null;
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const { id } = profile;
  const name = clean(profile.name);
  if (typeof id !== 'string' || !id.trim() || !name) return null;
  return {
    id,
    name,
    studentNumber: clean(profile.studentNumber) || id,
    className: clean(profile.className) || '班级未知',
    major: clean(profile.major),
  };
}

export function rememberStudent(profile) {
  const student = localStudentProfile(profile);
  if (!student) return;
  try {
    const key = studentPrefix + encodeURIComponent(student.id);
    const entry = JSON.stringify(student);
    if (localStorage.getItem(key) !== entry) localStorage.setItem(key, entry);
  } catch { /* The course can continue when the roster cannot be stored. */ }
}

export function readLocalStudents(trade) {
  const students = new Map();
  const legacyIds = new Set();
  const tradeSuffix = ':' + trade.id;
  let keys;
  try { keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)); }
  catch { keys = []; }

  for (const key of keys) {
    try {
      if (key?.startsWith(studentPrefix)) {
        const profile = localStudentProfile(JSON.parse(localStorage.getItem(key)));
        if (profile) students.set(profile.id, profile);
      } else if (key?.startsWith(recordPrefix) && key.endsWith(tradeSuffix)) {
        const id = decodeURIComponent(key.slice(recordPrefix.length, -tradeSuffix.length));
        const saved = JSON.parse(localStorage.getItem(key));
        if (id.trim() && saved && typeof saved === 'object' && !Array.isArray(saved)) legacyIds.add(id);
      }
    } catch { /* Ignore malformed local entries. */ }
  }

  try {
    const profile = localStudentProfile(JSON.parse(localStorage.getItem('metal-profile')));
    if (profile) students.set(profile.id, profile);
  } catch { /* Older previews may have left an invalid profile. */ }

  for (const id of legacyIds) {
    if (!students.has(id)) students.set(id, localStudentProfile({ id, name: id }));
  }

  return [...students.values()].map(profile => {
    const record = loadRecord(profile, trade);
    delete record.preAssessmentDraft;
    return { profile, record };
  });
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
export const courseSteps = [
  { id: 'pre', title: '课前测评', image: 'exam', description: ['完成素养测评和调查问卷', '了解已有基础与学习需求'], action: '进入测评' },
  { id: 'video', title: '理论学习及测评', image: 'video', description: ['看视频、记笔记、学章节', '用题库练习检验掌握情况'], action: '进入学习' },
  { id: 'practical', title: '实操考核', image: 'practical', description: ['完成现场实训任务', '提交材料，等待教师评价'], action: '查看任务' },
  { id: 'feedback', title: '智能选学及课程反馈', image: 'tutor', description: ['按学习情况选内容复习', '分享心得或给课程提建议'], action: '选学与反馈' },
];

export function getCoursePath(record) {
  const passed = record.attempts.some(attempt => attempt.passed);
  const practicalStatus = record.submissions.at(-1)?.status;
  const progress = [
    { status: record.preAssessment ? '课前测评与问卷已填写' : '待填写', complete: Boolean(record.preAssessment) },
    { status: passed ? '理论测评已达标' : record.attempts.length ? `已练习 ${record.attempts.length} 次 · 可继续巩固` : '待学习与练习', complete: passed },
    { status: passed ? practicalStatus || '待提交材料' : '可先自查 · 达标后提交', locked: !passed, complete: practicalStatus === '通过' },
    { status: record.feedback.length ? '已记录课程反馈' : '查看选学建议', complete: record.feedback.length > 0 },
  ];
  return courseSteps.map((step, index) => ({ ...step, ...progress[index], index: `0${index + 1}` }));
}
export function answerIndex(value, options) {
  const index = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isInteger(index) && index >= 0 && index < options.length ? index : null;
}
export function gradeAttempt(order, answers, rules) {
  const details = order.map(q => {
    const selectedIndex = answerIndex(answers[q.id], q.options);
    return { id: q.id, topic: q.topic, category: q.category, selectedIndex, correct: selectedIndex === q.answer };
  });
  const score = Math.round(details.filter(q => q.correct).length / order.length * 100);
  const safetyPassed = details.filter(q => q.category === '安全知识').every(q => q.correct);
  return { score, safetyPassed, passed: score >= rules.totalPass && (!rules.safetyAll || safetyPassed), details, rules: { totalPass: rules.totalPass, safetyAll: rules.safetyAll } };
}
export function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function downloadRecords(profile, trade, record = loadRecord(profile, trade)) {
  const blob = new Blob([JSON.stringify({ student: profile, trade, record, exportedAt: new Date().toISOString(), note: '此 JSON 包含附件信息。本浏览器已保存的原件可从对应实操提交中下载。' }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${trade.name}-学习记录.json`; a.click(); URL.revokeObjectURL(url);
}
