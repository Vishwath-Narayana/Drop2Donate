import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI, authAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSocket } from '../../context/SocketContext';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function DeliveryDashboard() {
  const { user, updateUser } = useAuth();
  const { location, watchPosition, clearWatch } = useGeolocation();
  const { emitLocationUpdate, on } = useSocket();

  const [nearbyDeliveries, setNearbyDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? true);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const myRes = await deliveryAPI.getMy({ limit: 5 });
        setMyDeliveries(myRes.deliveries || []);
        const active = myRes.deliveries?.find((d) => ['accepted', 'picked', 'in_transit'].includes(d.status));
        setActiveDelivery(active || null);
      } catch (err) {
        toast.error('Failed to load deliveries');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!location) return;
    const fetchNearby = async () => {
      try {
        const data = await deliveryAPI.getNearby({
          lng: location.lng,
          lat: location.lat,
          radius: 15000,
        });
        setNearbyDeliveries(data.deliveries || []);
      } catch {}
    };
    fetchNearby();
  }, [location]);

  // Start live location tracking when there's an active delivery
  useEffect(() => {
    if (!activeDelivery) return;
    watchIdRef.current = watchPosition((pos) => {
      emitLocationUpdate(activeDelivery._id, [pos.lng, pos.lat]);
    });
    return () => clearWatch(watchIdRef.current);
  }, [activeDelivery, watchPosition, clearWatch, emitLocationUpdate]);

  // Listen for new delivery requests
  useEffect(() => {
    const cleanup = on('new_delivery_request', ({ delivery }) => {
      setNearbyDeliveries((prev) => {
        const exists = prev.find((d) => d._id === delivery._id);
        if (!exists) return [delivery, ...prev];
        return prev;
      });
      toast('New delivery available nearby', { icon: '🚴' });
    });
    return cleanup;
  }, [on]);

  const handleAccept = async (deliveryId) => {
    setAccepting(deliveryId);
    try {
      const data = await deliveryAPI.accept(deliveryId);
      setActiveDelivery(data.delivery);
      setNearbyDeliveries((prev) => prev.filter((d) => d._id !== deliveryId));
      setMyDeliveries((prev) => [data.delivery, ...prev]);
      toast.success('Delivery accepted!');
    } catch (err) {
      toast.error(err.message || 'Failed to accept delivery');
    } finally {
      setAccepting(null);
    }
  };

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    try {
      const data = await deliveryAPI.updateStatus(deliveryId, {
        status: newStatus,
        agentLocation: location ? [location.lng, location.lat] : undefined,
      });
      setActiveDelivery(data.delivery);
      setMyDeliveries((prev) =>
        prev.map((d) => (d._id === deliveryId ? { ...d, status: newStatus } : d))
      );
      if (newStatus === 'delivered') {
        setActiveDelivery(null);
        toast.success('Delivery completed!');
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleAvailability = async () => {
    try {
      await authAPI.updateProfile({ isAvailable: !isAvailable });
      setIsAvailable(!isAvailable);
      updateUser({ isAvailable: !isAvailable });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const stats = {
    total: myDeliveries.length,
    active: myDeliveries.filter((d) => ['accepted', 'picked', 'in_transit'].includes(d.status)).length,
    completed: myDeliveries.filter((d) => d.status === 'delivered').length,
  };

  const nextStatus = { accepted: 'picked', picked: 'in_transit', in_transit: 'delivered' };
  const nextStatusLabel = {
    accepted: 'Mark as Picked',
    picked: 'Mark In Transit',
    in_transit: 'Mark Delivered',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user.name}</p>
        </div>
        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isAvailable
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
          {isAvailable ? 'Available' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={stats.total} icon="📦" color="blue" />
        <StatCard label="Active" value={stats.active} icon="🚴" color="orange" />
        <StatCard label="Completed" value={stats.completed} icon="✅" color="green" />
      </div>

      {/* Active Delivery */}
      {activeDelivery && (
        <div className="bg-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🚴</span>
            <h2 className="font-bold text-lg">Active Delivery</h2>
            <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-semibold capitalize">
              {activeDelivery.status}
            </span>
          </div>
          <p className="font-semibold">{activeDelivery.donationId?.title}</p>
          <div className="flex items-center gap-4 mt-3 text-blue-100 text-sm">
            <span>From: {activeDelivery.donorId?.name}</span>
            <span>→</span>
            <span>To: {activeDelivery.ngoId?.name}</span>
          </div>
          <div className="flex gap-3 mt-4">
            <Link to={`/delivery/${activeDelivery._id}`} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-center py-2.5 rounded-xl text-sm font-medium transition-colors">
              View Details
            </Link>
            {nextStatus[activeDelivery.status] && (
              <button
                onClick={() => handleStatusUpdate(activeDelivery._id, nextStatus[activeDelivery.status])}
                className="flex-1 bg-white text-blue-600 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors"
              >
                {nextStatusLabel[activeDelivery.status]}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nearby Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Nearby</h2>
          <Link to="/delivery/available" className="text-sm text-green-600 hover:underline font-medium">View all</Link>
        </div>

        {nearbyDeliveries.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-gray-900">No deliveries available nearby</p>
            <p className="text-gray-500 text-sm mt-1">Check back soon or expand your search radius</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyDeliveries.map((delivery) => (
              <div key={delivery._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{delivery.donationId?.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>📦 {delivery.donationId?.quantity?.amount} {delivery.donationId?.quantity?.unit}</span>
                      <span>From: {delivery.donorId?.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(delivery.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleAccept(delivery._id)}
                    disabled={accepting === delivery._id || !!activeDelivery}
                    className="btn-delivery text-xs py-2 px-4 flex-shrink-0 flex items-center gap-1"
                  >
                    {accepting === delivery._id ? <LoadingSpinner size="sm" color="white" /> : '✓'}
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Deliveries */}
      {myDeliveries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Delivery History</h2>
            <Link to="/delivery/my" className="text-sm text-green-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {myDeliveries.slice(0, 5).map((d) => (
              <div key={d._id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{d.donationId?.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(d.createdAt)}</p>
                </div>
                <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
