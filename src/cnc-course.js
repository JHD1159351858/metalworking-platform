import { shuffled } from './learning-data.js';
import { unit1Questions, unit2Questions } from './question-banks/units-1-2.js';
import { unit3Questions, unit4Questions } from './question-banks/units-3-4.js';
import { unit5Questions, unit6Questions } from './question-banks/units-5-6.js';

export const cncChapters = [
  {
    id: '8.1',
    title: '数控机床的坐标系统简介',
    resourceCount: 2,
    source: '项目整理',
    summary: '从一张车削示意图入手，弄清机床参考点、机床坐标和工件坐标分别回答什么问题。',
    keyPoints: ['对照图示辨认坐标轴及正方向。', '用同一个位置说明它在两套坐标下为何可能有不同的数值。', '标出编程所用的原点，并核对图纸采用的尺寸基准。'],
  },
  {
    id: '8.2',
    title: '数控车床基础',
    resourceCount: 1,
    source: '项目整理',
    summary: '先认识设备组成和各部件的分工，再对照教师讲解和本机说明了解基本操作要求。',
    keyPoints: ['分辨控制面板、工件夹持部件和刀具部件。', '用自己的话说明主轴、进给系统和刀架的作用。', '把现场教师要求的上机前检查列成清单。'],
  },
  {
    id: '8.3',
    title: '数控车床加工工艺与加工程序的编制',
    resourceCount: 1,
    source: '项目整理',
    summary: '以图纸要求为起点整理加工工序，说明每个程序片段服务于哪一步加工或检查。',
    keyPoints: ['从图纸中提取加工表面、尺寸和公差要求。', '说明装夹、工序次序与后续检验之间的关系。', '在工序单中标记待教师核实的条件。'],
  },
  {
    id: '8.4',
    title: '数控车床编程基础',
    resourceCount: 1,
    source: '项目整理',
    summary: '读懂程序的常见结构和基本用语，结合轮廓图解释程序中的运动与辅助动作。',
    keyPoints: ['按用途把示例程序分成准备、加工和结束部分。', '辨认程序字、程序段和运动指令之间的关系。', '结合轮廓图核对程序所采用的坐标与单位。'],
  },
  {
    id: '8.5',
    title: 'GSK980TDb系统数控车床常用的编程指令与操作',
    resourceCount: 1,
    source: '项目整理',
    summary: '以课程指定的 GSK980TDb 系统为例，查找常用指令的说明，并理解程序和设备状态需要一起核对。',
    keyPoints: ['用对应型号手册查程序指令的功能与使用条件。', '结合课堂实例辨认程序显示、设备状态与报警信息。', '把不同控制系统之间需要重新核对的内容记下来。'],
  },
  {
    id: '8.6',
    title: 'CAXA数控车CAM软件介绍及实例',
    resourceCount: 2,
    source: '项目整理',
    summary: '沿着轮廓、加工设置、轨迹预览到程序输出的顺序，理解 CAM 实例中每一步的作用。',
    keyPoints: ['核对示例轮廓与任务图纸是否一致。', '在轨迹预览中检查刀路与目标轮廓的对应关系。', '说明后置处理为什么需要匹配目标机床和控制系统。'],
  },
];

// Keep the original section IDs as keys for saved progress and source references.
export function unitLabel(id) {
  const index = cncChapters.findIndex(chapter => chapter.id === id);
  return index < 0 ? id : `第 ${index + 1} 单元`;
}

export function feedbackLabel(text) {
  const chapter = cncChapters.find(ch => text.startsWith(`【第 ${ch.id} 节】`));
  if (!chapter) return text;
  return `【${unitLabel(chapter.id)}】` + text.slice(text.indexOf('】') + 1);
}

