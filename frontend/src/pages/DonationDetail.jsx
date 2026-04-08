import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { donationAPI, claimAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/map/MapView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatExpiry, expiryColorClass, getStatusBadgeClass, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [message, setMessage] = useState('');
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await donationAPI.getById(id);
        setDonation(data.donation);
      } catch {
        toast.error('Donation not found');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleClaim = async () => {
    if (!user.verified && user.role === 'ngo') {
      toast.error('Your NGO must be verified before claiming');
      return;
    }
    setClaiming(true);
    try {
      await claimAPI.create({ donationId: id, message });
      // Donation stays 'available' until donor approves — don't change local status
      setShowClaimForm(false);
      setMessage('');
      toast.success('Claim request sent! Waiting for donor approval.');
    } catch (err) {
      toast.error(err.message || 'Failed to send claim request');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="xl" /></div>
  );

  if (!donation) return null;

  const {
    title, type, description, quantity, status, expiryTime, cookedAt,
    donorId, location, images, allergens, isVegetarian, isVegan, servings,
    clothingDetails, deliveryAllowed, createdAt,
  } = donation;

  const locationCoords = location?.coordinates ? [{
    lat: location.coordinates[1],
    lng: location.coordinates[0],
  }] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm font-medium">
        ← Back
      </button>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-5">
          {/* Images */}
          {images?.length > 0 && (
            <div className="rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={images[currentImage]?.url}
                alt={title}
                className="w-full h-72 object-cover"
              />
              {images.length > 1 && (
                <div className="flex gap-2 p-3">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === currentImage ? 'border-green-500' : 'border-transparent'}`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title + status */}
          <div className="card">
            <div className="flex items-start gap-2 mb-4 flex-wrap">
              <span className={`badge text-sm ${type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                {type === 'food' ? '🍱' : '👗'} {type}
              </span>
              <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
              {deliveryAllowed && (
                <span className="badge bg-blue-100 text-blue-700">🚴 Delivery available</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
            <p className="text-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* Details */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Donation Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">Quantity</p>
                <p className="font-semibold text-gray-900">{quantity?.amount} {quantity?.unit}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">
                  {type === 'food' ? 'Expiry' : 'Shelf life'}
                </p>
                {type === 'food' ? (
                  <p className={`font-semibold ${expiryColorClass(expiryTime)}`}>{formatExpiry(expiryTime)}</p>
                ) : (
                  <p className="font-semibold text-gray-400">No expiry</p>
                )}
              </div>
              {servings && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase mb-1">Serves</p>
                  <p className="font-semibold text-gray-900">{servings} people</p>
                </div>
              )}
              {cookedAt && type === 'food' && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase mb-1">Cooked At</p>
                  <p className="font-semibold text-gray-900">{formatDate(cookedAt, 'h:mm a, MMM d')}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">Posted</p>
                <p className="font-semibold text-gray-900">{formatDate(createdAt, 'MMM d, h:mm a')}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-1">Pickup</p>
                <p className="font-semibold text-gray-900">{deliveryAllowed ? '🚴 Delivery OK' : '🤝 Self only'}</p>
              </div>
            </div>

            {type === 'food' && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  {isVegetarian && <span className="badge bg-green-100 text-green-700">🌱 Vegetarian</span>}
                  {isVegan && <span className="badge bg-green-100 text-green-700">🌿 Vegan</span>}
                </div>
                {allergens?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1.5">Contains Allergens</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allergens.map((a) => (
                        <span key={a} className="badge bg-red-100 text-red-700">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {type === 'clothes' && clothingDetails && Object.values(clothingDetails).some(Boolean) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 text-sm">
                  {clothingDetails.gender    && <span className="badge bg-purple-100 text-purple-700">{clothingDetails.gender}</span>}
                  {clothingDetails.size      && <span className="badge bg-gray-100 text-gray-700">Size: {clothingDetails.size}</span>}
                  {clothingDetails.season    && <span className="badge bg-blue-100 text-blue-700">{clothingDetails.season}</span>}
                  {clothingDetails.condition && <span className="badge bg-green-100 text-green-700">{clothingDetails.condition}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Claim section for NGO */}
          {user.role === 'ngo' && status === 'available' && (
            <div className="card">
              {!showClaimForm ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                    <p className="font-semibold mb-0.5">How claiming works</p>
                    <p className="text-xs">Send a request → Donor approves → You choose self-pickup or delivery agent</p>
                  </div>
                  <button
                    onClick={() => setShowClaimForm(true)}
                    disabled={!user.verified}
                    className="btn-primary w-full text-base py-3 disabled:opacity-50"
                  >
                    🤝 Request This Donation
                  </button>
                  {!user.verified && (
                    <p className="text-xs text-amber-600 text-center font-medium">⚠️ Your NGO must be verified to claim donations</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Send Claim Request</h3>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Optional message to donor — introduce your NGO or explain urgency…"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400">After the donor approves, you'll choose self-pickup or request a delivery agent.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { setShowClaimForm(false); setMessage(''); }} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleClaim} disabled={claiming} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      {claiming ? <LoadingSpinner size="sm" color="white" /> : null}
                      {claiming ? 'Sending…' : 'Send Request'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Donor: donor sees their own donation */}
          {user.role === 'donor' && donation.donorId?._id === user._id && (
            <div className="card bg-orange-50 border border-orange-100">
              <p className="text-sm font-semibold text-orange-800 mb-1">Your donation</p>
              <p className="text-xs text-orange-600">Check your dashboard to approve or reject incoming claim requests.</p>
              <Link to="/donor" className="mt-3 inline-block btn-donor text-sm py-2 px-4">Go to Dashboard</Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-5">
          {/* Donor info */}
          {donorId && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Donor</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                  {donorId.avatar ? (
                    <img src={donorId.avatar} alt={donorId.name} className="w-12 h-12 object-cover" />
                  ) : (
                    getInitials(donorId.name)
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{donorId.name}</p>
                  {donorId.phone && <p className="text-xs text-gray-400">{donorId.phone}</p>}
                </div>
              </div>
              {donorId.rating?.count > 0 && (
                <div className="mt-3 flex items-center gap-1 text-sm">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold">{donorId.rating.average.toFixed(1)}</span>
                  <span className="text-gray-400">({donorId.rating.count} reviews)</span>
                </div>
              )}
            </div>
          )}

          {/* Map */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Pickup Location</h3>
            <MapView
              donations={[donation]}
              height="200px"
              showControls={false}
            />
            {location?.address && (
              <p className="text-xs text-gray-500 mt-2">📍 {location.address}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
