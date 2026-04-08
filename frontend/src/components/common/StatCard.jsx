export default function StatCard({ label, value, icon, color = 'green', trend }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
        {trend && (
          <p className={`text-xs mt-0.5 font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last week
          </p>
        )}
      </div>
    </div>
  );
}
