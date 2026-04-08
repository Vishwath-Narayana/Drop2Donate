import { useState, useEffect, useRef } from 'react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../hooks/useRealtime';
import { formatTimeAgo } from '../../utils/helpers';

const typeIcon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const typeBg   = {
  success: 'bg-green-50 border-green-100',
  error:   'bg-red-50 border-red-100',
  warning: 'bg-yellow-50 border-yellow-100',
  info:    'bg-blue-50 border-blue-100',
};

export default function NotificationDropdown() {
  const { user, updateUser } = useAuth();
  const [open, setOpen]   = useState(false);
  const [notifs, setNotifs] = useState(user?.notifications?.slice().reverse() || []);
  const ref = useRef(null);

  const unread = notifs.filter((n) => !n.read).length;

  // Push new socket notifications into the list
  const pushNotif = (data) => {
    const n = {
      _id: Date.now(),
      message: data.message || '',
      type: data.type || 'info',
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifs((prev) => [n, ...prev]);
    updateUser({ notifications: [n, ...(user?.notifications || [])] });
  };

  useRealtime({
    claim_requested:    (d) => pushNotif({ message: d.message, type: 'info' }),
    claim_response:     (d) => pushNotif({ message: d.message, type: d.action === 'approve' ? 'success' : 'warning' }),
    claim_cancelled:    (d) => pushNotif({ message: d.message, type: 'warning' }),
    delivery_accepted:  (d) => pushNotif({ message: d.message, type: 'info' }),
    delivery_status_update: (d) => pushNotif({ message: d.message, type: 'info' }),
    donation_completed: (d) => pushNotif({ message: d.message, type: 'success' }),
    new_donation:       (d) => pushNotif({ message: d.message, type: 'info' }),
    donation_expired:   (d) => pushNotif({ message: `Donation "${d.title}" has expired`, type: 'warning' }),
    account_verified:   (d) => pushNotif({ message: d.message, type: d.verified ? 'success' : 'error' }),
    new_delivery_request: (d) => pushNotif({ message: d.message, type: 'info' }),
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async () => {
    try {
      await authAPI.markNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markRead(); }}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markRead} className="text-xs text-green-600 hover:underline font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-hide">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔔</div>
                No notifications yet
              </div>
            ) : (
              notifs.slice(0, 30).map((n, i) => (
                <div
                  key={n._id || i}
                  className={`px-4 py-3 border-b border-gray-50 flex gap-3 ${!n.read ? typeBg[n.type] || typeBg.info : 'hover:bg-gray-50'}`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
