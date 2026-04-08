import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatExpiry, expiryColorClass } from '../../utils/helpers';
import { Link } from 'react-router-dom';

// Fix Leaflet default icon issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom SVG marker creators
const createIcon = (color, emoji = '') =>
  L.divIcon({
    html: `<div style="
      background:${color};
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

export const ICONS = {
  donor: createIcon('#f97316', '🍱'),
  donorClothes: createIcon('#f97316', '👗'),
  ngo: createIcon('#22c55e', '🏠'),
  delivery: createIcon('#3b82f6', '🚴'),
  user: createIcon('#8b5cf6', '📍'),
};

// Component to fly to user location
function FlyToUser({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 13, { duration: 1.5 });
    }
  }, [location, map]);
  return null;
}

// Component to emit map click for location picking
function LocationPicker({ onLocationPick, active }) {
  useMapEvents({
    click: (e) => {
      if (active && onLocationPick) {
        onLocationPick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function MapView({
  donations = [],
  users = [],
  deliveries = [],
  deliveryRoute = null,
  agentLocation = null,
  onLocationPick = null,
  pickingLocation = false,
  height = 'calc(100vh - 4rem)',
  showControls = true,
}) {
  const { location: userLocation } = useGeolocation();
  const [pickedLocation, setPickedLocation] = useState(null);

  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [20.5937, 78.9629]; // India center fallback

  const handleLocationPick = useCallback(
    (loc) => {
      setPickedLocation(loc);
      onLocationPick?.(loc);
    },
    [onLocationPick]
  );

  return (
    <div style={{ height }} className="relative w-full rounded-2xl overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && <FlyToUser location={userLocation} />}
        {pickingLocation && <LocationPicker onLocationPick={handleLocationPick} active />}

        {/* User's own position */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={ICONS.user}>
            <Popup>
              <div className="text-sm font-medium">Your location</div>
            </Popup>
          </Marker>
        )}

        {/* Picked location */}
        {pickedLocation && (
          <Marker position={[pickedLocation.lat, pickedLocation.lng]} icon={ICONS.user}>
            <Popup>
              <div className="text-sm">Selected location</div>
            </Popup>
          </Marker>
        )}

        {/* Donation markers */}
        {donations.map((donation) => {
          const [lng, lat] = donation.location?.coordinates || [];
          if (!lat || !lng) return null;
          const icon = donation.type === 'clothes' ? ICONS.donorClothes : ICONS.donor;
          return (
            <Marker key={donation._id} position={[lat, lng]} icon={icon}>
              <Popup maxWidth={260}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">
                      {donation.type}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">
                      {donation.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{donation.title}</h4>
                  <p className={`text-xs mb-3 ${expiryColorClass(donation.expiryTime)}`}>
                    {formatExpiry(donation.expiryTime)}
                  </p>
                  <Link
                    to={`/donations/${donation._id}`}
                    className="block text-center text-xs bg-green-600 text-white py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* User markers (NGOs, delivery agents) */}
        {users.map((u) => {
          const [lng, lat] = u.location?.coordinates || [];
          if (!lat || !lng) return null;
          const icon = u.role === 'ngo' ? ICONS.ngo : ICONS.delivery;
          return (
            <Marker key={u._id} position={[lat, lng]} icon={icon}>
              <Popup>
                <div className="p-1 text-sm">
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                  {u.isAvailable !== undefined && (
                    <p className={`text-xs font-medium mt-1 ${u.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                      {u.isAvailable ? 'Available' : 'Busy'}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live delivery agent location */}
        {agentLocation?.coordinates && (
          <Marker position={[agentLocation.coordinates[1], agentLocation.coordinates[0]]} icon={ICONS.delivery}>
            <Popup>
              <div className="text-sm font-medium">Delivery agent</div>
            </Popup>
          </Marker>
        )}

        {/* Delivery route polyline */}
        {deliveryRoute && deliveryRoute.length > 0 && (
          <Polyline
            positions={deliveryRoute}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
            dashArray="8, 4"
          />
        )}
      </MapContainer>

      {/* Map overlay controls */}
      {showControls && (
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-md p-3 text-xs space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600">Donations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">NGOs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-600">You</span>
          </div>
        </div>
      )}

      {pickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-md z-10">
          Click on the map to set location
        </div>
      )}
    </div>
  );
}
