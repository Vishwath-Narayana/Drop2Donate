import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { donationAPI, claimAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import StatCard from '../../components/common/StatCard';
import DonationCard from '../../components/common/DonationCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatTimeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function NGODashboard() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [claimRes] = await Promise.all([
          claimAPI.getMy({ limit: 5 }),
        ]);
        setMyClaims(claimRes.claims || []);
      } catch (err) {
        toast.error('Failed to load dashboard');
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
        const data = await donationAPI.getNearby({
          lng: location.lng,
          lat: location.lat,
          radius: 15000,
          limit: 6,
        });
        setNearbyDonations(data.donations || []);
      } catch {}
    };
    fetchNearby();
  }, [location]);

  const handleClaim = async (donationId) => {
    if (!user.verified) {
      toast.error('Your NGO account must be verified by admin before claiming donations');
      return;
    }
    setClaimingId(donationId);
    try {
      await claimAPI.create({ donationId, deliveryRequired: false, message: 'We can pick up the donation' });
      setNearbyDonations((prev) => prev.filter((d) => d._id !== donationId));
      toast.success('Donation claimed successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to claim donation');
    } finally {
      setClaimingId(null);
    }
  };

  const stats = {
    total: myClaims.length,
    pending: myClaims.filter((c) => c.status === 'pending').length,
    approved: myClaims.filter((c) => c.status === 'approved').length,
    completed: myClaims.filter((c) => c.status === 'completed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NGO Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, {user.name}</p>
        </div>
        <Link to="/map" className="btn-primary flex items-center gap-2">
          🗺 View Map
        </Link>
      </div>

      {/* Verification Warning */}
      {!user.verified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-800">Account pending verification</p>
            <p className="text-yellow-700 text-sm mt-0.5">
              Your NGO account is awaiting admin verification. You can browse donations but cannot claim them until verified.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims" value={stats.total} icon="📋" color="green" />
        <StatCard label="Pending" value={stats.pending} icon="⏳" color="orange" />
        <StatCard label="Approved" value={stats.approved} icon="✅" color="blue" />
        <StatCard label="Completed" value={stats.completed} icon="🎉" color="purple" />
      </div>

      {/* Nearby Donations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Nearby Donations
            {nearbyDonations.length > 0 && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {nearbyDonations.length} available
              </span>
            )}
          </h2>
          <Link to="/ngo/nearby" className="text-sm text-green-600 hover:underline font-medium">View all</Link>
        </div>

        {!location ? (
          <div className="card text-center py-8">
            <p className="text-gray-500 text-sm">Getting your location to find nearby donations...</p>
            <LoadingSpinner size="sm" className="mx-auto mt-3" />
          </div>
        ) : nearbyDonations.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">📍</div>
            <p className="font-semibold text-gray-900">No donations nearby</p>
            <p className="text-gray-500 text-sm mt-1">Try expanding your search radius on the map</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyDonations.map((donation) => (
              <DonationCard
                key={donation._id}
                donation={donation}
                actions={
                  donation.status === 'available' ? (
                    <button
                      onClick={() => handleClaim(donation._id)}
                      disabled={claimingId === donation._id || !user.verified}
                      className="btn-primary text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1"
                    >
                      {claimingId === donation._id ? <LoadingSpinner size="sm" color="white" /> : '🤝'}
                      {claimingId === donation._id ? 'Claiming...' : 'Claim Donation'}
                    </button>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* My Claims */}
      {myClaims.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Claims</h2>
            <Link to="/ngo/claims" className="text-sm text-green-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {myClaims.map((claim) => (
              <div key={claim._id} className="card flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {claim.donationId?.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${claim.donationId?.type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {claim.donationId?.type}
                    </span>
                    <span className="text-xs text-gray-400">{formatTimeAgo(claim.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {claim.deliveryRequired && (
                    <span className="badge bg-blue-100 text-blue-700">🚴 Delivery</span>
                  )}
                  <span className={`badge ${getStatusBadgeClass(claim.status)}`}>{claim.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
