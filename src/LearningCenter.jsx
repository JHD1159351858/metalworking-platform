import { ArrowRight } from '@phosphor-icons/react';
import { cncChapters, unitLabel } from './cnc-course.js';
import { getCoursePath, lessonsForTrade } from './learning-data.js';
import { getStudyPlan } from './study-plan.js';
import { theoryProgress } from './course-recommendations.js';
import { Heading } from './LearningUI.jsx';
import './learning-center.css';

export function LearningCenter({ record, profile, trade, onNavigate }) {
  const assessment = record.preAssessment;
  const draft = record.preAssessmentDraft;
  const hasDraft = draft && (Object.keys(draft.answers || {}).length || draft.experience || draft.confidence || draft.focus || draft.note?.trim());
  const plan = getStudyPlan(assessment);
  const welding = trade.id === 'welding';
  const lessons = lessonsForTrade(trade);
  const chapters = welding ? lessons : cncChapters;
  const theory = theoryProgress(record, lessons, chapters);
  const latestExam = record.attempts.at(-1);
  const cases = record.casePractice?.length || 0;
  const notes = lessons.filter(lesson => record.videoNotes?.[lesson.id]?.trim()).length;
  const startedTheory = theory.videosCompleted || theory.watchedSeconds || theory.chaptersRead || notes || cases || record.practice.length;
  const latestSubmission = record.submissions.at(-1);
  const hasPracticalDraft = record.caseDraft?.plan?.trim() || Object.values(record.practicalDraft || {}).some(value => String(value).trim());
  const chosenChapter = chapters.find(chapter => chapter.id === record.studyPreference?.chapterId);
  const latestFeedback = record.feedback.at(-1);
  const time = theory.watchedSeconds < 60 ? theory.watchedSeconds + ' 秒' : Math.floor(theory.watchedSeconds / 60) + ' 分 ' + theory.watchedSeconds % 60 + ' 秒';
  const stages = getCoursePath(record, trade);
  const modules = {
    pre: {
      status: assessment ? '已提交' : hasDraft ? '草稿待提交' : '待填写',
      facts: [
        ['素养测评', Number.isFinite(assessment?.score) ? assessment.score + ' 分' : assessment ? '已提交' : '待提交'],
        ['希望加强', assessment?.focus || draft?.focus || '尚未选择'],
      ],
      action: assessment ? '查看测评结果' : hasDraft ? '继续填写' : '填写课前测评',
    },
    video: {
      status: stages.find(step => step.id === 'video').complete ? '综合测评已达标' : latestExam ? '待巩固' : startedTheory ? '学习中' : '未开始',
      facts: [
        ['视频学习', `${theory.videosCompleted} / ${lessons.length} 节看完 · 已看 ${time}`],
        ['章节阅读', `${theory.chaptersRead} / ${chapters.length} 单元已读`],
        ...(notes ? [['随堂笔记', `已在 ${notes} 节视频中记笔记`]] : []),
        ['练习记录', welding ? `练习 ${record.practice.length} 次` : `案例 ${cases} 次 · 刷题 ${record.practice.length} 次`],
        ['综合测评', latestExam ? `${record.attempts.length} 次${Number.isFinite(latestExam.score) ? ' · 最近 ' + latestExam.score + ' 分' : ''}` : '尚未参加'],
      ],
      view: plan?.view, target: plan?.target,
    },
    practical: {
      status: latestSubmission?.status || (stages.find(step => step.id === 'practical').locked ? (welding ? '待完成课前测评、微课与理论测评' : '待理论达标') : '可提交材料'),
      facts: [
        ['实操材料', record.submissions.length ? `已提交 ${record.submissions.length} 次` : hasPracticalDraft ? '已保存草稿 · 待提交' : '尚未提交'],
        ['教师评分', Number.isFinite(latestSubmission?.review?.score) ? latestSubmission.review.score + ' 分' : '暂无评分'],
        ...(latestSubmission?.review?.comment ? [['最近评语', latestSubmission.review.comment]] : []),
      ],
    },
    feedback: {
      status: latestFeedback ? '已反馈' : '待反馈',
      facts: [
        ['自主选学', chosenChapter ? (welding ? chosenChapter.title : unitLabel(chosenChapter.id) + ' · ' + chosenChapter.title) : '尚未选择章节'],
        ['课程反馈', latestFeedback ? `${record.feedback.length} 条 · 最近提交「${latestFeedback.type}」` : '尚未提交'],
      ],
    },
  };
  return <>
    <Heading title="学习中心">{profile.name} · {trade.name} · 我的学习情况</Heading>
    <div className="center-modules">
      {stages.map(step => {
        const item = modules[step.id];
        return <section className="panel center-module" key={step.id} aria-labelledby={'center-' + step.id}>
          <header><h2 id={'center-' + step.id}><span>{step.index}</span>{step.title}</h2><span className="pill">{item.status}</span></header>
          <dl>{item.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <button className="button secondary" onClick={() => onNavigate(item.view || step.id, item.target)}>{item.action || step.action}<ArrowRight size={15} aria-hidden="true" /></button>
        </section>;
      })}
    </div>
  </>;
}
