export default function Badge({ children, className = '', style }) {
  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className || 'bg-slate-100 text-slate-600 border-slate-200'}`}
    >
      {children}
    </span>
  );
}
