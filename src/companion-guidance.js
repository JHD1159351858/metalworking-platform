import { cncChapters, cncAssessmentQuestions, unitLabel } from './cnc-course.js';
import { knowledge, lessons } from './learning-data.js';
import { stageQuestions, stageReply } from './companion-stages.js';
import { unitKnowledge } from './unit-knowledge.js';

const chapterPrompts = {
  '8.1': '为什么零件没动，坐标却变了？',
  '8.2': '上机前，我应该向谁核实设备情况？',
  '8.3': '图纸上的要求怎样写进工艺方案？',
  '8.4': '一段程序怎样和图纸轮廓对应起来？',
  '8.5': '看到指令或报警时，该查哪份资料？',
  '8.6': '预览中的一段刀路和图不一致怎么办？',
};
const casePrompts = {
  '8.2': ['先指出图上一个认识的部件，再说说要从哪份资料核对它在本机上的用途。', '我不认识部件', '我想确认上机资格'],
  '8.3': ['先从任务图选出一处需要验收的尺寸。它在哪道工序形成，又打算把检查结果记在哪一栏？', '我找不到图纸要求', '我还缺工艺条件'],
  '8.4': ['把图上的一段轮廓和示例程序里的一段运动配对。两边使用了同一个原点和单位吗？', '我读不懂程序段', '我想核对坐标基准'],
  '8.5': ['先核对控制系统型号。你要查的是这台设备的指令含义，还是现场出现的报警？', '我想确认系统型号', '我遇到了设备报警'],
  '8.6': ['先找出与目标轮廓不一致的那一段，把它的起点、终点和图纸基准对上。你手上有哪份依据？', '我只有预览图', '我想核对坐标基准'],
};
const guidedResponses = {
  '我不认识部件': '先从图例里区分夹持工件、安装刀具和输入程序的三个位置。挑一个，把它的图示名称和作用写成一句话，现场让教师指认。',
  '我想确认上机资格': '平台记录的是理论阶段是否已达标。到现场后，仍要请任课教师确认设备状态和操作安排，再开始实操。',
  '我找不到图纸要求': '在教师的任务图中选一个带标注的表面，分别抄下尺寸、单位，以及图上给的允许偏差。没有写明的条件可以留作待确认项。',
  '我还缺工艺条件': '把已知图纸版本和加工要求写进工艺理由，把待确认的问题另列一行交给教师。条件补齐后，再继续写工序与检验方法。',
  '我读不懂程序段': '先标出疑问所在的一行，区分它在准备、运动还是结束部分。只阅读教师发的对应系统示例，核对坐标和单位后再解释这一行。',
  '我想确认系统型号': '请对照教学设备标牌、控制面板或教师任务书找到系统型号，再核对说明书封面和适用版本。如不一致，先请教师确认使用哪份手册。',
  '我遇到了设备报警': '如果是现场设备，先按现场规程处理并报告教师。课堂里可抄下报警号、显示信息和系统型号，对照对应手册核实。',
  '我只有预览图': '先在预览图标记疑点并记录所用坐标系。还需要任务图的对应轮廓及适用的加工设置，才能判断两者差在哪里。',
};
const coordinateSource = '8.1 数控机床的坐标系统简介 · 项目阶梯轴读图练习';
const originChoice = '我不确定从哪里量';
const directionChoice = '我分不清正负方向';
const directionPrompt = '从图上标出的 O 指向待判断的点，再对照 +Z 箭头。若 O 到该点的方向和 +Z 相反，轴向读数应取哪种符号？';
const chapterFor = id => cncChapters.find(chapter => chapter.id === id);
const sourceOf = chapter => `${chapter.id} ${chapter.title} · 项目整理`;
export const conversationScope = context => [context.view || '', context.chapterId || '', context.lessonId || '', context.questionId || ''].join('/');
export const reviewPrompt = '帮我回顾最近一次综合测评';
const readingOptions = ['举个例子', '常见误区有哪些？'];
const caseHintPrompt = '这道案例可以从哪里入手？';
const isAdditionalCase = context => context.caseHint && context.caseId && context.caseId !== `case-${context.chapterId}`;
export function getStarters(context) {
  if (stageQuestions[context.view]) return [...stageQuestions[context.view]];
  if (isAdditionalCase(context)) return [caseHintPrompt];
  if (unitKnowledge[context.chapterId] && !context.lessonId && !context.questionId) return [chapterPrompts[context.chapterId], ...readingOptions];
  if (chapterPrompts[context.chapterId]) return [chapterPrompts[context.chapterId]];
  const supplement = knowledge.find(item => item.id === context.chapterId);
  if (supplement) return [supplement.title];
  const lesson = lessons.find(item => item.id === context.lessonId);
  if (lesson) return ['这节视频的学习要点是什么？', '我对画面中的图有疑问'];
  return [chapterPrompts['8.1'], chapterPrompts['8.3'], '如何读懂实操任务书？'];
}

