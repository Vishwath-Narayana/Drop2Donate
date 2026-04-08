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
    } catch (err) {
      console.error('[Delivery Load Error]:', err);
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  useEffect(() => {
    if (!activeDelivery) { clearWatch(watchIdRef.current); return; }
    watchIdRef.current = watchPosition((pos) => {
      emitLocationUpdate(activeDelivery._id, [pos.lng, pos.lat]);
    });
    return () => clearWatch(watchIdRef.current);
  }, [activeDelivery?._id, watchPosition, clearWatch, emitLocationUpdate]);

  useRealtime({
    new_delivery_request: ({ delivery }) => {
      setNearbyDeliveries((prev) => {
        if (prev.find((d) => d._id === delivery._id)) return prev;
        return [delivery, ...prev];
      });
      toast('Active route request detected', { icon: '🚴' });
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
    delivery_accepted: ({ delivery }) => {
      setNearbyDeliveries((prev) => prev.filter((d) => d._id !== delivery._id));
    },
  });

  const handleAccept = async (deliveryId) => {
    setAccepting(deliveryId);
    try {
      const data = await deliveryAPI.accept(deliveryId);
      const d = data.delivery;
      setActiveDelivery(d);
      setNearbyDeliveries((prev) => prev.filter((x) => x._id !== deliveryId));
      setMyDeliveries((prev) => [d, ...prev.filter((x) => x._id !== deliveryId)]);
      setTab('active');
      toast.success('Route synchronization started');
    } catch (err) {
      toast.error(err.message || 'Route allocation failed');
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
        toast.success('Protocol completed. Excellent efficiency.');
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
      toast.success(next ? 'Live in the grid' : 'Offline. Rest protocols initiated.');
    } catch (err) {
      setIsAvailable(!next);
      toast.error(err.message);
    }
  };

  const stats = {
    total:     myDeliveries.length,
    active:    myDeliveries.filter((d) => ['accepted', 'picked', 'in_transit'].includes(d.status)).length,
    completed: myDeliveries.filter((d) => d.status === 'delivered').length,
    rating:    user?.rating?.average ? user.rating.average.toFixed(1) : '—',
  };

  const nextStatus      = { accepted: 'picked', picked: 'in_transit', in_transit: 'delivered' };
  const nextStatusLabel = { accepted: 'Box Picked', picked: 'In Transit', in_transit: 'Success' };
  const historyDeliveries = myDeliveries.filter((d) => !['accepted', 'picked', 'in_transit'].includes(d.status));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Logistics Hub</h1>
          <p className="text-slate-400 font-medium text-sm">Agent ID: <span className="text-slate-900 uppercase font-black tracking-widest">{user._id.slice(-6)}</span></p>
        </div>
        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 border-2 ${
            isAvailable
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-300'}`} />
          {isAvailable ? 'Status: Active' : 'Status: Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Routes" value={stats.total}     icon="🛣️" color="slate"   />
        <StatCard label="Live Orders"  value={stats.active}    icon="🚴" color="indigo" />
        <StatCard label="Successful"   value={stats.completed} icon="✅" color="emerald"  />
        <StatCard label="Grid Rating"  value={stats.rating}    icon="⭐" color="amber" />
      </div>

      {/* Active Pulse Banner */}
      {activeDelivery && (
        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 text-9xl opacity-10 group-hover:translate-x-12 transition-transform duration-700">🚚</div>
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Live Logistics Protocol</h2>
              </div>
              <h3 className="text-4xl font-black tracking-tight uppercase leading-none">{activeDelivery.donationId?.title}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/10 italic font-black">P</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pickup Point</p>
                    <p className="font-bold text-slate-200">{activeDelivery.donorId?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/10 italic font-black text-emerald-500">D</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-emerald-900">Destination</p>
                    <p className="font-bold text-slate-200">{activeDelivery.ngoId?.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Link to={`/delivery/${activeDelivery._id}`} className="flex-1 btn-primary !bg-white !text-slate-900 !rounded-2xl !py-4 text-xs font-black tracking-widest uppercase">
                  Open Grid Map
                </Link>
                {nextStatus[activeDelivery.status] && (
                  <button onClick={() => handleStatusUpdate(nextStatus[activeDelivery.status])} disabled={updatingStatus} className="flex-1 btn-primary !bg-emerald-500 !text-white !rounded-2xl !py-4 text-xs font-black tracking-widest uppercase border-none">
                    {updatingStatus ? <LoadingSpinner size="sm" color="white" /> : nextStatusLabel[activeDelivery.status]}
                  </button>
                )}
              </div>
            </div>
            
            <div className="relative hidden lg:block">
               <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 space-y-6">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Lifecycle Tracking</p>
                 <div className="space-y-4">
                   {['accepted', 'picked', 'in_transit', 'delivered'].map((s, i) => {
                     const statuses = ['accepted', 'picked', 'in_transit', 'delivered'];
                     const curIdx = statuses.indexOf(activeDelivery.status);
                     const active = i === curIdx;
                     const done = i < curIdx;
                     return (
                       <div key={s} className="flex items-center gap-4">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                           active ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/50' : done ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-600'
                         }`}>
                           {i + 1}
                         </div>
                         <div className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-500'}`}>
                           {s.replace('_', ' ')}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50">
        {[
          { key: 'nearby',  label: 'Grid View',  count: nearbyDeliveries.length },
          { key: 'active',  label: 'Active Pulse',  count: stats.active, alert: stats.active > 0 },
          { key: 'history', label: 'Completed', count: historyDeliveries.length },
        ].map(({ key, label, count, alert }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {label}
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${alert ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      <div className="space-y-6">
        {tab === 'nearby' && (
          <div className="animate-fade-in">
            {!location && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] text-center mb-6">
                📍 Location synchronization required for proximity scanning
              </div>
            )}
            {nearbyDeliveries.length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50 border-dashed border-2">
                <div className="text-6xl mb-4 grayscale opacity-20">📭</div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Zone Inactive</h3>
                <p className="text-slate-400 text-sm mt-1">Scanning the grid for new dispatch requests...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {nearbyDeliveries.map((delivery) => (
                  <div key={delivery._id} className="card card-hover flex flex-col md:flex-row md:items-center justify-between gap-6 py-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                         <span className="text-2xl animate-bounce">📦</span>
                         <div>
                           <h4 className="font-black text-slate-900 uppercase tracking-tight text-xl">{delivery.donationId?.title}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posted {formatTimeAgo(delivery.createdAt)}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6 pl-10">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From</p>
                          <p className="text-xs font-bold text-slate-700">{delivery.donorId?.name}</p>
                        </div>
                        <div className="text-slate-200">/</div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To</p>
                          <p className="text-xs font-bold text-slate-700">{delivery.ngoId?.name}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAccept(delivery._id)}
                      disabled={accepting === delivery._id || !!activeDelivery || !isAvailable}
                      className="btn-primary !rounded-2xl !py-4 px-10 text-[10px] font-black tracking-[0.2em] uppercase disabled:opacity-20 translate-y-0 hover:-translate-y-1 transition-all"
                    >
                      {accepting === delivery._id ? <LoadingSpinner size="sm" color="white" /> : 'Lock Protocol'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="grid gap-4 animate-fade-in">
             {historyDeliveries.length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50">
                <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Archive empty.</p>
              </div>
            ) : (
              historyDeliveries.map((d) => (
                <Link key={d._id} to={`/delivery/${d._id}`} className="card flex items-center justify-between py-6 group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors group-hover:text-white text-emerald-600">
                         <span className="text-lg">✓</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-tight">{d.donationId?.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.ngoId?.name} · {formatDate(d.updatedAt)}</p>
                      </div>
                   </div>
                   <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
