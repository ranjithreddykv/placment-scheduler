export default function Card({ title, action, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {typeof title === 'string' ? <h2 className="text-sm font-semibold text-slate-800">{title}</h2> : title}
          {action}
        </div>
      )}
      <div className={bodyClassName || 'p-4'}>{children}</div>
    </div>
  );
}
