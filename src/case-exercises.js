import { additionalCases, transferChecks } from './case-catalog.js';

export const coordinateTopic = '阶梯轴的零点与轴向方向';

export const coordinateHints = {
  origin: '先找到本图的 O。零点由图中的标记指定，可以在端面，也可以在轴肩。',
  direction: '从 O 沿轴线走到被标出的点，和 +Z 箭头同向记为正，反向记为负。',
};

export const referenceFigure = { origin: '左端面', originX: 36, pointX: 122, shoulder: 122, point: 'P', rightward: true };

export function coordinateFigure(round) {
  if (!round) return { ...referenceFigure, origin: '右端面', originX: 232 };
  const shoulder = 93 + (round * 19) % 57;
  const zero = (round - 1) % 3;
  return {
    origin: ['轴肩', '左端面', '右端面'][zero], originX: [shoulder, 36, 232][zero],
    shoulder, point: round % 2 ? 'Q' : 'R',
    pointX: zero === 0 && round % 2 ? shoulder - 30 : shoulder + 36,
    rightward: Math.floor((round - 1) / 2) % 2 === 0,
  };
}

export function checkCoordinate(figure, origin, sign) {
  if (origin !== figure.origin) return { correct: false, cause: 'origin', feedback: coordinateHints.origin };
  const positive = (figure.pointX > figure.originX) === figure.rightward;
  if (sign !== (positive ? '正' : '负')) return { correct: false, cause: 'direction', feedback: coordinateHints.direction };
  return { correct: true, cause: null, feedback: `从${figure.origin}的 O 到 ${figure.point} 与 +Z ${positive ? '同向' : '反向'}，所以轴向读数为${positive ? '正' : '负'}。` };
}

export function usedCaseHelp(history, caseHints, exerciseId) {
  return Boolean(caseHints?.[exerciseId] || history.some(entry => entry.exerciseId === exerciseId));
}

export const caseExercises = {
  '8.2': {
    topic: '实训前的现场确认',
    situation: '你被分到另一台教学车床。同伴已打开阶梯轴示例，屏幕显示正常，但你还没核对本机规程，也没见到指导教师。',
    prompt: '作为这一组的安全观察员，你要先提出哪一项？',
    options: ['让同伴复述上一台车床的做法', '核对本机规程并请现场教师确认', '检查示例文件是否命名为阶梯轴'],
    correctIndex: 1, hint: '把“示例已准备好”和“现场条件已确认”分开判断。',
    feedback: '程序文件和同伴经验都无法确认本机现场条件。指出缺少的确认环节，才能把问题交给相应的人。',
  },
  '8.3': {
    topic: '图样要求与检验记录',
    situation: '阶梯轴的任务单要求交付一项轴肩长度检验记录。组员已记录零件总长和照片，图纸上的两处测量面还未标出。',
    prompt: '要让另一位同学能复核这项长度，应先补哪份信息？',
    options: ['零件总长的第二张照片', '所有程序段的行数', '轴肩的两处测量面、目标范围和实测值的对应记录'],
    correctIndex: 2, hint: '想一想两个人拿到同一张图时，是否会量同一段。',
    feedback: '总长与轴肩长度对应不同表面。应把图样要求、测量位置和检查记录放在同一行。',
  },
  '8.4': {
    topic: '程序段与轴肩轮廓',
    situation: '阅读课堂示意。A 段沿轴向平直轮廓，B 段沿轴肩改变外径。在本练习约定的 X–Z 图中，一段记录的起、终点 Z 相同，X 发生变化。',
    prompt: '这段记录应标到轮廓的哪里？',
    options: ['B 段，沿轴肩的径向轮廓', 'A 段，轴向平直轮廓', '任意一段，只要文件名相同'],
    correctIndex: 0, hint: '先找哪个坐标保持不变，再把变化方向和图样的轴向、径向对应起来。',
    feedback: 'Z 不变表示沿轴向没有位移。X 的变化对应径向轮廓，本例对应 B 段。可展开本节坐标练习对照二维轨迹。',
  },
  '8.5': {
    topic: '控制系统资料辨认',
    situation: '教师的阶梯轴示例标注 GSK980TDb。资料甲标注相同型号并附版本页，资料乙来自另一型号且只有指令截图。',
    prompt: '写下这段指令的用途前，你会如何选资料？',
    options: ['选配图更多的资料乙', '先用资料甲核对型号、版本及适用条件', '把甲乙中相同的指令编号视为通用结论'],
    correctIndex: 1, hint: '先看资料适用于哪台设备、哪个版本，再看指令编号。',
    feedback: '资料甲提供可追溯的型号和版本信息。版本、任务条件仍有疑问时，把待确认项交给课程教师。',
  },
  '8.6': {
    topic: 'CAM 轨迹与图样核对',
    situation: '将阶梯轴的示意轨迹与目标轮廓叠在一起。深色实线是图样，橙色虚线是预览。',
    prompt: '你会先标出哪一段，交给同学核对转折位置？',
    options: ['A 段的平直部分', 'B 段的轴肩转折', 'C 段的终点'],
    correctIndex: 1, hint: '沿实线从左向右找出它改变方向的位置，再看橙色虚线在哪里改变方向。',
    feedback: '图号、具体轮廓段与预览位置可以复查。预览显示的是轨迹关系，现场加工效果由实际测量和教师检查确认。',
  },
};

