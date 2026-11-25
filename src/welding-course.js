export const weldingLessons = [
  {
    id: 'weld-preview', title: '焊条电弧焊', src: '/welding/preview.mp4', duration: '4:05',
    summary: '认识焊条、电弧、熔池与焊缝，结合课前安全题梳理进场准备。',
    reading: [
      ['沿着焊缝看一遍', '在微课中找到焊条末端与钢板之间的电弧。关注熔池随焊条移动的位置，再观察经过的位置怎样留下焊缝。'],
      ['先做好防护', '从面罩、工作服、通风条件和易燃物四处检查准备情况。屏幕上能近看电弧，在现场观察时仍需按教师要求做好防护。'],
      ['回看现场任务', '本次实操使用两块低碳钢板。清理焊缝后，记录两侧、表面与根部各有什么可观察的现象，交给教师核对。'],
    ],
  },
  {
    id: 'weld-elective-1', title: '5分钟了解焊接基础', src: '/welding/elective-1.mp4', duration: '9:29', elective: true,
    summary: '从常见焊接方法入手，比较手工电弧焊、氩弧焊和二氧化碳保护焊。',
    reading: [
      ['比较不同方法', '边看边记下画面中出现的三种方法。分别观察焊条或焊丝由谁送进，以及画面里有哪些保护熔池的手段。'],
      ['找回本课工种', '本次低碳钢板案例指定 J422 焊条。对照课前微课，找出选学视频中与本次任务相对应的方法，并给这一段记一个时间点。'],
    ],
  },
  {
    id: 'weld-elective-2', title: '从海上平台事故看焊接质量', src: '/welding/elective-2.mp4', duration: '20:07', elective: true,
    summary: '从海上平台案例出发，认识焊缝缺陷、质量检查与检测。',
    reading: [
      ['看见了什么', '将画面停在展示缺陷的位置。先描述孔洞、沟槽或凸起出现在哪里，再与本课评分表中的气孔、咬边、焊瘤进行对照。'],
      ['看不见什么', '正面照片能记录表面外观，却不能说明整个焊缝内部的状态。无法观察到的部位，应记作待核实，再请教师结合实物判断。'],
    ],
  },
];

export const weldingRubric = [
  { name: '咬边', max: 10, description: '焊缝两侧母材出现沟槽状熔蚀', deductions: '无咬边得满分；轻微、断续扣 3～5 分；连续长咬边或深度较大扣 6～10 分。' },
  { name: '气孔', max: 10, description: '焊缝表面出现孔洞', deductions: '无气孔得满分；零星单个小气孔扣 3～6 分；多处或密集气孔扣 7～10 分。' },
  { name: '夹渣', max: 10, description: '焊缝中残留熔渣', deductions: '无夹渣得满分；少量点状夹渣扣 2～5 分；可见长条状夹渣扣 6～10 分。' },
  { name: '未焊透', max: 10, description: '焊缝根部未熔合或母材间未熔透', deductions: '整条焊缝熔合良好得满分；局部未焊透扣 5～8 分；明显未焊透、间隙未填满扣 10 分。' },
  { name: '焊瘤', max: 10, description: '局部金属流淌，形成瘤状凸起', deductions: '无焊瘤得满分；局部小凸起扣 3～6 分；大面积流淌、凸起明显扣 7～10 分。' },
  { name: '裂纹', max: 10, description: '焊缝及热影响区出现开裂', deductions: '焊缝饱满无开裂得满分；细小裂纹扣 3～5 分；明显大量裂纹扣 6～10 分。' },
];

function question(id, chapterId, topic, prompt, options, answer, explanation, category = '工艺理论') {
  return { id, chapterId, topic, prompt, options, answer, explanation, category };
}

const intro = weldingLessons[0].id, methods = weldingLessons[1].id, quality = weldingLessons[2].id;
export const weldingQuestions = [
  question('weld-drill-01', intro, '现场防护', '已经通过课前测评，到工位后应先做什么？', ['直接引弧', '穿戴防护用品，按教师要求检查设备', '等其他同学开始再准备'], 1, '本案例把防护和设备检查列为考核前提。', '安全知识'),
  question('weld-drill-02', intro, '任务读图', '任务中标注的 3～4 mm 指哪一项？', ['钢板厚度', '焊缝长度', '规定装配间隙'], 0, '案例给出的是单板的推荐厚度，未给出装配间隙的具体数值。'),
  question('weld-drill-03', methods, '焊接方法', '在几种焊接方法中，哪一种使用了本次案例给出的 J422 焊条？', ['钎焊', '电阻点焊', '焊条电弧焊'], 2, '本次任务使用焊条电弧焊。J422 是案例指定的焊条。'),
  question('weld-drill-04', methods, '任务材料', '领料时应核对哪组材料？', ['一根钢轴', '两块 Q235 钢板', '一张铝箔'], 1, '任务为两块低碳钢板对接，原案例推荐 Q235。'),
  question('weld-drill-05', quality, '焊缝缺陷', '焊缝边缘的母材有一段沟槽，首先应对照哪项标准？', ['焊瘤', '咬边', '气孔'], 1, '咬边的观察位置在焊缝两侧母材，表现为沟槽状熔蚀。'),
  question('weld-drill-06', quality, '焊缝缺陷', '记录中写的是“焊缝表面有几个小孔洞”，先查看哪一行评分表？', ['气孔', '夹渣', '裂纹'], 0, '本案例用焊缝表面孔洞描述气孔。'),
];

export const weldingAssessmentQuestions = [
  question('weld-exam-01', intro, '现场防护', '焊件表面已经变暗，准备整理作业台。应怎样处理？', ['徒手移到一旁', '放在纸箱上降温', '按现场要求等待冷却并做好防护'], 2, '工件变暗仍可能高温，须按现场规程处理。', '安全知识'),
  question('weld-exam-02', intro, '设备检查', '实操开始前发现焊钳或线缆损坏，应如何处理？', ['先焊完再说', '停止使用并报告教师', '让同学代为操作'], 1, '设备及线路完好属于现场开工条件。', '安全知识'),
  question('weld-exam-03', methods, '任务材料', '哪一份领料记录符合本次对接平焊案例？', ['两块低碳钢板和 J422 焊条', '一根铜管和钎料', '一块铝板和钢丝刷即可'], 0, '任务要求两块低碳钢板，案例指定 J422 焊条。'),
  question('weld-exam-04', intro, '任务读图', '两块试板应按哪一种形式摆放？', ['搭接成双层', '上下叠放', '板边对接，焊缝水平'], 2, '原案例规定板对接、平焊位置及单面焊。'),
  question('weld-exam-05', quality, '焊缝缺陷', '焊缝局部出现明显金属堆积和瘤状凸起，最符合哪项描述？', ['气孔', '焊瘤', '裂纹'], 1, '评分表将金属流淌堆积形成的局部凸起列为焊瘤。'),
  question('weld-exam-06', quality, '检查证据', '仅有一张焊缝正面照片，记录根部状况的合理方式是哪一种？', ['直接填整条焊透', '自动计算六项满分', '注明根部待检查，请教师核对实物'], 2, '正面照片不足以确认根部熔合情况。实操最终由教师结合实物评判。'),
];

export function weldingReady(record) {
  return Boolean(record.preAssessment && record.videos?.[intro]?.completed && record.attempts?.some(attempt => attempt.passed));
}
