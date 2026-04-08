import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI, claimAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useRealtime } from '../../hooks/useRealtime';
import StatCard from '../../components/common/StatCard';
import DonationCard from '../../components/common/DonationCard';
import StatusTimeline from '../../components/common/StatusTimeline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CLAIM_STEPS = [
  { key: 'pending',            label: 'Sent',      icon: '📋' },
  { key: 'approved',           label: 'Approved',  icon: '✅' },
  { key: 'pickup_pending',     label: 'Self',      icon: '🤝' },
  { key: 'delivery_requested', label: 'Requested', icon: '📡' },
  { key: 'delivery_assigned',  label: 'Assigned',  icon: '🚴' },
  { key: 'picked',             label: 'Picked',    icon: '📦' },
  { key: 'in_transit',         label: 'Transit',   icon: '🛣️' },
  { key: 'completed',          label: 'Success',   icon: '🎉' },
];

export default function NGODashboard() {
  const { user } = useAuth();
  const { location } = useGeolocation();

  const [nearby,   setNearby]   = useState([]);
  const [claims,   setClaims]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('nearby');
  const [claiming, setClaiming] = useState(null);
  const [actingOn, setActingOn] = useState(null);
  const [expandedClaim, setExpandedClaim] = useState(null);

  const loadClaims = useCallback(async () => {
    const data = await claimAPI.getMy({ limit: 20 });
    setClaims(data.claims || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await loadClaims(); }
      catch { toast.error('Connection reset'); }
      finally { setLoading(false); }
    };
    init();
  }, [loadClaims]);

  useEffect(() => {
    if (!location) return;
    donationAPI.getNearby({ lng: location.lng, lat: location.lat, radius: 15000, limit: 12 })
      .then((d) => setNearby(d.donations || []))
      .catch(() => {});
  }, [location]);

  useRealtime({
    new_donation: ({ donation }) => {
      setNearby((prev) => {
        if (prev.find((d) => d._id === donation._id)) return prev;
        return [donation, ...prev];
      });
      toast('Live resource detected nearby', { icon: '🍱' });
    },
    donation_expired: ({ donationId }) => {
      setNearby((prev) => prev.filter((d) => d._id !== donationId));
    },
    donation_cancelled: ({ donationId }) => {
      setNearby((prev) => prev.filter((d) => d._id !== donationId));
    },
    claim_response: ({ claim, action }) => {
      setClaims((prev) => prev.map((c) =>
        c._id === claim._id ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' } : c
      ));
      if (action === 'approve') {
        toast.success(`Claim "${claim.donationId?.title}" approved`);
      }
    },
    delivery_accepted: ({ delivery, message }) => {
      toast.success(message);
      setClaims((prev) => prev.map((c) =>
        c._id === delivery.claimId ? { ...c, status: 'delivery_assigned' } : c
      ));
    },
    delivery_status_update: ({ message, status, deliveryId }) => {
      toast(message, { icon: status === 'delivered' ? '🎉' : '🚴' });
      if (status === 'delivered') {
        setClaims((prev) => prev.map((c) =>
          c.claimDeliveryId === deliveryId ? { ...c, status: 'completed' } : c
        ));
      }
    },
    donation_completed: ({ claim }) => {
      setClaims((prev) => prev.map((c) =>
        c._id === claim._id ? { ...c, status: 'completed' } : c
      ));
    },
  });

  const handleClaim = async (donationId, message = '') => {
    if (!user.verified) {
      toast.error('Identity verification required');
      return;
    }
    setClaiming(donationId);
    try {
      const data = await claimAPI.create({ donationId, message });
      setNearby((prev) => prev.map((d) => d._id === donationId ? { ...d, _claimed: true } : d));
      setClaims((prev) => [data.claim, ...prev]);
      toast.success('Interest registered with donor');
      setTab('claims');
    } catch (err) {
      toast.error(err.message || 'Transmission failed');
    } finally {
      setClaiming(null);
    }
  };

  const handlePickupMethod = async (claimId, method) => {
    setActingOn(claimId + method);
    try {
      await claimAPI.choosePickupMethod(claimId, { method });
      setClaims((prev) => prev.map((c) =>
        c._id === claimId
          ? { ...c, status: method === 'self' ? 'pickup_pending' : 'delivery_requested', pickupMethod: method }
          : c
      ));
      toast.success(method === 'self' ? 'Collection route assigned' : 'Dispatch protocol started');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActingOn(null);
    }
  };

  const handleConfirmPickup = async (claimId) => {
    setActingOn(claimId);
    try {
      await claimAPI.confirmPickup(claimId);
      setClaims((prev) => prev.map((c) => c._id === claimId ? { ...c, status: 'completed' } : c));
      toast.success('Resource cycle completed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActingOn(null);
    }
  };

  const stats = {
    total:    claims.length,
    pending:  claims.filter((c) => c.status === 'pending').length,
    active:   claims.filter((c) => ['approved','pickup_pending','delivery_requested','delivery_assigned','picked','in_transit'].includes(c.status)).length,
    done:     claims.filter((c) => c.status === 'completed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">NGO Dashboard</h1>
          <p className="text-slate-400 font-medium text-sm">Managing resources for <span className="text-slate-900">{user.name}</span></p>
        </div>
        <Link to="/map" className="btn-secondary !rounded-2xl border-none shadow-none text-xs tracking-widest uppercase font-black">
          📡 Global Network
        </Link>
      </div>

      {/* Verification Alert */}
      {!user.verified && (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl font-black">Verification Required</h2>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
              To maintain the integrity of our donation cycle, NGO accounts require manual verification. 
              You can currently browse listings, but claim protocols are locked.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Document sync in progress
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Claims"  value={stats.total}   icon="🧿" color="indigo"  />
        <StatCard label="Awaiting"      value={stats.pending} icon="⏳" color="amber" />
        <StatCard label="In Motion"     value={stats.active}  icon="🌀" color="emerald"   />
        <StatCard label="Resolved"      value={stats.done}    icon="🏆" color="slate" />
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50">
          {[
            { key: 'nearby', label: 'Proximity', count: nearby.length },
            { key: 'claims', label: 'Active Queue', count: claims.filter(c => !['completed','cancelled','rejected'].includes(c.status)).length },
            { key: 'history', label: 'Archived', count: claims.filter(c => ['completed','cancelled','rejected'].includes(c.status)).length },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {label}
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-500">{count}</span>
            </button>
          ))}
        </div>

        {tab === 'nearby' && (
          <div className="animate-fade-in">
            {!location ? (
              <div className="card text-center py-20 bg-slate-50/50">
                <LoadingSpinner size="md" className="mx-auto mb-4" />
                <p className="text-slate-400 text-sm font-medium">Synchronizing geolocation systems…</p>
              </div>
            ) : nearby.length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50 border-dashed border-2">
                <div className="text-6xl mb-4 grayscale opacity-20">📡</div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Zone Clear</h3>
                <p className="text-slate-400 text-sm mt-1">No pending contributions detected in your current radius.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearby.map((donation) => {
                  const alreadyClaimed = donation._claimed || claims.some(
                    (c) => (c.donationId?._id || c.donationId) === donation._id && c.status !== 'cancelled'
                  );
                  return (
                    <DonationCard
                      key={donation._id}
                      donation={donation}
                      actions={
                        donation.status === 'available' && !alreadyClaimed ? (
                          <button
                            onClick={() => handleClaim(donation._id)}
                            disabled={claiming === donation._id || !user.verified}
                            className="btn-primary w-full mt-4 !rounded-xl"
                          >
                            {claiming === donation._id ? <LoadingSpinner size="sm" color="white" /> : 'Register Interest'}
                          </button>
                        ) : alreadyClaimed ? (
                          <div className="mt-4 px-4 py-2.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl text-center border border-emerald-100 italic">
                            Protocol Initiated
                          </div>
                        ) : null
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'claims' && (
          <div className="space-y-6 animate-fade-in">
            {claims.filter((c) => !['completed', 'cancelled', 'rejected'].includes(c.status)).length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50 border-dashed border-2">
                <div className="text-6xl mb-4 grayscale opacity-20">📑</div>
                <p className="text-slate-400 font-medium">Queue inactive. Register interest in nearby resources.</p>
              </div>
            ) : (
              claims
                .filter((c) => !['completed', 'cancelled', 'rejected'].includes(c.status))
                .map((claim) => (
                  <div key={claim._id} className="card card-hover space-y-6 border-slate-100">
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase">
                            {claim.donationId?.title}
                          </h3>
                          <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status.replace(/_/g,' ')}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                          Initiated {formatTimeAgo(claim.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedClaim(expandedClaim === claim._id ? null : claim._id)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        {expandedClaim === claim._id ? 'Close Metrics' : 'View Metrics'}
                      </button>
                    </div>

                    {expandedClaim === claim._id && (
                      <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 animate-slide-down">
                        <StatusTimeline
                          steps={CLAIM_STEPS}
                          currentStatus={claim.status}
                          timestamps={claim.statusHistory?.reduce((acc, h) => ({ ...acc, [h.status]: h.changedAt }), {})}
                        />
                      </div>
                    )}

                    <div className="pt-2">
                      {claim.status === 'pending' && (
                        <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                          <div className="flex items-center gap-3">
                            <LoadingSpinner size="sm" color="emerald" />
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Verifying with Donor</p>
                          </div>
                          <button onClick={() => handleCancel(claim._id)} disabled={actingOn === claim._id} className="text-[10px] font-black uppercase text-rose-500 hover:underline">
                            Abort
                          </button>
                        </div>
                      )}

                      {claim.status === 'approved' && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            Approval finalized. Select Logistics Protocol:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                              onClick={() => handlePickupMethod(claim._id, 'self')}
                              className="p-6 rounded-3xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left bg-white group"
                            >
                              <div className="text-3xl mb-3 grayscale group-hover:grayscale-0 transition-all">🤝</div>
                              <p className="font-black text-slate-900 uppercase tracking-tight">Self-Collection</p>
                              <p className="text-xs text-slate-400 mt-1">Direct NGO representative pickup</p>
                            </button>
                            <button
                              onClick={() => handlePickupMethod(claim._id, 'delivery')}
                              disabled={!claim.donationId?.deliveryAllowed}
                              className={`p-6 rounded-3xl border border-slate-200 transition-all text-left bg-white group ${
                                claim.donationId?.deliveryAllowed 
                                ? 'hover:border-indigo-500 hover:bg-indigo-50/50' 
                                : 'opacity-40 grayscale cursor-not-allowed'
                              }`}
                            >
                              <div className="text-3xl mb-3">🚴</div>
                              <p className="font-black text-slate-900 uppercase tracking-tight">On-Demand Dispatch</p>
                              <p className="text-xs text-slate-400 mt-1">Automated courier logistics</p>
                            </button>
                          </div>
                        </div>
                      )}

                      {claim.status === 'pickup_pending' && (
                        <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
                          <div>
                            <p className="font-black uppercase tracking-tight">Logistics: Self-Collection</p>
                            <p className="text-xs text-slate-400 mt-0.5">Contact donor for final coordination</p>
                          </div>
                          <button onClick={() => handleConfirmPickup(claim._id)} disabled={actingOn === claim._id} className="btn-primary !bg-emerald-500 !text-white !rounded-xl text-xs font-black">
                             Complete Cycle
                          </button>
                        </div>
                      )}

                      {claim.status === 'delivery_requested' && (
                        <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                          <LoadingSpinner size="sm" color="indigo" />
                          <p className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Network Scanning for Couriers</p>
                        </div>
                      )}

                      {['delivery_assigned', 'picked', 'in_transit'].includes(claim.status) && (
                        <div className="flex items-center justify-between p-6 bg-indigo-600 rounded-[2rem] text-white">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">🚀</span>
                            <div>
                              <p className="font-black uppercase tracking-tight italic">Live Distribution</p>
                              <p className="text-indigo-200 text-xs">Courier is active in the grid</p>
                            </div>
                          </div>
                          <Link to={`/delivery/${claim.deliveryId}`} className="text-[10px] font-black tracking-widest uppercase bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
                            Track
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="grid gap-4 animate-fade-in">
            {claims.filter((c) => ['completed', 'cancelled', 'rejected'].includes(c.status)).length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50">
                <p className="text-slate-400 font-medium">Archive empty.</p>
              </div>
            ) : (
              claims
                .filter((c) => ['completed', 'cancelled', 'rejected'].includes(c.status))
                .map((claim) => (
                  <div key={claim._id} className="card flex items-center justify-between py-6">
                    <div className="space-y-1">
                      <p className="font-black text-slate-900 uppercase tracking-tight">{claim.donationId?.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTimeAgo(claim.createdAt)}</p>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status}</span>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