export const transferExercises = {
  '8.2': {
    topic: caseExercises['8.2'].topic,
    situation: '换一组现场信息。准备观察阶梯轴示范时，面板出现了未讲过的提示，一名同学说他以前见过。',
    prompt: '哪一项可以作为接下来行动的依据？',
    options: ['同学记得的画面颜色', '上次实训的启动顺序', '本机对应的现场规程与教师对当前情况的确认'],
    correctIndex: 2, hint: '区分别人以前见过的情况和本机这一次的实际情况。',
    feedback: '保留提示信息，按本机规程请教师核实当前状态。口头猜测不足以确认设备状态。',
  },
  '8.3': {
    topic: caseExercises['8.3'].topic,
    situation: '你收到另一张图纸的检验表。两个外圆都填了实测值，记录员却把它们都叫“外径”，没有注明各自属于哪一级台阶。',
    prompt: '补上哪项信息后，同学能把两条记录放回图上的正确位置？',
    options: ['各级外圆的图样标记和与之对应的实测值', '拍照人员的姓名', '零件成品总长'],
    correctIndex: 0, hint: '同名尺寸可以出现在不同位置。想想怎样让每一行指向唯一的表面。',
    feedback: '测量记录需要和具体表面一一对应。图样标记使教师能复核每个外圆的测量结果。',
  },
  '8.4': {
    topic: caseExercises['8.4'].topic,
    situation: '本次只读一段轨迹的起点与终点。两点的 X 相同，Z 有变化。教师说明这一段是直线，并约定 Z 沿轴向。',
    prompt: '这段轨迹应如何描述？',
    options: ['停留在原点', '沿轴向的平直段', '沿轴肩的径向段'],
    correctIndex: 1, hint: '在约定的坐标图里，找出发生变化的那一轴。',
    feedback: '在本题的直线段中，只有 Z 发生变化，轨迹沿轴向。读另一段时仍需先核对那段的起终点。',
  },
  '8.5': {
    topic: caseExercises['8.5'].topic,
    situation: '这次两份资料都写着 GSK980TDb。一份材料标明课程采用的版本和章节，另一份截图裁掉了版本信息。',
    prompt: '怎样记录查证过程，方便教师复核？',
    options: ['选字更清楚的一张截图', '合并两份文字，省去版本区别', '注明与本课对应的版本、章节和仍需核实的条目'],
    correctIndex: 2, hint: '型号一致后，还应保留能够回到原文的依据。',
    feedback: '型号、版本和章节能定位适用的原文。信息不足的条目应该保留为待确认。',
  },
  '8.6': {
    topic: caseExercises['8.6'].topic,
    situation: '同学提交了另一个 CAM 预览：图样与预览在同一处转折，但一张图没有标出使用的基准，无法对齐两幅图。',
    prompt: '下哪一个结论最合适？',
    options: ['先补基准和图号，再比较转折的位置', '已证明零件合格', '已经确认成品尺寸超差'],
    correctIndex: 0, hint: '先判断两幅图具不具备可比条件，再说明差异。',
    feedback: '对齐基准后才有比较位置的依据。成品尺寸还应以实际测量记录为准。',
  },
};

const casesByChapter = Object.fromEntries(Object.entries(additionalCases).map(([chapterId, items]) => {
  const originalId = 'case-' + chapterId;
  const original = { ...(caseExercises[chapterId] || { topic: coordinateTopic }), id: originalId, transfer: transferExercises[chapterId] };
  return [chapterId, [original, ...items.map(item => {
    const check = transferChecks[chapterId][item.id];
    return {
      ...item, id: originalId + '-' + item.id,
      transfer: {
        situation: check.situation, prompt: '你怎样评价这份记录？',
        options: ['判断有依据', '判断需要修正'], correctIndex: check.agree ? 0 : 1,
        hint: item.hint, feedback: check.feedback,
      },
    };
  })]];
}));

export function chapterCases(chapterId) {
  return casesByChapter[chapterId] || [];
}

export function recordedCaseId(entry) {
  return entry.caseId || 'case-' + entry.chapterId;
}

export function recordedCaseRound(entry) {
  if (Number.isSafeInteger(entry.round) && entry.round >= 0) return entry.round;
  const caseId = recordedCaseId(entry);
  const prefix = caseId + '-';
  if (entry.exerciseId?.startsWith(prefix)) {
    const suffix = entry.exerciseId.slice(prefix.length);
    if (/^\d+$/.test(suffix) && Number.isSafeInteger(Number(suffix))) return Number(suffix);
  }
  if (entry.transfer === false) return 0;
  if (entry.transfer === true && caseId !== 'case-8.1') return 1;
  return null;
}
