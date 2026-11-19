import { measurementResult, measurementText, reviewFields } from './practical-work.js';

const samplePrompt = '怎样理解我的纸上测量读数？';
const submissionPrompt = '看看最近提交的测量记录';
const reviewPrompt = '老师让我补哪一项？';
export const stageQuestions = {
  pre: ['课前测评会怎样影响我的学习？', '我可以填一半，下次继续吗？'],
  practical: [samplePrompt, reviewPrompt],
  feedback: ['为什么给我这条选学建议？', reviewPrompt],
};
export const stageLabels = { pre: '课前测评', practical: '实操考核', feedback: '智能选学及课程反馈' };

function practicalReading(text, record, latest) {
  const source = '实操任务单 · 本人测量记录';
  const sample = record.caseDraft?.sampleReading;
  const paper = /纸上|练习读数|样例/.test(text);
  const formal = /正式|实际工件|提交|现场/.test(text);
  if (!paper && !formal && latest?.measurements && sample) {
    return { reply: '你同时有纸上练习读数和实操提交记录。两处使用的图纸要求可能不同，想核对哪一处？', options: [samplePrompt, submissionPrompt] };
  }
  const evidence = '若在追查偏差原因，请先核对图纸版本、测量位置、量具和复测记录。单个数值或一张照片无法确定是否与刀具有关。现场原因和成品评价交由教师核实。';
  if (formal || (!paper && !sample && latest)) {
    if (!latest) return { reply: '当前还没有正式实操提交。在任务单中记录图纸版本、测量项、单位、量具和复测值，再请教师核对。', source };
    const m = latest.measurement;
    if (!m) return { reply: `最近提交的测量文字为「${latest.measurements || '未记录'}」。请补充对应图纸及允许范围。${evidence}`, source };
    const result = m.unit === 'mm' && m.standard?.item === m.item
      && measurementResult(m.value, m.standard.lower, m.standard.upper);
    const comparison = result ? `按提交当时的范围 ${m.standard.lower} 至 ${m.standard.upper} mm，${measurementText(result)}。` : '这次提交缺少可对应的毫米标准，请向教师核实允许范围。';
    return { reply: `最近提交 · 图纸「${latest.drawing || '未注明'}」，${m.item} ${m.value} ${m.unit || '（单位未注明）'}。${comparison}${evidence}`, source };
  }
  const range = '纸上练习的示例范围为 19.90 至 20.10 mm。';
  const result = measurementResult(sample, '19.90', '20.10');
  const reading = result ? `你填入的 ${sample} mm ${measurementText(result)}。` : '请先在练习框中填入有效的毫米读数，再来核对。';
  return { reply: range + reading + evidence, source: '实操考核 · 阶梯轴纸上测量自查' };
}

export function stageReply(text, context, record) {
  if (context.view === 'pre') {
    const saving = /草稿|一半|保存|关闭|下次|提交/.test(text);
    return { reply: saving
      ? '可以点击空白处或关闭按钮稍后继续。在同一浏览器用同一账号回到当前工种，重新打开问卷可以接着填写。点击正式保存并看到提交成功后，该工种会展示只读结果。'
      : '请按真实经历、学习目标和自己的判断填写。课程会据此建议一个起点，之后还会参考实际练习。素养题请独立作答，正式提交后再查看自己的结果。', source: '课前测评 · 填写说明' };
  }
  if (!['practical','feedback'].includes(context.view)) return null;
  const latest = record.submissions?.at(-1);
  if (/补交|退回|老师.*(说|建议|评语|让我)|教师.*评语/.test(text)) {
    if (latest?.review?.comment) {
      const target = latest.review.field && reviewFields[latest.review.field];
      return { reply: `最近一次提交的状态为「${latest.status}」。教师原话：“${latest.review.comment}”${latest.status === '需补交材料' ? `请回到实操任务单${target ? '的“' + target + '”栏' : ''}补充，再交给教师复核。` : ''}`, source: '本人最近一次实操提交 · 教师评语' };
    }
    return { reply: latest ? '最近一次提交正在等待教师评价。此前的评语可在实操任务单的历次提交中查看。' : '目前还没有实操提交。教师评阅你提交的材料后，这里可以解释补交要求。' };
  }
  if (context.view === 'practical' && /纸上|读数|测量|偏差|超差|超限|刀具|超上限|复测|照片|\d+\.\d+/.test(text)) {
    return practicalReading(text, record, latest);
  }
  if (context.view === 'feedback' && /推荐|为什么.*建议|选学|该学什么|下一步/.test(text)) {
    const items = (context.suggestions || []).filter(item => item.title && item.reason);
    if (!items.length) return { reply: '当前没有可解释的选学建议。可以自由选学，或在课程反馈里写下希望加强的内容。' };
    const reasons = items.map(({title, reason}) => `「${title}」：${reason}`).join('\n');
    return { reply: `${reasons}\n可以先看符合你需要的那一项，也可以在选学页说明自己最想练什么。`, source: '本人当前选学页 · 学习建议' };
  }
  return null;
}
