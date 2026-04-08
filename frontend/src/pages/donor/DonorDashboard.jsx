import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI, claimAPI } from '../../services/api';
import { useRealtime } from '../../hooks/useRealtime';
import StatCard from '../../components/common/StatCard';
import DonationCard from '../../components/common/DonationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo, formatExpiry, expiryColorClass } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [claims,    setClaims]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('donations');
  const [actionId,  setActionId]  = useState(null);

  const load = useCallback(async () => {
    try {
      const [dRes, cRes] = await Promise.all([
        donationAPI.getMy({ limit: 20 }),
        claimAPI.getReceived(),
      ]);
      setDonations(dRes.donations || []);
      setClaims(cRes.claims || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Real-time events ───────────────────────────────────────────────────────
  useRealtime({
    // New claim request arrives
    claim_requested: ({ claim }) => {
      setClaims((prev) => {
        const exists = prev.find((c) => c._id === claim._id);
        return exists ? prev : [claim, ...prev];
      });
      toast('New claim request received!', { icon: '🤝' });
    },
    // Claim cancelled by NGO
    claim_cancelled: ({ claimId }) => {
      setClaims((prev) => prev.map((c) =>
        c._id === claimId ? { ...c, status: 'cancelled' } : c
      ));
    },
    // Donation expired
    donation_expired: ({ donationId }) => {
      setDonations((prev) => prev.map((d) =>
        d._id === donationId ? { ...d, status: 'expired' } : d
      ));
    },
    // Delivery accepted by agent
    delivery_accepted: ({ delivery }) => {
      toast.success('A delivery agent accepted your donation\'s delivery!');
    },
    // Delivery status progresses
    delivery_status_update: ({ message }) => {
      toast(message, { icon: '🚴' });
    },
    // Donation fully completed
    donation_completed: ({ claim }) => {
      setDonations((prev) => prev.map((d) =>
        d._id === claim.donationId ? { ...d, status: 'completed' } : d
      ));
      setClaims((prev) => prev.map((c) =>
        c._id === claim._id ? { ...c, status: 'completed' } : c
      ));
    },
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleClaimAction = async (claimId, action) => {
    setActionId(claimId + action);
    try {
      await claimAPI.respondToClaim(claimId, { action });
      setClaims((prev) => prev.map((c) =>
        c._id === claimId
          ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' }
          : c
      ));
      // If approved, mark donation as claimed
      if (action === 'approve') {
        const claim = claims.find((c) => c._id === claimId);
        if (claim) {
          setDonations((prev) => prev.map((d) =>
            d._id === (claim.donationId?._id || claim.donationId)
              ? { ...d, status: 'claimed' }
              : d
          ));
        }
      }
      toast.success(`Claim ${action === 'approve' ? 'approved' : 'rejected'}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleCancelDonation = async (id) => {
    if (!confirm('Cancel this donation?')) return;
    try {
      await donationAPI.cancel(id);
      setDonations((prev) => prev.map((d) => d._id === id ? { ...d, status: 'cancelled' } : d));
      toast.success('Donation cancelled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:     donations.length,
    available: donations.filter((d) => d.status === 'available').length,
    claimed:   donations.filter((d) => d.status === 'claimed').length,
    completed: donations.filter((d) => d.status === 'completed').length,
  };

  const pendingClaims = claims.filter((c) => c.status === 'pending');

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user.name}</p>
        </div>
        <Link to="/donor/donate" className="btn-donor flex items-center gap-2">
          + New Donation
        </Link>
      </div>

      {/* Pending claim alert */}
      {pendingClaims.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-amber-600 text-xl flex-shrink-0">⏳</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {pendingClaims.length} claim request{pendingClaims.length > 1 ? 's' : ''} awaiting your approval
            </p>
            <p className="text-amber-700 text-sm mt-0.5">Review and approve or reject NGO claims below</p>
          </div>
          <button onClick={() => setTab('claims')}
            className="text-amber-700 font-semibold text-sm hover:underline flex-shrink-0">
            View →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Posted"  value={stats.total}     icon="📦" color="orange" />
        <StatCard label="Available"     value={stats.available} icon="✅" color="green"  />
        <StatCard label="Claimed"       value={stats.claimed}   icon="🤝" color="blue"   />
        <StatCard label="Completed"     value={stats.completed} icon="🎉" color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {[
          { key: 'donations', label: 'My Donations', count: donations.length },
          { key: 'claims',    label: 'Claim Requests', count: pendingClaims.length, alert: pendingClaims.length > 0 },
        ].map(({ key, label, count, alert }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              alert ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Donations tab ─────────────────────────────────────────────────── */}
      {tab === 'donations' && (
        <div>
          {donations.length === 0 ? (
            <div className="card text-center py-14">
              <div className="text-5xl mb-3">🍱</div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">No donations yet</h3>
              <p className="text-gray-500 text-sm mb-5">Start making a difference — post your first donation</p>
              <Link to="/donor/donate" className="btn-donor inline-flex">Create Donation</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {donations.map((d) => (
                <DonationCard
                  key={d._id}
                  donation={d}
                  actions={
                    d.status === 'available' ? (
                      <button onClick={() => handleCancelDonation(d._id)}
                        className="btn-danger text-xs py-1.5 px-3 w-full">
                        Cancel
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Claims tab ────────────────────────────────────────────────────── */}
      {tab === 'claims' && (
        <div className="space-y-3">
          {claims.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500">No claim requests yet</p>
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim._id} className={`card flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                claim.status === 'pending' ? 'border-2 border-amber-200 bg-amber-50/30' : ''
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">
                      {claim.donationId?.title}
                    </p>
                    <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                        {claim.ngoId?.name?.[0]}
                      </div>
                      {claim.ngoId?.name}
                      {claim.ngoId?.verified && <span className="text-green-600 font-bold">✓</span>}
                    </span>
                    <span>·</span>
                    <span>{formatTimeAgo(claim.createdAt)}</span>
                    {claim.message && (
                      <span className="italic text-gray-400">"{claim.message}"</span>
                    )}
                  </div>
                </div>

                {claim.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleClaimAction(claim._id, 'approve')}
                      disabled={!!actionId}
                      className="btn-primary text-xs py-2 px-4 flex items-center gap-1"
                    >
                      {actionId === claim._id + 'approve' ? <LoadingSpinner size="sm" color="white" /> : '✓'}
                      Approve
                    </button>
                    <button
                      onClick={() => handleClaimAction(claim._id, 'reject')}
                      disabled={!!actionId}
                      className="btn-danger text-xs py-2 px-4 flex items-center gap-1"
                    >
                      {actionId === claim._id + 'reject' ? <LoadingSpinner size="sm" color="white" /> : '✕'}
                      Reject
                    </button>
                  </div>
                )}

                {claim.status === 'approved' && (
                  <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg font-medium flex-shrink-0">
                    NGO choosing pickup method…
                  </span>
                )}

                {['delivery_requested', 'delivery_assigned', 'picked', 'in_transit'].includes(claim.status) && (
                  <span className="text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg font-medium flex-shrink-0">
                    🚴 In delivery
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