function materialAnswer(material) {
  return { reply: material.content, source: `${material.source} · ${material.chapter}`, isHint: true };
}

// Match only course vocabulary so an unrelated question cannot select a paragraph by filler words.
const readingTerms = ('机床原点 工件零点 参考点 机床坐标 工件坐标 绝对位置 相对位移 X轴 Z轴 直径 半径 ' +
  '切削运动 主轴 卡盘 夹具 刀架 进给机构 床身 导轨 指令值 实际值 防护门 装夹 偏差 测量 量具 工序 工步 基准 粗糙度 ' +
  '模态 程序段 插补 定位 进给 每转进给 每分钟进给 刀具 补偿 报警 系统型号 目标轮廓 毛坯 刀具路径 后置 轨迹预览 CAXA CAM').split(' ');
const normalizeTerm = text => text.toUpperCase().replace(/\s/g, '');

function readingAnswer(text, { chapterId, readingTopic }) {
  const unit = unitKnowledge[chapterId];
  if (!unit) return null;
  const parts = [...unit.sections, unit.example, ...unit.pitfalls];
  let part = parts.find(item => item.title === readingTopic || text.includes(item.title));
  if (!part && /误区|易错|容易混淆|常犯的错/.test(text)) {
    part = { title: '容易混淆的地方', text: unit.pitfalls.map(item => `${item.title}。${item.text}`).join('\n') };
  }
  if (!part && /举.*例|例子|例题|举例/.test(text)) part = unit.example;
  if (!part) {
    const query = normalizeTerm(text).replace(/公差/g, '偏差').replace(/工件原点/g, '工件零点');
    const terms = readingTerms.filter(term => query.includes(term));
    terms.push(...(query.match(/(?:G\d+|F\d+(?:\.\d+)?)(?![\d.])/g) || []));
    let bestScore = 0;
    for (const item of parts) {
      const title = normalizeTerm(item.title);
      const body = normalizeTerm(item.text);
      const score = terms.reduce((sum, term) => {
        const inTitle = title.includes(term);
        const inText = body.includes(term);
        return sum + (inTitle ? 2 : inText ? 1 : 0) * term.length;
      }, 0);
      if (score > bestScore) {
        part = item;
        bestScore = score;
      }
    }
  }
  if (!part) return null;
  return { reply: part.text, source: `${unitLabel(chapterId)}基础知识 · ${part.title}`, options: readingOptions.filter(option => !text.includes(option)), isHint: true };
}

function findMaterial(query) {
  const text = query.toLowerCase();
  const ranked = knowledge.map(item => ({
    item, score: item.tags.filter(tag => text.includes(tag.toLowerCase())).reduce((n, tag) => n + tag.length, 0),
  })).sort((a, b) => b.score - a.score);
  if (ranked[0]?.score > (ranked[1]?.score || 0)) return ranked[0].item;
  return null;
}

