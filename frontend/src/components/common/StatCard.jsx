export default function StatCard({ label, value, icon, color = 'emerald', trend }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/50',
    indigo:  'bg-indigo-50 text-indigo-600 border-indigo-100/50',
    slate:   'bg-slate-50 text-slate-600 border-slate-100/50',
    rose:    'bg-rose-50 text-rose-600 border-rose-100/50',
    amber:   'bg-amber-50 text-amber-600 border-amber-100/50',
  };

  return (
    <div className="card card-hover flex items-center gap-4 py-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${colors[color] || colors.emerald}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-tight tracking-tighter mt-1">{value ?? '—'}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-[11px] font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight">vs last week</span>
          </div>
        )}
      </div>
    </div>
  );
}