export const cncAssessmentQuestions = [
  {
    id: 'cnc-81-1', chapterId: '8.1', category: '工艺理论', topic: '机床坐标与工件坐标',
    prompt: '同一个轮廓点在机床坐标系和工件坐标系中读数不同，首先应核对什么？',
    options: ['两套坐标各自的原点和方向', '程序的文件扩展名', '设备外观与颜色', '图纸上的字体大小'],
    answer: 0,
    explanation: '坐标描述要以特定的原点、方向和单位为依据。同一位置换到另一套坐标系后，读数可能发生变化。',
  },
  {
    id: 'cnc-81-2', chapterId: '8.1', category: '工艺理论', topic: '图纸与坐标基准',
    prompt: '给一张车削示意图补充坐标说明时，下列哪一组信息最有用？',
    options: ['图纸颜色和绘制日期', '文件名和打印方向', '各轴方向、坐标原点和尺寸基准', '工件照片和设备编号'],
    answer: 2,
    explanation: '方向、原点与尺寸基准让读者能够在同一套约定下理解轮廓位置。',
  },
  {
    id: 'cnc-82-1', chapterId: '8.2', category: '工艺理论', topic: '数控车床组成',
    prompt: '设备认知练习要求标出用于夹持工件的常见部件。应选择哪一项？',
    options: ['操作面板', '排屑机构', '润滑装置', '卡盘'],
    answer: 3,
    explanation: '卡盘是数控车床上常见的工件夹持部件，具体夹持方式取决于设备和实训任务。',
  },
  {
    id: 'cnc-82-2', chapterId: '8.2', category: '安全知识', topic: '现场操作确认',
    prompt: '换到一台自己没有操作过的教学车床，准备开始实训时应先做什么？',
    options: ['照搬上一台设备的操作步骤', '确认本机操作规程，并请现场教师确认', '先试用几个按键再看说明', '让同学运行程序，自己在旁观察'],
    answer: 1,
    explanation: '设备型号和实训规程可能不同。操作前应了解本机要求并获得现场教师确认。',
  },
  {
    id: 'cnc-83-1', chapterId: '8.3', category: '工艺理论', topic: '工序规划',
    prompt: '开始整理一项车削任务的工序单时，哪一步能帮助后续判断加工和检验是否满足要求？',
    options: ['先提取图纸的关键表面、尺寸和公差', '先选最长的一段示例程序', '先给程序文件命名', '先假定所有表面都用同一种检验方式'],
    answer: 0,
    explanation: '图纸给出了加工目标与验收依据。先读懂要求，才能合理安排工序和检验。',
  },
  {
    id: 'cnc-83-2', chapterId: '8.3', category: '工艺理论', topic: '工序与程序对应',
    prompt: '同学提交了一段程序和一份工序单。哪种核对方法最能发现遗漏的加工步骤？',
    options: ['比较两份文件的页数', '统计程序行数', '检查文件名是否相同', '把各程序片段逐一对应到工序与加工表面'],
    answer: 3,
    explanation: '建立工序和程序片段的对应关系，可以看见哪个加工要求尚未由程序覆盖。',
  },
  {
    id: 'cnc-84-1', chapterId: '8.4', category: '工艺理论', topic: '程序结构',
    prompt: '为第一次阅读数控程序的同学做说明，怎样拆解示例程序更清楚？',
    options: ['按每行字数由少到多排列', '按准备、加工和结束三个用途解释各段', '只抄最后一行并记住格式', '只列出出现过的字母'],
    answer: 1,
    explanation: '按程序段的用途讲解能够保留执行顺序，也有助于理解每一段对加工任务的作用。',
  },
  {
    id: 'cnc-84-2', chapterId: '8.4', category: '工艺理论', topic: '程序与轮廓核对',
    prompt: '两份示例程序的坐标数值不同，但描述的零件轮廓看起来相同。下一步应核对什么？',
    options: ['代码段的缩进', '程序文件名的长度', '两份程序约定的坐标、单位和轮廓基准', '两份程序采用的显示字体'],
    answer: 2,
    explanation: '数值需要在程序的单位、坐标约定和轮廓基准下解释，仅比较数字无法判断描述是否一致。',
  },
  {
    id: 'cnc-85-1', chapterId: '8.5', category: '工艺理论', topic: '控制系统与指令',
    prompt: '在其他品牌的手册中看到一个熟悉的指令编号，准备把它用于 GSK980TDb 教学实例。应先核对什么？',
    options: ['当前型号手册中的指令含义和适用条件', '两本手册封面的版本颜色', '操作台的高度', '示例程序包含的总字符数'],
    answer: 0,
    explanation: '同名编号在不同系统中可能有不同写法或限制。应查阅与当前系统相匹配的资料。',
  },
  {
    id: 'cnc-85-2', chapterId: '8.5', category: '安全知识', topic: '控制面板报警',
    prompt: '实训中控制面板出现未见过的报警，应优先怎么做？',
    options: ['反复尝试启动直到报警消失', '依据网络示例修改报警相关参数', '照同学的方法跳过报警', '按实训现场规程处置，记录报警并报告教师'],
    answer: 3,
    explanation: '报警记录有助于现场教师判断原因。应按所在实训场地的规程处置并请教师确认。',
  },
  {
    id: 'cnc-86-1', chapterId: '8.6', category: '工艺理论', topic: 'CAM轨迹预览',
    prompt: '用 CAXA 数控车 CAM 软件预览一个教学实例时，最值得记录的发现是？',
    options: ['软件窗口的颜色', '生成文件所用的文件夹名称', '预览轨迹和加工轮廓是否对应，以及发现了哪些偏差', '操作电脑的屏幕尺寸'],
    answer: 2,
    explanation: '轨迹预览可以帮助检查刀路和轮廓的对应情况。记录偏差便于进一步核对模型与加工设置。',
  },
  {
    id: 'cnc-86-2', chapterId: '8.6', category: '工艺理论', topic: 'CAM后置处理',
    prompt: '同一个 CAM 实例需要面向另一台教学机床输出程序，最需要重新核对哪项？',
    options: ['项目封面', '后置处理与目标机床、控制系统的适配情况', '演示视频的分辨率', '课程章节编号'],
    answer: 1,
    explanation: '后置处理决定 CAM 数据如何转成机床可识别的程序，需要与目标设备及控制系统相匹配。',
  },
];

