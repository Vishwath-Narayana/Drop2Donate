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
import { getStatusBadgeClass, formatTimeAgo, formatExpiry, expiryColorClass } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CLAIM_STEPS = [
  { key: 'pending',            label: 'Request Sent',      icon: '📋' },
  { key: 'approved',           label: 'Donor Approved',    icon: '✅' },
  { key: 'pickup_pending',     label: 'Self Pickup',       icon: '🤝' },
  { key: 'delivery_requested', label: 'Agent Requested',   icon: '📡' },
  { key: 'delivery_assigned',  label: 'Agent Assigned',    icon: '🚴' },
  { key: 'picked',             label: 'Picked Up',         icon: '📦' },
  { key: 'in_transit',         label: 'In Transit',        icon: '🛣️' },
  { key: 'completed',          label: 'Completed',         icon: '🎉' },
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
      catch { toast.error('Failed to load dashboard'); }
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

  // ── Real-time ──────────────────────────────────────────────────────────────
  useRealtime({
    new_donation: ({ donation }) => {
      setNearby((prev) => {
        if (prev.find((d) => d._id === donation._id)) return prev;
        return [donation, ...prev];
      });
      toast('New donation available nearby!', { icon: '🍱' });
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
        toast.success('Your claim was approved! Choose a pickup method.');
        setTab('claims');
      } else {
        toast.error('Your claim was rejected by the donor.');
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

  // ── Claim a donation ───────────────────────────────────────────────────────
  const handleClaim = async (donationId, message = '') => {
    if (!user.verified) {
      toast.error('Your NGO account must be verified before claiming');
      return;
    }
    setClaiming(donationId);
    try {
      const data = await claimAPI.create({ donationId, message });
      setNearby((prev) => prev.map((d) => d._id === donationId ? { ...d, _claimed: true } : d));
      setClaims((prev) => [data.claim, ...prev]);
      toast.success('Claim request sent! Waiting for donor approval.');
      setTab('claims');
    } catch (err) {
      toast.error(err.message || 'Failed to send claim request');
    } finally {
      setClaiming(null);
    }
  };

  // ── Choose pickup method ───────────────────────────────────────────────────
  const handlePickupMethod = async (claimId, method) => {
    setActingOn(claimId + method);
    try {
      const data = await claimAPI.choosePickupMethod(claimId, { method });
      setClaims((prev) => prev.map((c) =>
        c._id === claimId
          ? { ...c, status: method === 'self' ? 'pickup_pending' : 'delivery_requested', pickupMethod: method }
          : c
      ));
      toast.success(
        method === 'self'
          ? 'Self-pickup confirmed. Visit the donor to collect!'
          : 'Delivery agent requested. Agents will be notified.'
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActingOn(null);
    }
  };

  // ── Confirm self-pickup ────────────────────────────────────────────────────
  const handleConfirmPickup = async (claimId) => {
    setActingOn(claimId);
    try {
      await claimAPI.confirmPickup(claimId);
      setClaims((prev) => prev.map((c) => c._id === claimId ? { ...c, status: 'completed' } : c));
      toast.success('Pickup confirmed! Donation marked as complete. 🎉');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActingOn(null);
    }
  };

  // ── Cancel claim ───────────────────────────────────────────────────────────
  const handleCancel = async (claimId) => {
    if (!confirm('Cancel this claim?')) return;
    setActingOn(claimId);
    try {
      await claimAPI.cancel(claimId);
      setClaims((prev) => prev.map((c) => c._id === claimId ? { ...c, status: 'cancelled' } : c));
      toast.success('Claim cancelled');
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
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NGO Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user.name}</p>
        </div>
        <Link to="/map" className="btn-primary flex items-center gap-2">🗺 Live Map</Link>
      </div>

      {/* Verification banner */}
      {!user.verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900">Account pending admin verification</p>
            <p className="text-amber-700 text-sm mt-0.5">
              You can browse donations but cannot claim until verified. Contact admin to speed this up.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims"  value={stats.total}   icon="📋" color="green"  />
        <StatCard label="Pending"       value={stats.pending} icon="⏳" color="orange" />
        <StatCard label="Active"        value={stats.active}  icon="🔄" color="blue"   />
        <StatCard label="Completed"     value={stats.done}    icon="🎉" color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {[
          { key: 'nearby', label: 'Nearby Donations', count: nearby.length },
          { key: 'claims', label: 'My Claims',        count: claims.filter((c) => !['completed','cancelled','rejected'].includes(c.status)).length },
          { key: 'history', label: 'History',         count: claims.filter((c) => ['completed','cancelled','rejected'].includes(c.status)).length },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
            {count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-bold">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Nearby tab ────────────────────────────────────────────────────── */}
      {tab === 'nearby' && (
        <div>
          {!location ? (
            <div className="card text-center py-10">
              <LoadingSpinner size="md" className="mx-auto mb-3" />
              <p className="text-gray-500">Getting your location to find nearby donations…</p>
            </div>
          ) : nearby.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-semibold text-gray-900">No donations nearby</p>
              <p className="text-gray-500 text-sm mt-1">Try the map view to search a wider area</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          className="btn-primary text-xs py-2 px-3 w-full flex items-center justify-center gap-1.5"
                        >
                          {claiming === donation._id
                            ? <><LoadingSpinner size="sm" color="white" /> Requesting…</>
                            : '🤝 Request Claim'}
                        </button>
                      ) : alreadyClaimed ? (
                        <span className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg w-full text-center font-medium">
                          ✓ Claim sent
                        </span>
                      ) : null
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Active Claims tab ─────────────────────────────────────────────── */}
      {tab === 'claims' && (
        <div className="space-y-4">
          {claims.filter((c) => !['completed', 'cancelled', 'rejected'].includes(c.status)).length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500">No active claims. Browse nearby donations to get started.</p>
            </div>
          ) : (
            claims
              .filter((c) => !['completed', 'cancelled', 'rejected'].includes(c.status))
              .map((claim) => (
                <div key={claim._id} className="card">
                  {/* Claim header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900">{claim.donationId?.title}</p>
                        <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status.replace(/_/g,' ')}</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatTimeAgo(claim.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => setExpandedClaim(expandedClaim === claim._id ? null : claim._id)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      {expandedClaim === claim._id ? '▲ Less' : '▼ Timeline'}
                    </button>
                  </div>

                  {/* Status timeline */}
                  {expandedClaim === claim._id && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                      <StatusTimeline
                        steps={CLAIM_STEPS}
                        currentStatus={claim.status}
                        timestamps={claim.statusHistory?.reduce((acc, h) => ({ ...acc, [h.status]: h.changedAt }), {})}
                      />
                    </div>
                  )}

                  {/* Action area based on status */}
                  {claim.status === 'pending' && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <LoadingSpinner size="sm" color="blue" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Waiting for donor approval</p>
                        <p className="text-xs text-blue-600 mt-0.5">The donor will review your request shortly</p>
                      </div>
                      <button
                        onClick={() => handleCancel(claim._id)}
                        disabled={actingOn === claim._id}
                        className="ml-auto text-xs text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {claim.status === 'approved' && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-green-800 bg-green-50 px-4 py-2.5 rounded-xl">
                        ✅ Claim approved! How will you collect this donation?
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handlePickupMethod(claim._id, 'self')}
                          disabled={!!actingOn}
                          className="p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:border-green-400 transition-all text-left"
                        >
                          <div className="text-2xl mb-1">🤝</div>
                          <p className="font-semibold text-gray-900 text-sm">Self Pickup</p>
                          <p className="text-xs text-gray-500 mt-0.5">We will collect it ourselves</p>
                          {actingOn === claim._id + 'self' && <LoadingSpinner size="sm" className="mt-2" />}
                        </button>
                        {claim.donationId?.deliveryAllowed ? (
                          <button
                            onClick={() => handlePickupMethod(claim._id, 'delivery')}
                            disabled={!!actingOn}
                            className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 transition-all text-left"
                          >
                            <div className="text-2xl mb-1">🚴</div>
                            <p className="font-semibold text-gray-900 text-sm">Request Delivery</p>
                            <p className="text-xs text-gray-500 mt-0.5">A delivery agent will bring it</p>
                            {actingOn === claim._id + 'delivery' && <LoadingSpinner size="sm" className="mt-2" />}
                          </button>
                        ) : (
                          <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-left opacity-60 cursor-not-allowed">
                            <div className="text-2xl mb-1">🚫</div>
                            <p className="font-semibold text-gray-700 text-sm">Delivery Unavailable</p>
                            <p className="text-xs text-gray-500 mt-0.5">Donor only allows self-pickup</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {claim.status === 'pickup_pending' && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-green-800">Ready for self-pickup</p>
                        <p className="text-xs text-green-700 mt-0.5">Visit the donor to collect the donation</p>
                      </div>
                      <button
                        onClick={() => handleConfirmPickup(claim._id)}
                        disabled={actingOn === claim._id}
                        className="btn-primary text-xs py-2 px-4 flex items-center gap-1"
                      >
                        {actingOn === claim._id ? <LoadingSpinner size="sm" color="white" /> : '✓'}
                        Confirm Pickup
                      </button>
                    </div>
                  )}

                  {claim.status === 'delivery_requested' && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                      <LoadingSpinner size="sm" color="blue" />
                      <div>
                        <p className="text-sm font-semibold text-purple-800">Waiting for delivery agent</p>
                        <p className="text-xs text-purple-600 mt-0.5">Nearby agents have been notified</p>
                      </div>
                    </div>
                  )}

                  {['delivery_assigned', 'picked', 'in_transit'].includes(claim.status) && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-sm font-semibold text-blue-800">
                        {claim.status === 'delivery_assigned' && '🚴 Delivery agent is on the way'}
                        {claim.status === 'picked' && '📦 Donation picked up — en route'}
                        {claim.status === 'in_transit' && '🛣️ In transit to your location'}
                      </p>
                      {claim.deliveryId && (
                        <Link to={`/delivery/${claim.deliveryId}`}
                          className="text-xs text-blue-700 hover:underline mt-1 block">
                          Track delivery →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {/* ── History tab ───────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {claims.filter((c) => ['completed', 'cancelled', 'rejected'].includes(c.status)).length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500">No history yet</p>
            </div>
          ) : (
            claims
              .filter((c) => ['completed', 'cancelled', 'rejected'].includes(c.status))
              .map((claim) => (
                <div key={claim._id} className="card flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{claim.donationId?.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(claim.createdAt)}</p>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status}</span>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