function coordinateReply(query, prior, lastCase, direct) {
  const say = (reply, step, options) => ({ reply, step, options, source: coordinateSource, isHint: true });
  if (prior?.step === 'direction' && /负/.test(query) && !/不一定|不懂|不确定|不是负|为什么|正号|还是/.test(query)) {
    return say('对。在刚才“与 +Z 相反”的条件下，应写负号。回到一张新图，先不看提示，自己找 O，再判断从 O 到目标点的方向。独立练习的结果会另行记录。', 'finished', []);
  }
  if (prior?.step === 'direction' && /正号|正数|取正|为正|^正$/.test(query) && !/不确定|分不清|还是/.test(query)) {
    return say('再看一眼题设说的“相反”。把两支箭头画在同一条线上，一支表示 +Z，一支从 O 指向目标点。它们同向才是正。现在试着重判符号。', 'direction', ['应取负号', '应取正号']);
  }
  if (/正负|箭头|方向|符号|读反/.test(query) || (prior?.step === 'origin' && /从.*[OoＯ]|标.*[OoＯ]|从零点|从原点|图乙.*右端/.test(query))) {
    return say(directionPrompt, 'direction', ['应取负号', '应取正号']);
  }
  if (/哪里量|找不到.*[OoＯ]|找不到.*点|左边.*开始|左端.*开始|起点|图纸左端|固定左端/.test(query)) {
    return say('先把其余标记遮住，只找图中标为 O 的零点。即使零件的位置没变，两张图也可以选不同零点。量一个点的位置时，你会从 O 开始，还是一直从图纸左边开始？', 'origin', ['从标出的 O 开始', '从固定左端开始']);
  }
  if (!direct && lastCase && !lastCase.correct && ['origin','direction'].includes(lastCase.cause)) {
    return lastCase.cause === 'origin'
      ? say('刚才的练习错在基准。先在两张图上分别指认 O，再看待判断的点。你会从哪一个标记开始量？', 'origin', ['从标出的 O 开始', '从固定左端开始'])
      : say(`刚才的练习需要再核对方向。${directionPrompt}`, 'direction', ['应取负号', '应取正号']);
  }
  return say('以坐标系统单元里的阶梯轴为例，同一点的位置读数与零点和正方向有关。先指出图上标着 O 的位置，再沿 +Z 箭头看目标点。你卡在找零点，还是判断方向？', 'diagnose', [originChoice, directionChoice]);
}

