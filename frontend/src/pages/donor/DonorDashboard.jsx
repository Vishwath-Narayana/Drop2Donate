import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI, claimAPI } from '../../services/api';
import { useRealtime } from '../../hooks/useRealtime';
import StatCard from '../../components/common/StatCard';
import DonationCard from '../../components/common/DonationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo } from '../../utils/helpers';
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
    } catch (err) {
      console.error('[Dashboard Load Error]:', err);
      toast.error('Unable to sync dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Real-time events ───────────────────────────────────────────────────────
  useRealtime({
    claim_requested: ({ claim }) => {
      setClaims((prev) => {
        const exists = prev.find((c) => c._id === claim._id);
        return exists ? prev : [claim, ...prev];
      });
      toast('New claim request received!', { icon: '🤝' });
    },
    claim_cancelled: ({ claimId }) => {
      setClaims((prev) => prev.map((c) =>
        c._id === claimId ? { ...c, status: 'cancelled' } : c
      ));
    },
    donation_expired: ({ donationId }) => {
      setDonations((prev) => prev.map((d) =>
        d._id === donationId ? { ...d, status: 'expired' } : d
      ));
    },
    delivery_accepted: ({ delivery }) => {
      toast.success('A delivery agent accepted your donation!');
    },
    delivery_status_update: ({ message }) => {
      toast(message, { icon: '🚴' });
    },
    donation_completed: ({ claim }) => {
      setDonations((prev) => prev.map((d) =>
        d._id === claim.donationId ? { ...d, status: 'completed' } : d
      ));
      setClaims((prev) => prev.map((c) =>
        c._id === claim._id ? { ...c, status: 'completed' } : c
      ));
    },
  });

  const handleClaimAction = async (claimId, action) => {
    setActionId(claimId + action);
    try {
      await claimAPI.respondToClaim(claimId, { action });
      setClaims((prev) => prev.map((c) =>
        c._id === claimId
          ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' }
          : c
      ));
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

  const stats = {
    total:     donations.length,
    available: donations.filter((d) => d.status === 'available').length,
    claimed:   donations.filter((d) => d.status === 'claimed').length,
    completed: donations.filter((d) => d.status === 'completed').length,
  };

  const pendingClaims = claims.filter((c) => c.status === 'pending');

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Donor Dashboard</h1>
          <p className="text-slate-400 font-medium text-sm">Welcome back, <span className="text-slate-900">{user.name}</span></p>
        </div>
        <Link to="/donor/donate" className="btn-donor">
          + New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Impact"  value={stats.total}     icon="💠" color="indigo" />
        <StatCard label="Live Now"      value={stats.available} icon="✨" color="emerald"  />
        <StatCard label="In Motion"     value={stats.claimed}   icon="🤝" color="amber"   />
        <StatCard label="Finalized"     value={stats.completed} icon="🏁" color="slate" />
      </div>

      {/* Alerts */}
      {pendingClaims.length > 0 && (
        <div className="bg-emerald-600 rounded-3xl p-6 text-white flex items-center justify-between shadow-xl shadow-emerald-100/50">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🧩</span>
            <div>
              <p className="text-lg font-black leading-tight">
                {pendingClaims.length} NGO claim{pendingClaims.length > 1 ? 's' : ''} awaiting review
              </p>
              <p className="text-emerald-100/80 text-sm font-medium">Verify and approve requests to start the delivery cycle.</p>
            </div>
          </div>
          <button onClick={() => setTab('claims')} className="bg-white text-emerald-600 font-bold px-6 py-2.5 rounded-2xl hover:bg-emerald-50 transition-colors shadow-sm">
            Review Now
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50">
          {[
            { key: 'donations', label: 'Surplus', count: donations.length },
            { key: 'claims',    label: 'Claim Log', count: claims.length, alert: pendingClaims.length > 0 },
          ].map(({ key, label, count, alert }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                alert ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {tab === 'donations' ? (
          <div className="animate-fade-in">
            {donations.length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50 border-dashed border-2">
                <div className="text-6xl mb-4 grayscale opacity-20">🍱</div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Empty Inventory</h3>
                <p className="text-slate-400 text-sm mt-1 mb-8 max-w-xs mx-auto">Your contributions create ripples. Start by posting a surplus item.</p>
                <Link to="/donor/donate" className="btn-primary w-fit mx-auto">Create First Donation</Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {donations.map((d) => (
                  <DonationCard
                    key={d._id}
                    donation={d}
                    actions={
                      d.status === 'available' ? (
                        <button onClick={() => handleCancelDonation(d._id)}
                          className="btn-danger text-xs py-2 w-full mt-4">
                          Withdraw Listing
                        </button>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {claims.length === 0 ? (
              <div className="card text-center py-20 bg-slate-50/50 border-dashed border-2">
                <div className="text-6xl mb-4 grayscale opacity-20">📋</div>
                <p className="text-slate-400 font-medium">No claims activity recorded yet.</p>
              </div>
            ) : (
              claims.map((claim) => (
                <div key={claim._id} className={`card card-hover flex flex-col md:flex-row md:items-center gap-6 ${
                  claim.status === 'pending' ? 'border-emerald-200 bg-emerald-50/10' : ''
                }`}>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-black text-slate-900 tracking-tight text-lg uppercase truncate">
                        {claim.donationId?.title}
                      </p>
                      <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[9px] font-black italic">
                          {claim.ngoId?.name?.[0]}
                        </div>
                        {claim.ngoId?.name}
                      </span>
                      <span>·</span>
                      <span>{formatTimeAgo(claim.createdAt)}</span>
                      {claim.message && (
                        <span className="italic normal-case font-medium text-slate-500">"{claim.message}"</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {claim.status === 'pending' && (
                      <>
                        <button onClick={() => handleClaimAction(claim._id, 'approve')} disabled={!!actionId} className="btn-primary text-xs py-2.5 !rounded-xl !bg-slate-900 border-none">
                          {actionId === claim._id + 'approve' ? <LoadingSpinner size="sm" color="white" /> : '✓ Approve'}
                        </button>
                        <button onClick={() => handleClaimAction(claim._id, 'reject')} disabled={!!actionId} className="btn-danger text-xs py-2.5 !rounded-xl">
                          {actionId === claim._id + 'reject' ? <LoadingSpinner size="sm" color="rose" /> : '✕ Reject'}
                        </button>
                      </>
                    )}
                    {claim.status === 'approved' && (
                        <div className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
                          Awaiting NGO Pickup Selection
                        </div>
                    )}
                    {['delivery_requested', 'delivery_assigned', 'picked', 'in_transit'].includes(claim.status) && (
                        <div className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-indigo-100">
                          <span className="animate-bounce">🚴</span> Logistics in Progress
                        </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
