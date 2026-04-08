import { Link } from 'react-router-dom';
import { formatExpiry, expiryColorClass, getStatusBadgeClass, truncate, getInitials } from '../../utils/helpers';

export default function DonationCard({ donation, actions, compact = false }) {
  const { _id, title, type, description, quantity, status, expiryTime, donorId, images } = donation;

  const typeColor = type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
  const typeIcon = type === 'food' ? '🍱' : '👗';

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      {/* Image */}
      {images?.[0] && !compact && (
        <div className="relative -mx-5 -mt-5 mb-4 h-40 overflow-hidden rounded-t-2xl">
          <img src={images[0].url} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className={`absolute top-3 left-3 badge ${typeColor}`}>
            {typeIcon} {type}
          </span>
          <span className={`absolute top-3 right-3 badge ${getStatusBadgeClass(status)}`}>
            {status}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-2">
        {/* Type + Status (no image) */}
        {(!images?.[0] || compact) && (
          <div className="flex items-center justify-between">
            <span className={`badge ${typeColor}`}>{typeIcon} {type}</span>
            <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
          </div>
        )}

        <Link to={`/donations/${_id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-green-700 transition-colors text-base leading-snug">
            {title}
          </h3>
        </Link>

        {!compact && (
          <p className="text-gray-500 text-sm leading-relaxed">{truncate(description, 120)}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {quantity?.amount} {quantity?.unit}
          </span>
          {type === 'food' ? (
            <span className={`flex items-center gap-1 ${expiryColorClass(expiryTime)}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatExpiry(expiryTime)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              No expiry
            </span>
          )}
        </div>

        {/* Donor info */}
        {donorId && !compact && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-1">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
              {donorId.avatar ? (
                <img src={donorId.avatar} alt={donorId.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                getInitials(donorId.name)
              )}
            </div>
            <span className="text-xs text-gray-500">{donorId.name}</span>
          </div>
        )}

        {/* Actions */}
        {actions && <div className="flex items-center gap-2 mt-2">{actions}</div>}
      </div>
    </div>
  );
}