const originalChapterQuestions = [
  {
    id: 'cnc-81-3', chapterId: '8.1', category: '工艺理论', topic: '轴向识别',
    prompt: '一条尺寸线平行于车床主轴轴线，标注的是两端面之间的距离。应从哪个方向读它？',
    options: ['X 的半径方向', 'Z 的轴向', '绕主轴的转角方向', 'X 的直径方向'],
    answer: 1, explanation: '车床的 Z 轴平行于主轴轴线，两端面之间的轴向距离沿 Z 方向读取。',
  },
  {
    id: 'cnc-81-4', chapterId: '8.1', category: '工艺理论', topic: '工件零点平移',
    prompt: '+Z 向右。点 P 在旧零点右侧 18 mm，新零点在旧零点右侧 25 mm。换基准后 P 的 Z 坐标是多少？',
    options: ['+43 mm', '+7 mm', '−7 mm', '−43 mm'],
    answer: 2, explanation: '把旧坐标减去新零点在旧坐标系中的位置，得到 18 − 25 = −7 mm。',
  },
  {
    id: 'cnc-81-5', chapterId: '8.1', category: '工艺理论', topic: '位移与位置',
    prompt: '同一坐标系下，刀位点的 Z 值从 −12 mm 变到 −5 mm。这段运动的轴向位移是多少？',
    options: ['+7 mm', '−7 mm', '+17 mm', '−17 mm'],
    answer: 0, explanation: '位移等于终点坐标减起点坐标，−5 − (−12) = +7 mm。',
  },
  {
    id: 'cnc-81-6', chapterId: '8.1', category: '工艺理论', topic: '直径与半径表示',
    prompt: '点位表已注明“X 按直径表示”。表中的 X36 对应单侧轮廓离中心线多远？',
    options: ['72 mm', '36 mm', '9 mm', '18 mm'],
    answer: 3, explanation: '直径表示时，单侧轮廓到中心线的距离为直径的一半，即 36 ÷ 2 = 18 mm。',
  },
  {
    id: 'cnc-81-7', chapterId: '8.1', category: '工艺理论', topic: '机床参考点',
    prompt: '“机床用来建立或核对位置的已知点”应在图中标为什么？',
    options: ['工件的左端面', '机床参考点', '任意图纸尺寸原点', '当前刀尖位置'],
    answer: 1, explanation: '参考点是机床用来建立或核对位置的已知位置，不能直接当作每张零件图的工件零点。',
  },
  {
    id: 'cnc-81-8', chapterId: '8.1', category: '工艺理论', topic: '正方向与负坐标',
    prompt: '图上已把 +Z 画向左，P 在工件零点的右侧 6 mm。应在 P 旁标什么？',
    options: ['Z = +6 mm', 'X = −6 mm', 'Z = −6 mm', 'Z = 0 mm'],
    answer: 2, explanation: 'P 所在方向与 +Z 箭头相反，轴向读数是负数。',
  },
  {
    id: 'cnc-81-9', chapterId: '8.1', category: '工艺理论', topic: '负坐标的含义',
    prompt: '点位表中的工件坐标为 Z = −3 mm。仅据此可以确定什么？',
    options: ['该点位于工件零点的 Z 负方向', '刀具已经超出机床行程', '该点一定在毛坯内部', '主轴处于反转状态'],
    answer: 0, explanation: '负号说明点相对当前零点的方向。行程、材料位置与主轴状态还需要各自的依据。',
  },
  {
    id: 'cnc-81-10', chapterId: '8.1', category: '工艺理论', topic: '绝对位置与相对位移',
    prompt: '记录只给出“沿 +Z 移动 4 mm”。若要算出终点在工件坐标系中的 Z 值，还缺少哪项？',
    options: ['工件外径', '机床总行程', '测量表的精度', '同一坐标系中的起点 Z 值'],
    answer: 3, explanation: '终点位置等于起点位置加位移。知道方向和距离仍需有起点坐标。',
  },
  {
    id: 'cnc-82-3', chapterId: '8.2', category: '工艺理论', topic: '主轴运动',
    prompt: '观察车床侧视图，卡盘上有一个固定标记。主轴旋转一圈，随卡盘转过一圈的是哪个部件？',
    options: ['刀架', '夹紧在卡盘上的工件', '床身', '控制面板'],
    answer: 1, explanation: '主轴驱动卡盘，可靠夹紧的工件随卡盘一同旋转。',
  },
  {
    id: 'cnc-82-4', chapterId: '8.2', category: '工艺理论', topic: '刀架与进给',
    prompt: '观察到工件继续旋转，刀尖沿 Z 方向改变位置。哪个部件支承这把刀具？',
    options: ['主轴', '床身底座', '卡盘夹爪', '刀架'],
    answer: 3, explanation: '刀架支承刀具，进给机构带动相应部件沿规定轴向移动。',
  },
  {
    id: 'cnc-82-5', chapterId: '8.2', category: '工艺理论', topic: '导轨作用',
    prompt: '教学图的箭头指向床身上的导轨。下列哪项说明对应它的主要作用？',
    options: ['带动卡盘旋转', '显示待执行的程序段', '为运动部件提供支承与导向', '测量工件外径'],
    answer: 2, explanation: '床身和导轨为运动部件提供支承与导向，使其沿规定方向移动。',
  },
  {
    id: 'cnc-82-6', chapterId: '8.2', category: '工艺理论', topic: '目标位置与反馈位置',
    prompt: '同一坐标系下，记录显示指令目标 Z10 mm、当前反馈 Z8 mm。哪种表述准确？',
    options: ['当前反馈位置与目标相差 2 mm', '工件长度一定短了 2 mm', '机床零点一定改变了 2 mm', '转速相差 2 转/分'],
    answer: 0, explanation: '两个数表示当前反馈与目标位置的差别，仅凭这两个数不能判断零件尺寸或误差原因。',
  },
  {
    id: 'cnc-82-7', chapterId: '8.2', category: '安全知识', topic: '现场停机确认',
    prompt: '视频的一帧里，夹爪和工件看起来静止。计划在现场测量前，还要做什么？',
    options: ['把画面放大再观察', '等待视频进度条走完', '按现场规程确认已停机并取得教师许可', '用屏幕上显示的坐标代替停机确认'],
    answer: 2, explanation: '视频帧不能作为现场设备停机的证据，现场测量需要按规定确认设备状态。',
  },
  {
    id: 'cnc-82-8', chapterId: '8.2', category: '工艺理论', topic: '两帧位置对照',
    prompt: '同一坐标系中，两帧显示值依次为（X40，Z12）和（X40，Z7），单位 mm。能从中读出哪项？',
    options: ['纵向净移动 +5 mm', 'Z 轴净移动 −5 mm', 'X 轴净移动 −5 mm', '两帧间必然完成了切削'],
    answer: 1, explanation: 'Z 的变化量为 7 − 12 = −5 mm，X 读数相同。是否切削还需知道毛坯位置。',
  },
  {
    id: 'cnc-82-9', chapterId: '8.2', category: '工艺理论', topic: '面板读数单位',
    prompt: '同学把“主轴实际转速”的记录填进了轴位置栏。用哪个单位最容易发现填错？',
    options: ['mm', 'mm/转', 'mm/min', 'r/min'],
    answer: 3, explanation: 'r/min 是每分钟转数，表示旋转快慢。轴的位置通常以长度单位记录。',
  },
  {
    id: 'cnc-82-10', chapterId: '8.2', category: '安全知识', topic: '设备异常报告',
    prompt: '实训开始前，现场防护门状态指示异常。学生接下来应做什么？',
    options: ['告知指导教师，按本机规程等待处理', '只在记录表上写明后继续', '换用另一段程序验证', '请同组成员代为确认即可'],
    answer: 0, explanation: '防护状态异常需要由现场教师按规定确认处理，学生不可据猜测继续。',
  },
  {
    id: 'cnc-83-3', chapterId: '8.3', category: '工艺理论', topic: '测量面选择',
    prompt: '图纸标注左端面至第一轴肩的长度。填写该项检验记录时，哪两个面构成测量对象？',
    options: ['两个外圆柱面', '左端面与第一轴肩端面', '第一、第二轴肩端面', '左右两个端面'],
    answer: 1, explanation: '尺寸界线标出的两个面确定测量对象，其他轴段的长度对应不同的指标。',
  },
  {
    id: 'cnc-83-4', chapterId: '8.3', category: '工艺理论', topic: '双向公差范围',
    prompt: '台阶长度为 25.00 ± 0.05 mm。按此标注，允许范围是多少？',
    options: ['24.50～25.50 mm', '25.00～25.05 mm', '24.95～25.05 mm', '24.95～25.00 mm'],
    answer: 2, explanation: '名义尺寸分别加上上偏差、下偏差，得到 25.05 mm 和 24.95 mm。',
  },
  {
    id: 'cnc-83-5', chapterId: '8.3', category: '工艺理论', topic: '超差量计算',
    prompt: '允许范围为 19.90～20.10 mm，有效读数为 20.12 mm。该如何记录？',
    options: ['超过上限 0.02 mm', '超过上限 0.12 mm', '比下限小 0.02 mm', '处于允许范围'],
    answer: 0, explanation: '应与最近的限值比较，20.12 − 20.10 = 0.02 mm。',
  },
  {
    id: 'cnc-83-6', chapterId: '8.3', category: '工艺理论', topic: '基准与工步安排',
    prompt: '某轴段长度从一个端面量起。后续工步需要依赖该端面时，安排工序应核对什么？',
    options: ['每一步所占的表格行数', '成品包装后的摆放方向', '图纸上文字的先后顺序', '基准端面是否已形成并能在后续装夹中找回'],
    answer: 3, explanation: '工序之间存在基准依赖。建立并能找回规定基准是后续形成尺寸的条件。',
  },
  {
    id: 'cnc-83-7', chapterId: '8.3', category: '工艺理论', topic: '复查测量记录',
    prompt: '另一组要复核你对轴肩长度的判定。哪一份记录更完整？',
    options: ['“外形与图纸相似”，附照片', '指定测量面、量具、读数与单位、允许范围', '测量日期与加工用时', '两次读数的平均值，无测量位置'],
    answer: 1, explanation: '把测量对象、方法、结果和判据记在一起，其他人才有条件复核。',
  },
  {
    id: 'cnc-83-8', chapterId: '8.3', category: '工艺理论', topic: '不同质量指标',
    prompt: '量得外圆直径满足图纸公差。图纸还标有表面粗糙度。下一步应如何判定？',
    options: ['直径合格即视为粗糙度合格', '按轴向总长推断粗糙度', '按图纸要求另行检查粗糙度', '改用公差带宽度作为粗糙度值'],
    answer: 2, explanation: '尺寸与表面粗糙度是不同指标，须按各自的要求进行检查。',
  },
  {
    id: 'cnc-83-9', chapterId: '8.3', category: '工艺理论', topic: '单向偏差',
    prompt: '图纸给定长度 30.00 mm，上偏差为 0，下偏差为 −0.08 mm。哪个读数落在允许范围？',
    options: ['30.03 mm', '29.89 mm', '30.08 mm', '29.95 mm'],
    answer: 3, explanation: '允许区间为 29.92～30.00 mm，29.95 mm 落在区间内。',
  },
  {
    id: 'cnc-83-10', chapterId: '8.3', category: '工艺理论', topic: '图纸版本核对',
    prompt: '工序卡上的轴肩长度为 18 mm，而最新任务图标为 20 mm。应怎样处理这处差异？',
    options: ['记录两处差异并请教师确认有效版本后修订', '取两数的平均值作为检验要求', '沿用上一组测得的值', '用程序中出现次数最多的值'],
    answer: 0, explanation: '工序设计与检验应使用一致的依据。版本和尺寸冲突时需要先确认当前有效要求。',
  },
  {
    id: 'cnc-84-3', chapterId: '8.4', category: '工艺理论', topic: '运动方式识读',
    prompt: '阅读课堂程序片段时看到 G01。它指定哪一种运动方式？',
    options: ['快速定位', '直线插补', '顺时针圆弧插补', '程序暂停'],
    answer: 1, explanation: 'G01 指定直线插补，解释具体运动时还需查看起点、终点和进给条件。',
  },
  {
    id: 'cnc-84-4', chapterId: '8.4', category: '工艺理论', topic: '快速定位与路径',
    prompt: '两条程序段分别用 G00 和 G01 到达同一终点，可以直接得出什么？',
    options: ['两段必定具有相同的中间路径', '两段必定具有相同的速度', '目标点一致，运动方式仍需要区分', '两段都会切除相同的材料'],
    answer: 2, explanation: '相同的目标点只确定终点，快速定位和直线插补的运动方式与用途不同。',
  },
  {
    id: 'cnc-84-5', chapterId: '8.4', category: '工艺理论', topic: '模态延续',
    prompt: '只截取程序中一个不含运动方式代码的坐标行。为判断生效的运动方式，应补看什么？',
    options: ['上一条仍生效的同组模态指令', '程序注释的总字数', '文件中最后出现的坐标值', '工件照片上的加工日期'],
    answer: 0, explanation: '某些指令具有模态，后续行可沿用它；读取片段时应追溯当时生效的状态。',
  },
  {
    id: 'cnc-84-6', chapterId: '8.4', category: '工艺理论', topic: '圆柱外形的读图',
    prompt: '给定 Z 轴水平的车削剖面，两个点的半径相同，Z 值不同。连接它们的线段与中心线是什么关系？',
    options: ['垂直', '重合在中心线上', '成 45° 夹角', '平行'],
    answer: 3, explanation: '半径不变时，轮廓沿轴向延伸，在该剖面中平行于中心线。',
  },
  {
    id: 'cnc-84-7', chapterId: '8.4', category: '工艺理论', topic: '端面轮廓',
    prompt: '轮廓线的两端具有相同 Z 值、不同半径。该线段对应剖面中的哪一种走向？',
    options: ['沿轴线延伸', '沿径向延伸', '以主轴为圆心的整圆', '只凭线段可确定螺距'],
    answer: 1, explanation: '轴向位置固定、半径变化时，线段沿径向延伸，端面在剖面中可这样表示。',
  },
  {
    id: 'cnc-84-8', chapterId: '8.4', category: '工艺理论', topic: '锥面直径差换算',
    prompt: '在 X 直径表示下，A 的 X 为 30，B 的 X 为 24，单位 mm。两点到中心线的距离相差多少？',
    options: ['6 mm', '12 mm', '3 mm', '27 mm'],
    answer: 2, explanation: '两点的半径分别为 15 和 12 mm，差为 3 mm。',
  },
  {
    id: 'cnc-84-9', chapterId: '8.4', category: '工艺理论', topic: '轮廓点次序',
    prompt: '图纸上轮廓先经过 A，再到拐点 B，最后到 C。按直线连接时遗漏 B，最先应检查哪一项？',
    options: ['A 到 C 的直连是否绕开图纸要求的转折', '程序标题字数是否改变', '机床铭牌是否改变', '终点 C 的单位是否自动翻倍'],
    answer: 0, explanation: '直连 A、C 可能跳过拐点 B，须按图纸顺序检查所有相邻轮廓段。',
  },
  {
    id: 'cnc-84-10', chapterId: '8.4', category: '工艺理论', topic: '起点信息',
    prompt: '程序摘录只写明某直线段的终点。要在图纸上唯一画出该段，还必须知道什么？',
    options: ['这段程序的文件大小', '所有程序段的总数', '主轴转速的历史最大值', '同一坐标系中该段的起点'],
    answer: 3, explanation: '直线段需要起点和终点；没有起点就无法唯一确定长度和方向。',
  },
  {
    id: 'cnc-85-3', chapterId: '8.5', category: '工艺理论', topic: '每转进给的单位',
    prompt: 'GSK980TDb 公制教学记录中，G99 有效，F0.2 表示什么？',
    options: ['每分钟 0.2 mm', '主轴每转进给 0.2 mm', '目标直径 0.2 mm', '主轴每分钟转 0.2 圈'],
    answer: 1, explanation: '在此系统的公制 G99 状态中，F 值按 mm/转解释。',
  },
  {
    id: 'cnc-85-4', chapterId: '8.5', category: '工艺理论', topic: '每分钟进给的单位',
    prompt: '另一份 GSK980TDb 公制记录中生效的是 G98。F0.2 的单位为？',
    options: ['mm/转', 'r/min', 'mm/min', 'mm²'],
    answer: 2, explanation: 'G98 是每分钟进给方式。在公制记录中 F0.2 表示每分钟进给 0.2 mm。',
  },
  {
    id: 'cnc-85-5', chapterId: '8.5', category: '工艺理论', topic: '进给截图缺少的条件',
    prompt: '截图只截到 F0.2，已知为公制 GSK980TDb 系统。写下“0.2 mm/转”前，还需找到哪个条件？',
    options: ['当时生效的进给方式', '截图文件的扩展名', '图纸的投影方向', '刀架上刀位总数'],
    answer: 0, explanation: '公制只确定长度单位，仍要区分每转进给和每分钟进给。',
  },
  {
    id: 'cnc-85-6', chapterId: '8.5', category: '工艺理论', topic: 'S 字功能',
    prompt: '在课堂示例中，想找出与主轴相关的指令字，应优先标注哪一个？',
    options: ['Z', 'F', 'T', 'S'],
    answer: 3, explanation: 'S 与主轴有关，具体数值含义应结合当时采用的控制方式和机床资料解释。',
  },
  {
    id: 'cnc-85-7', chapterId: '8.5', category: '工艺理论', topic: 'T 字与刀补',
    prompt: '读到 T 字后，准备在课堂报告中解释刀具与补偿的对应关系。应查哪一项？',
    options: ['工件尺寸总数', '该系统对刀具号及补偿编号的约定', 'F 值所在行的序号', '量具刻度间距'],
    answer: 1, explanation: 'T 字与刀具功能相关，刀具及补偿编号的解释要依据适用系统的约定。',
  },
  {
    id: 'cnc-85-8', chapterId: '8.5', category: '工艺理论', topic: '报警上下文',
    prompt: '教师比较两次课堂报警案例。哪份摘录最有助于发现两次触发条件的差别？',
    options: ['不同日期拍摄的机床外观', '只有报警框的颜色', '报警号、完整提示、工作方式、当前段及前一动作', '两份报告各自的页数'],
    answer: 2, explanation: '完整提示和执行上下文可用于与对应版本手册中的触发条件逐项核对。',
  },
  {
    id: 'cnc-85-9', chapterId: '8.5', category: '工艺理论', topic: '报警所在行与原因',
    prompt: '两次记录都在相同程序行显示报警，但前一段的状态不同。省略前面的程序段会损失什么信息？',
    options: ['仍然生效并可能影响该行解释的条件', '这行字符的字体大小', '程序导出文件夹的名称', '屏幕保护时间'],
    answer: 0, explanation: '报警行标出系统发现问题的位置，前面建立并延续的状态也可能影响结果。',
  },
  {
    id: 'cnc-85-10', chapterId: '8.5', category: '工艺理论', topic: '坐标画面类型',
    prompt: '同台 GSK980TDb 的两个位置画面都显示 X、Z，但数值不同。为便于他人比较应一并记录什么？',
    options: ['哪张截图文件更大', '操作员查看画面的顺序', '两张画面的背景颜色', '画面名称、坐标类别及单位'],
    answer: 3, explanation: 'X、Z 在不同坐标类别中采用的基准可能不同，记录画面类别和单位才能解释读数。',
  },
  {
    id: 'cnc-86-3', chapterId: '8.6', category: '工艺理论', topic: '毛坯与目标轮廓',
    prompt: '导入两条剖面线，一条表示初始材料边界，一条表示成品边界。后者应指定为哪一类几何？',
    options: ['毛坯轮廓', '目标轮廓', '接近路径', '撤离路径'],
    answer: 1, explanation: '目标轮廓描述加工后应形成的零件边界，毛坯轮廓描述加工前的材料外形。',
  },
  {
    id: 'cnc-86-4', chapterId: '8.6', category: '工艺理论', topic: '导入几何的单位',
    prompt: '导入的轮廓外形与图纸相似，但同一已知长度在模型中相差固定倍数。应先核对什么？',
    options: ['刀具的显示颜色', '程序段的编号', '建模单位及导入比例', '文件保存日期'],
    answer: 2, explanation: '几何整体成比例放大或缩小时，应先对照已知尺寸核查单位和导入比例。',
  },
  {
    id: 'cnc-86-5', chapterId: '8.6', category: '工艺理论', topic: '轮廓连接',
    prompt: '预览前发现两条本应相接的轮廓线之间有间隙。应先回到哪一步核查？',
    options: ['模型几何与相邻线段端点', '成品评分表', '操作面板的转速读数', '最终程序的文件命名'],
    answer: 0, explanation: '目标轮廓的连续性由建模或导入的几何决定，应检查端点是否正确相接。',
  },
  {
    id: 'cnc-86-6', chapterId: '8.6', category: '工艺理论', topic: '进退路径与成品边界',
    prompt: '刀路预览中有一段运动从外部接近零件，它不重合成品轮廓。应怎样解释？',
    options: ['该线一定代表成品上的沟槽', '一定是毛坯几何丢失', '可以直接据此判断后置失败', '先辨认它是否是接近运动，再对照工序检查'],
    answer: 3, explanation: '刀具路径含接近、加工和离开等运动，只有特定段需要与目标表面相对应。',
  },
  {
    id: 'cnc-86-7', chapterId: '8.6', category: '工艺理论', topic: '槽边偏差',
    prompt: '图纸与预览已对齐同一 Z0，+Z 向右。同一槽右边的设计值为 −16 mm，预览为 −12 mm。预览槽边相对设计位置如何变化？',
    options: ['向左 4 mm', '向右 4 mm', '向左 28 mm', '向右 28 mm'],
    answer: 1, explanation: '预览位置减设计位置，−12 − (−16) = +4 mm，因此向 Z 正方向偏了 4 mm。',
  },
  {
    id: 'cnc-86-8', chapterId: '8.6', category: '工艺理论', topic: '预览依据',
    prompt: '轨迹预览显示加工路径连续。若要解释该结果的适用范围，应记录什么？',
    options: ['动画播放窗口的尺寸', '轮廓线的屏幕颜色', '计算时的毛坯、刀具及工序设置', '生成图片用了几秒'],
    answer: 2, explanation: '预览由当前模型、刀具和工序条件计算而来，说明设置可帮助他人复现和核对。',
  },
  {
    id: 'cnc-86-9', chapterId: '8.6', category: '工艺理论', topic: '后置处理的输入输出',
    prompt: '对已生成的刀路进行后置处理，主要得到什么？',
    options: ['面向所选控制系统的数控程序', '工件装夹后的实测尺寸', '教师的实操评分', '已加工零件的表面粗糙度报告'],
    answer: 0, explanation: '后置处理将 CAM 路径数据转换为适配目标系统的程序格式。',
  },
  {
    id: 'cnc-86-10', chapterId: '8.6', category: '工艺理论', topic: '偏差归因',
    prompt: '仅知道“预览槽边与图纸相差 4 mm”。哪一种结论有充分依据？',
    options: ['零点设置一定错误', '轮廓选择一定错误', '目标机床一定选错', '存在位置差异，原因需继续核对零点、被测槽边与所选轮廓'],
    answer: 3, explanation: '相同数值的差异可能来自不同环节。确认比较对象和基准后，才能进一步定位原因。',
  },
];

