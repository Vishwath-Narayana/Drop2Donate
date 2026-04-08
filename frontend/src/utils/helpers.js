import { formatDistanceToNow, format, isAfter, differenceInMinutes, differenceInHours } from 'date-fns';

export const formatTimeAgo = (date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
};

export const formatDate = (date, pattern = 'MMM d, yyyy h:mm a') => {
  try {
    return format(new Date(date), pattern);
  } catch {
    return 'Invalid date';
  }
};

export const isExpired = (expiryTime) => {
  return !isAfter(new Date(expiryTime), new Date());
};

export const getExpiryUrgency = (expiryTime) => {
  if (!expiryTime) return 'none'; // clothes or no expiry set
  const now = new Date();
  const expiry = new Date(expiryTime);
  if (!isAfter(expiry, now)) return 'expired';
  const minutesLeft = differenceInMinutes(expiry, now);
  const hoursLeft = differenceInHours(expiry, now);
  if (minutesLeft < 60) return 'critical'; // < 1 hour
  if (hoursLeft < 4) return 'urgent';      // < 4 hours
  if (hoursLeft < 12) return 'warning';    // < 12 hours
  return 'safe';
};

export const expiryColorClass = (expiryTime) => {
  const urgency = getExpiryUrgency(expiryTime);
  const map = {
    none:     'text-gray-400',
    expired:  'text-red-500',
    critical: 'text-red-600 font-semibold',
    urgent:   'text-orange-500 font-medium',
    warning:  'text-yellow-600',
    safe:     'text-green-600',
  };
  return map[urgency] || 'text-gray-500';
};

export const formatExpiry = (expiryTime) => {
  if (!expiryTime) return 'No expiry';
  const urgency = getExpiryUrgency(expiryTime);
  if (urgency === 'expired') return 'Expired';
  const minutesLeft = differenceInMinutes(new Date(expiryTime), new Date());
  if (minutesLeft < 60) return `Expires in ${minutesLeft}m`;
  const hoursLeft = differenceInHours(new Date(expiryTime), new Date());
  if (hoursLeft < 24) return `Expires in ${hoursLeft}h`;
  return `Expires ${formatDate(expiryTime, 'MMM d, h:mm a')}`;
};

export const getRoleBadgeClass = (role) => {
  const map = {
    donor: 'bg-orange-100 text-orange-700',
    ngo: 'bg-green-100 text-green-700',
    delivery: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
  };
  return map[role] || 'bg-gray-100 text-gray-700';
};

export const getStatusBadgeClass = (status) => {
  const map = {
    available: 'bg-green-100 text-green-700',
    claimed: 'bg-yellow-100 text-yellow-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    requested: 'bg-purple-100 text-purple-700',
    accepted: 'bg-blue-100 text-blue-700',
    picked: 'bg-indigo-100 text-indigo-700',
    in_transit: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const truncate = (str, len = 100) =>
  str && str.length > len ? str.slice(0, len) + '...' : str;

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export const getInitials = (name) =>
  name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';
