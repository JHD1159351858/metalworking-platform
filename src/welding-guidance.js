import { weldingLessons, weldingRubric } from './welding-course.js';
import { weldingQuestions } from './welding-assessment.js';

const caseSource = '《课前测评的问题与考核案列》';
export function weldingStarters(context) {
  if (context.view === 'pre') return ['课前测评要做什么？', '能下次继续填写吗？'];
  if (context.view === 'practical') return ['实操怎样评分？', '怎样记录焊缝缺陷？'];
  if (context.view === 'feedback') return ['我该先看哪节选学？'];
  return ['这节课要注意什么？', '怎样记录焊缝缺陷？', '实操怎样评分？'];
}

export function weldingGuidance(text, context, record) {
  if (context.view === 'pre') return { reply: /草稿|保存|继续/.test(text)
    ? '关闭问卷可以保留这台设备上的草稿。下次从焊接的课前测评入口继续，提交后可以查看自己的结果。'
    : '先独立回答十道焊接安全单选题，再填写你的经验、信心和想加强的内容。提交后可以回看错题和学习建议。' };
  const lesson = weldingLessons.find(item => item.id === (context.lessonId || context.chapterId));
  const defect = weldingRubric.find(item => text.includes(item.name));
  if (defect) return { reply: defect.description + '。' + defect.deductions + ' 先记录观察到的位置，再请教师结合实物判断。', source: caseSource };
  if (/评分|考核|多久/.test(text)) return { reply: '实操是 15 分钟低碳钢板对接平焊。教师按咬边、气孔、夹渣、未焊透、焊瘤、裂纹六项评阅，每项 10 分，满分 60 分。', source: caseSource };
  if (/焊缝|缺陷|记录/.test(text)) return { reply: '先写清楚观察的部位，例如焊缝表面或边缘。再描述看见的是小孔、沟槽还是凸起，标出需要教师复核的位置。', options: ['气孔怎么识别？', '什么是咬边？'], source: caseSource };
  if (/选学|推荐/.test(text)) {
    const preferred = record.preAssessment?.focus === '焊缝缺陷识别' || record.submissions?.length ? weldingLessons[2] : weldingLessons[1];
    const next = record.videos?.[preferred.id]?.completed ? weldingLessons.find(item => item.elective && !record.videos?.[item.id]?.completed) : preferred;
    return { reply: next ? '可以从《' + next.title + '》开始。' + next.summary : '两段选学视频都已完成，可以回看笔记并在课程反馈里写下仍有疑问的地方。' };
  }
  const safety = weldingQuestions.find(item => text.includes(item.topic) || item.topic.length >= 3 && text.includes(item.topic.slice(-2)));
  if (safety) return { reply: safety.explanation, source: caseSource };
  if (/要点|这节|视频|注意|微课/.test(text)) {
    const current = lesson || weldingLessons[0];
    return { reply: current.summary + ' ' + current.reading[0][1], source: '课程视频 · ' + current.title };
  }
  return { reply: '这份焊接资料还不足以直接回答。可以告诉我你在看哪段视频、哪个部位，或具体是哪一项评分要求。现场操作条件请和指导教师确认。', options: weldingStarters(context) };
}