const chapterRows = {
  '8.1': unit1Questions, '8.2': unit2Questions, '8.3': unit3Questions,
  '8.4': unit4Questions, '8.5': unit5Questions, '8.6': unit6Questions,
};

// Rows are append-only: their positions after the original ten IDs identify saved answers.
export const cncPracticeQuestions = [
  ...originalChapterQuestions,
  ...Object.entries(chapterRows).flatMap(([chapterId, rows]) =>
    rows.map(([topic, prompt, correct, choice1, choice2, choice3, explanation], index) => {
      const options = [choice1, choice2, choice3];
      const answer = [...prompt].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
      options.splice(answer, 0, correct);
      return { id: `cnc-${chapterId.replace('.', '')}-${index + 11}`, chapterId,
        category: '章节练习', topic, prompt, options, answer, explanation };
    })
  ),
];

export const chapterRoundSize = 10;
export function drawChapterRound(bank) {
  return shuffled(bank).slice(0, chapterRoundSize);
}

export const cncOutline = [
  {
    id: '9',
    title: '数控铣床实训',
    chapters: [
      { id: '9.1', title: '数控铣床实训基础' },
      { id: '9.2', title: '数控铣床加工工艺' },
      { id: '9.3', title: '数控铣床基本操作' },
      { id: '9.4', title: '数控铣床编程基础' },
      { id: '9.5', title: '自动编程与数控仿真' },
      { id: '9.6', title: '知识拓展' },
    ],
  },
  {
    id: '10',
    title: '五轴加工中心',
    chapters: [
      { id: '10.1', title: '五轴加工中心实训' },
      { id: '10.2', title: '五轴加工中心部件结构介绍' },
      { id: '10.3', title: '五轴加工中心模型建立' },
    ],
  },
  {
    id: '11',
    title: '线切割与电火花加工',
    chapters: [
      { id: '11.1', title: '线切割加工基础概述' },
      { id: '11.2', title: '线切割机床简述' },
      { id: '11.3', title: '线切割加工工艺' },
      { id: '11.4', title: '线切割3B代码' },
      { id: '11.5', title: '线切割机床操作实训' },
      { id: '11.6', title: 'CAXA Wedm 软件应用' },
      { id: '11.7', title: '电火花成型加工简述' },
    ],
  },
];
