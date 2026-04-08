import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI, authAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSocket } from '../../context/SocketContext';
import { useRealtime } from '../../hooks/useRealtime';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function DeliveryDashboard() {
  const { user, updateUser } = useAuth();
  const { location, watchPosition, clearWatch } = useGeolocation();
  const { emitLocationUpdate } = useSocket();

  const [nearbyDeliveries, setNearbyDeliveries] = useState([]);
  const [myDeliveries,     setMyDeliveries]     = useState([]);
  const [activeDelivery,   setActiveDelivery]   = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [accepting,        setAccepting]        = useState(null);
  const [updatingStatus,   setUpdatingStatus]   = useState(false);
  const [isAvailable,      setIsAvailable]      = useState(user?.isAvailable ?? true);
  const [tab,              setTab]              = useState('nearby');
  const watchIdRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const myRes = await deliveryAPI.getMy({ limit: 20 });
      const deliveries = myRes.deliveries || [];
      setMyDeliveries(deliveries);
      const active = deliveries.find((d) => ['accepted', 'picked', 'in_transit'].includes(d.status));
      setActiveDelivery(active || null);
      if (active) setTab('active');
    } catch {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetch nearby deliveries once we have location
  useEffect(() => {
    if (!location) return;
    const fetchNearby = async () => {
      try {
        const data = await deliveryAPI.getNearby({ lng: location.lng, lat: location.lat, radius: 15000 });
        setNearbyDeliveries(data.deliveries || []);
      } catch {}
    };
    fetchNearby();
  }, [location]);

  // Live GPS tracking when there's an active delivery
  useEffect(() => {
    if (!activeDelivery) { clearWatch(watchIdRef.current); return; }
    watchIdRef.current = watchPosition((pos) => {
      emitLocationUpdate(activeDelivery._id, [pos.lng, pos.lat]);
    });
    return () => clearWatch(watchIdRef.current);
  }, [activeDelivery?._id]);

  // ── Real-time events ───────────────────────────────────────────────────────
  useRealtime({
    new_delivery_request: ({ delivery }) => {
      setNearbyDeliveries((prev) => {
        if (prev.find((d) => d._id === delivery._id)) return prev;
        return [delivery, ...prev];
      });
      toast('New delivery available nearby', { icon: '🚴' });
    },
    delivery_status_update: ({ deliveryId, status, message }) => {
      setMyDeliveries((prev) => prev.map((d) => d._id === deliveryId ? { ...d, status } : d));
      setActiveDelivery((prev) => {
        if (!prev || prev._id !== deliveryId) return prev;
        if (status === 'delivered') return null;
        return { ...prev, status };
      });
      if (message) toast(message, { icon: '🚴' });
    },
    // Another agent accepted a delivery - remove from our nearby list
    delivery_accepted: ({ delivery }) => {
      setNearbyDeliveries((prev) => prev.filter((d) => d._id !== delivery._id));
    },
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAccept = async (deliveryId) => {
    setAccepting(deliveryId);
    try {
      const data = await deliveryAPI.accept(deliveryId);
      const d = data.delivery;
      setActiveDelivery(d);
      setNearbyDeliveries((prev) => prev.filter((x) => x._id !== deliveryId));
      setMyDeliveries((prev) => [d, ...prev.filter((x) => x._id !== deliveryId)]);
      setTab('active');
      toast.success('Delivery accepted! Live tracking started.');
    } catch (err) {
      toast.error(err.message || 'Failed to accept delivery');
    } finally {
      setAccepting(null);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!activeDelivery) return;
    setUpdatingStatus(true);
    try {
      const data = await deliveryAPI.updateStatus(activeDelivery._id, {
        status: newStatus,
        agentLocation: location ? [location.lng, location.lat] : undefined,
      });
      const updated = data.delivery;
      if (newStatus === 'delivered') {
        setActiveDelivery(null);
        setTab('history');
        toast.success('Delivery completed! Great work.');
      } else {
        setActiveDelivery(updated);
      }
      setMyDeliveries((prev) => prev.map((d) => d._id === updated._id ? updated : d));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await authAPI.updateProfile({ isAvailable: next });
      updateUser({ isAvailable: next });
      toast.success(next ? 'You are now available for deliveries' : 'You are now offline');
    } catch (err) {
      setIsAvailable(!next);
      toast.error(err.message);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const stats = {
    total:     myDeliveries.length,
    active:    myDeliveries.filter((d) => ['accepted', 'picked', 'in_transit'].includes(d.status)).length,
    completed: myDeliveries.filter((d) => d.status === 'delivered').length,
    rating:    user?.rating?.average ? user.rating.average.toFixed(1) : '—',
  };

  const nextStatus      = { accepted: 'picked', picked: 'in_transit', in_transit: 'delivered' };
  const nextStatusLabel = { accepted: '📦 Mark Picked Up', picked: '🚴 Mark In Transit', in_transit: '🎉 Mark Delivered' };
  const historyDeliveries = myDeliveries.filter((d) => !['accepted', 'picked', 'in_transit'].includes(d.status));

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user.name}</p>
        </div>
        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isAvailable
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isAvailable ? 'Available' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total"     value={stats.total}     icon="📦" color="blue"   />
        <StatCard label="Active"    value={stats.active}    icon="🚴" color="orange" />
        <StatCard label="Completed" value={stats.completed} icon="✅" color="green"  />
        <StatCard label="Rating"    value={stats.rating}    icon="⭐" color="purple" />
      </div>

      {/* Active delivery banner */}
      {activeDelivery && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <h2 className="font-bold text-lg">Active Delivery</h2>
            <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-semibold capitalize">
              {activeDelivery.status.replace('_', ' ')}
            </span>
          </div>
          <p className="font-semibold text-lg">{activeDelivery.donationId?.title}</p>
          <div className="flex items-center gap-2 mt-2 text-blue-100 text-sm">
            <span>From {activeDelivery.donorId?.name}</span>
            <span>→</span>
            <span>To {activeDelivery.ngoId?.name}</span>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mt-4 bg-white/10 rounded-xl p-3">
            {['accepted', 'picked', 'in_transit', 'delivered'].map((s, i, arr) => {
              const statuses = ['accepted', 'picked', 'in_transit', 'delivered'];
              const curIdx = statuses.indexOf(activeDelivery.status);
              const done = i <= curIdx;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`flex-1 text-center text-xs font-medium ${done ? 'text-white' : 'text-blue-300'}`}>
                    {s === 'accepted' ? 'Assigned' : s === 'in_transit' ? 'Transit' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`h-px flex-1 ${done && i < curIdx ? 'bg-white' : 'bg-white/30'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-4">
            <Link
              to={`/delivery/${activeDelivery._id}`}
              className="flex-1 bg-white/15 hover:bg-white/25 text-white text-center py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              View Map
            </Link>
            {nextStatus[activeDelivery.status] && (
              <button
                onClick={() => handleStatusUpdate(nextStatus[activeDelivery.status])}
                disabled={updatingStatus}
                className="flex-1 bg-white text-blue-600 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                {updatingStatus ? <LoadingSpinner size="sm" color="blue" /> : nextStatusLabel[activeDelivery.status]}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {[
          { key: 'nearby',  label: 'Nearby',  count: nearbyDeliveries.length },
          { key: 'active',  label: 'Active',  count: stats.active, alert: stats.active > 0 },
          { key: 'history', label: 'History', count: historyDeliveries.length },
        ].map(({ key, label, count, alert }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              alert ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Nearby tab ──────────────────────────────────────────────────────── */}
      {tab === 'nearby' && (
        <div>
          {!location && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-4">
              <span className="text-amber-600 text-xl">📍</span>
              <p className="text-amber-800 text-sm font-medium">Enable location to see nearby deliveries</p>
            </div>
          )}
          {nearbyDeliveries.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">No deliveries nearby</h3>
              <p className="text-gray-500 text-sm">Check back soon — new requests will appear here in real time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyDeliveries.map((delivery) => (
                <div key={delivery._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{delivery.donationId?.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>📦 {delivery.donationId?.quantity?.amount} {delivery.donationId?.quantity?.unit}</span>
                        <span>From: {delivery.donorId?.name}</span>
                        <span>To: {delivery.ngoId?.name}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(delivery.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleAccept(delivery._id)}
                      disabled={accepting === delivery._id || !!activeDelivery || !isAvailable}
                      className="btn-delivery text-xs py-2 px-4 flex-shrink-0 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {accepting === delivery._id ? <LoadingSpinner size="sm" color="white" /> : '✓'}
                      Accept
                    </button>
                  </div>
                  {!isAvailable && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">Set yourself to Available to accept deliveries</p>
                  )}
                  {activeDelivery && isAvailable && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">Complete your active delivery first</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active tab ──────────────────────────────────────────────────────── */}
      {tab === 'active' && (
        <div>
          {!activeDelivery ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">No active deliveries</h3>
              <p className="text-gray-500 text-sm mb-4">Head to Nearby tab to accept a delivery</p>
              <button onClick={() => setTab('nearby')} className="btn-delivery text-sm py-2 px-5">
                Browse Nearby
              </button>
            </div>
          ) : (
            <div className="card space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{activeDelivery.donationId?.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Accepted {formatTimeAgo(activeDelivery.updatedAt)}</p>
                </div>
                <span className={`badge ${getStatusBadgeClass(activeDelivery.status)}`}>
                  {activeDelivery.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-orange-600 font-semibold mb-0.5">PICKUP FROM</p>
                  <p className="font-medium text-gray-900 text-sm">{activeDelivery.donorId?.name}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-600 font-semibold mb-0.5">DELIVER TO</p>
                  <p className="font-medium text-gray-900 text-sm">{activeDelivery.ngoId?.name}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Link to={`/delivery/${activeDelivery._id}`}
                  className="flex-1 btn-secondary text-sm py-2.5 text-center">
                  View Map & Details
                </Link>
                {nextStatus[activeDelivery.status] && (
                  <button
                    onClick={() => handleStatusUpdate(nextStatus[activeDelivery.status])}
                    disabled={updatingStatus}
                    className="flex-1 btn-delivery text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    {updatingStatus ? <LoadingSpinner size="sm" color="white" /> : nextStatusLabel[activeDelivery.status]}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History tab ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {historyDeliveries.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-3">📋</div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">No history yet</h3>
              <p className="text-gray-500 text-sm">Completed deliveries will appear here</p>
            </div>
          ) : (
            historyDeliveries.map((d) => (
              <Link key={d._id} to={`/delivery/${d._id}`}
                className="card flex items-center gap-4 hover:shadow-md transition-shadow block">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{d.donationId?.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {d.ngoId?.name} · {formatDate(d.updatedAt)}
                  </p>
                </div>
                <span className={`badge ${getStatusBadgeClass(d.status)} flex-shrink-0`}>{d.status}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
