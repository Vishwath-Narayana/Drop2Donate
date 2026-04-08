import { useState, useEffect } from 'react';
import MapView from '../components/map/MapView';
import { donationAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSocket } from '../context/SocketContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MapPage() {
  const { location, loading: locationLoading, error: locationError } = useGeolocation();
  const { on } = useSocket();
  const [donations, setDonations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchMapDonations = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const data = await donationAPI.getMap({
        lng: location.lng,
        lat: location.lat,
        radius: radius * 1000,
      });
      setDonations(data.donations || []);
    } catch (err) {
      toast.error('Failed to load map donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapDonations();
  }, [location, radius]);

  // Listen for new donations in real-time
  useEffect(() => {
    const cleanup = on('new_donation', ({ donation }) => {
      setDonations((prev) => {
        const exists = prev.find((d) => d._id === donation._id);
        if (!exists) return [donation, ...prev];
        return prev;
      });
    });

    const expiredCleanup = on('donation_expired', ({ donationId }) => {
      setDonations((prev) => prev.filter((d) => d._id !== donationId));
    });

    return () => {
      cleanup?.();
      expiredCleanup?.();
    };
  }, [on]);

  const filteredDonations =
    filter === 'all' ? donations : donations.filter((d) => d.type === filter);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top controls */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="font-bold text-gray-900">Live Map</h1>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Type filter */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {['all', 'food', 'clothes'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'food' ? '🍱 ' : f === 'clothes' ? '👗 ' : ''}
                {f}
              </button>
            ))}
          </div>

          {/* Radius selector */}
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
          </select>

          <button
            onClick={fetchMapDonations}
            className="btn-primary py-2 px-3 text-xs flex items-center gap-1"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" color="white" /> : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2 text-xs text-green-800">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        {locationLoading
          ? 'Getting your location...'
          : locationError
          ? `Location error: ${locationError}`
          : `Showing ${filteredDonations.length} donation${filteredDonations.length !== 1 ? 's' : ''} within ${radius}km`}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          donations={filteredDonations}
          height="100%"
          showControls
        />
      </div>
    </div>
  );
}
