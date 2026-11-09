export function Heading({ kicker, title, children }) {
  return <div className="page-heading"><div><div className="eyebrow">{kicker}</div><h1>{title}</h1>{children && <p className="muted">{children}</p>}</div></div>;
}

export function DemoNote({ children }) {
  return <div className="info-banner">{children || '教学流程示例 · 课程资料、题库与规则待教师审核配置。当前记录仅保存在此浏览器。'}</div>;
}