export function getCompanionReply(query, context = {}, record = {}) {
  if (context.examActive || !query.trim()) return null;
  const scope = conversationScope(context);
  const prior = record.tutoring?.at(-1);
  const previous = prior?.scope === scope ? prior : null;
  const lesson = lessons.find(item => item.id === context.lessonId);
  const text = query.trim();
  const stageAnswer = stageReply(text, context, record);
  if (stageAnswer) return { ...stageAnswer, scope };
  if (isAdditionalCase(context) && (text === caseHintPrompt || /提示|这道|本题|这题|不会|从哪/.test(text))) {
    return { reply: context.caseHint, source: `${unitLabel(context.chapterId)}案例 · ${context.caseTopic}`, isHint: true, scope };
  }
  const exact = knowledge.find(item => item.title === text);
  const selectedChapter = chapterFor(context.chapterId);
  let answer;
  const lastAttempt = record.attempts?.at(-1);
  if (/错题|回顾.*测评|复盘.*测评/.test(text) && lastAttempt?.details && !context.questionId) {
    const misses = lastAttempt.details.filter(item => !item.correct);
    const safety = misses.filter(item => item.category === '安全知识');
    const focus = safety[0] || misses[0];
    if (!focus) return { reply: '最近一次综合测评的各题都答对了。可以换一道阶梯轴专项练习，看看自己能否独立解释理由。', options: [chapterPrompts['8.1']], scope };
    const missedChapter = cncAssessmentQuestions.find(q => q.id === focus.id)?.chapterId;
    const cardId = { q1: 'safety', q2: 'alarm-handling', q3: 'program', q4: 'drawing', q5: 'assessment' }[focus.id];
    const next = chapterPrompts[missedChapter] || knowledge.find(item => item.id === cardId)?.title;
    return { reply: `最近一次综合测评有 ${misses.length} 道错题。${safety.length ? '先回看安全知识' : '先回看第一个错点'}「${focus.topic}」。回想自己选项里的依据，再对照课程说明。`, options: next ? [next] : [], scope };
  }
  if (exact) answer = materialAnswer(exact);
  const coordinate = /坐标|零件没动|零点|基准|图[甲乙]|原点|哪里量|正负/.test(text);
  const continues = previous?.step && previous.step !== 'finished' && (previous.options?.includes(text)
    || /从.*[OoＯ]|从零点|端面|箭头|不确定|不懂|相反|顺着|逆着|正号|负号|取[正负]|不一样/.test(text));
  const guidedQuestion = Object.values(chapterPrompts).includes(text) || (previous?.guideChapter && previous.options?.includes(text));
  if (!answer && !context.lessonId && !context.questionId && (context.readingTopic || (!guidedQuestion && !continues))) {
    answer = readingAnswer(text, context);
  }
  if (!answer && (coordinate || continues || (context.chapterId === '8.1' && /本题|这题|提示|不会|错误|错在/.test(text)))) {
    const lastCase = record.casePractice?.filter(item => item.chapterId === '8.1' && (!item.caseId || item.caseId === 'case-8.1')).at(-1);
    answer = coordinateReply(text, previous, lastCase, coordinate || Boolean(continues));
  }
  if (!answer && lesson && /画面|视频|这一帧|时间点|这里|这一段|这一秒/.test(text)) {
    const overview = /要点|学什么|重点|概览/.test(text);
    answer = {
      reply: overview ? lesson.summary : '我能定位到这节课的播放位置。请补充图号、字幕中的一句话，或描述正在比较的两处标记，这样能把问题对到课程资料。',
      source: overview ? `课程目录 · ${lesson.title}` : '', isHint: overview,
    };
  }
  let chapter = cncChapters.find(item => chapterPrompts[item.id] === text);
  if (!chapter && previous?.guideChapter && previous.options?.includes(text)) chapter = chapterFor(previous.guideChapter);
  if (!chapter && selectedChapter && /这节|这一节|本节|本题|这题|提示|从哪|不理解|不会|工艺方案|工序|图纸要求|轮廓|控制系统|预览|轨迹/.test(text)) chapter = selectedChapter;
  if (!answer && chapter && casePrompts[chapter.id]) {
    const [prompt, ...options] = casePrompts[chapter.id];
    answer = { reply: guidedResponses[text] || prompt, source: sourceOf(chapter), options: guidedResponses[text] ? [] : options, guideChapter: chapter.id, isHint: true };
  }
  if (!answer) {
    const material = findMaterial(text);
    if (material) answer = materialAnswer(material);
  }
  if (!answer) answer = { reply: '现有课程资料还不足以解释这个问题。请补充章节、图号、程序段或题中给出的条件。涉及现场设备或实际加工参数时，请教师核实。', options: getStarters(context) };
  return { ...answer, scope };
}

export function appendVideoTakeaway(record, turnId, summary) {
  const turn = record.tutoring.find(item => item.id === turnId);
  const text = summary.trim();
  if (!text || !turn || turn.noted || !lessons.some(item => item.id === turn.lessonId)) return null;
  const existing = record.videoNotes?.[turn.lessonId] || '';
  const next = [existing, text].filter(Boolean).join('\n');
  if (next.length > 3000) return null;
  return { ...record, videoNotes: { ...record.videoNotes, [turn.lessonId]: next },
    tutoring: record.tutoring.map(item => item.id === turnId ? { ...item, noted: true } : item) };
}
