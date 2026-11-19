export function Heading({ title, children }) {
  return <div className="page-heading"><div><h1>{title}</h1>{children && <p className="muted">{children}</p>}</div></div>;
}
