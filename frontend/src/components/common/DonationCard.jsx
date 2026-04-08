import { Link } from 'react-router-dom';
import { formatExpiry, expiryColorClass, getStatusBadgeClass, truncate, getInitials } from '../../utils/helpers';

export default function DonationCard({ donation, actions, compact = false }) {
  const { _id, title, type, description, quantity, status, expiryTime, donorId, images } = donation;

  const typeIcon = type === 'food' ? '🍱' : '🧥';
  const isExpired = type === 'food' && new Date(expiryTime) < new Date();

  return (
    <div className="card card-hover group flex flex-col h-full bg-white border border-slate-100/50">
      {/* Visual Header */}
      {images?.[0] && !compact ? (
        <div className="relative -mx-6 -mt-6 mb-5 h-48 overflow-hidden rounded-t-[1.5rem]">
          <img src={images[0].url} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`badge !bg-emerald-600 !text-white !border-none shadow-lg shadow-emerald-900/20`}>
              {typeIcon} {type}
            </span>
          </div>
          <div className="absolute top-4 right-4">
             <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
            <span className="text-sm">{typeIcon}</span> {type}
          </span>
          <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 space-y-3 pb-4">
        <Link to={`/donations/${_id}`}>
          <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight uppercase leading-tight">
            {title}
          </h3>
        </Link>
        
        {!compact && (
          <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        <div className="flex items-center gap-4 pt-2">
           <div className="flex items-center gap-1.5">
             <span className="text-slate-400">📦</span>
             <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
               {quantity?.amount} {quantity?.unit}
             </span>
           </div>
           
           {type === 'food' && (
             <div className={`flex items-center gap-1.5 ${isExpired ? 'text-rose-500' : 'text-amber-600'}`}>
               <span className="text-sm animate-pulse">⏰</span>
               <span className="text-[11px] font-bold uppercase tracking-widest">
                 {formatExpiry(expiryTime)}
               </span>
             </div>
           )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-50 mt-auto flex items-center justify-between">
        {donorId && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[10px] font-black italic">
              {donorId.avatar ? (
                <img src={donorId.avatar} alt={donorId.name} className="w-7 h-7 rounded-xl object-cover" />
              ) : (
                getInitials(donorId.name)
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{donorId.name}</span>
          </div>
        )}
        
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
