import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI, claimAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import DonationCard from '../../components/common/DonationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [donRes, claimRes] = await Promise.all([
          donationAPI.getMy({ limit: 6 }),
          claimAPI.getReceived(),
        ]);
        setDonations(donRes.donations || []);
        setClaims(claimRes.claims || []);
      } catch (err) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = {
    total: donations.length,
    available: donations.filter((d) => d.status === 'available').length,
    claimed: donations.filter((d) => d.status === 'claimed').length,
    expired: donations.filter((d) => d.status === 'expired').length,
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this donation?')) return;
    try {
      await donationAPI.cancel(id);
      setDonations((prev) => prev.filter((d) => d._id !== id));
      toast.success('Donation cancelled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user.name}</p>
        </div>
        <Link to="/donor/donate" className="btn-donor flex items-center gap-2">
          <span>+</span> New Donation
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Donations" value={stats.total} icon="📦" color="orange" />
        <StatCard label="Available" value={stats.available} icon="✅" color="green" />
        <StatCard label="Claimed" value={stats.claimed} icon="🤝" color="blue" />
        <StatCard label="Expired" value={stats.expired} icon="⏰" color="red" />
      </div>

      {/* Recent Donations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Donations</h2>
          <Link to="/donor/donations" className="text-sm text-green-600 hover:underline font-medium">View all</Link>
        </div>

        {donations.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🍱</div>
            <h3 className="font-semibold text-gray-900 mb-2">No donations yet</h3>
            <p className="text-gray-500 text-sm mb-4">Start making a difference by uploading your first donation</p>
            <Link to="/donor/donate" className="btn-donor inline-flex">Create Donation</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {donations.map((donation) => (
              <DonationCard
                key={donation._id}
                donation={donation}
                actions={
                  donation.status === 'available' ? (
                    <button
                      onClick={() => handleCancel(donation._id)}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Claims Received */}
      {claims.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Claims on Your Donations</h2>
            <Link to="/donor/claims" className="text-sm text-green-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {claims.slice(0, 5).map((claim) => (
              <div key={claim._id} className="card flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {claim.donationId?.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Claimed by <span className="font-medium">{claim.ngoId?.name}</span> · {formatTimeAgo(claim.createdAt)}
                  </p>
                </div>
                <span className={`badge ${getStatusBadgeClass(claim.status)} flex-shrink-0`}>
                  {claim.status}
                </span>
                {claim.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          await claimAPI.updateStatus(claim._id, { status: 'approved' });
                          setClaims((prev) => prev.map((c) => c._id === claim._id ? { ...c, status: 'approved' } : c));
                          toast.success('Claim approved');
                        } catch (err) { toast.error(err.message); }
                      }}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await claimAPI.updateStatus(claim._id, { status: 'rejected' });
                          setClaims((prev) => prev.map((c) => c._id === claim._id ? { ...c, status: 'rejected' } : c));
                          toast.success('Claim rejected');
                        } catch (err) { toast.error(err.message); }
                      }}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
