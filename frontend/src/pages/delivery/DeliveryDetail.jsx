import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MapView from '../../components/map/MapView';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getStatusBadgeClass, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinDeliveryRoom, leaveDeliveryRoom, on } = useSocket();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentLocation, setAgentLocation] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await deliveryAPI.getById(id);
        setDelivery(data.delivery);
        setAgentLocation(data.delivery.agentLocation);
      } catch (err) {
        toast.error('Delivery not found');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Join socket room and listen for live updates
  useEffect(() => {
    joinDeliveryRoom(id);
    const cleanup = on('delivery_location_update', (data) => {
      if (data.deliveryId === id) {
        setAgentLocation(data.agentLocation);
      }
    });
    const statusCleanup = on('delivery_status_update', (data) => {
      if (data.deliveryId === id) {
        setDelivery((prev) => prev ? { ...prev, status: data.status } : prev);
      }
    });
    return () => {
      leaveDeliveryRoom(id);
      cleanup?.();
      statusCleanup?.();
    };
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="xl" /></div>
  );

  if (!delivery) return null;

  const { donationId, donorId, ngoId, deliveryAgentId, pickupLocation, dropLocation, status, statusTimestamps, notes } = delivery;

  // Build route for polyline
  const route = [];
  if (pickupLocation?.coordinates) route.push([pickupLocation.coordinates[1], pickupLocation.coordinates[0]]);
  if (dropLocation?.coordinates) route.push([dropLocation.coordinates[1], dropLocation.coordinates[0]]);

  const steps = [
    { key: 'requested', label: 'Requested', icon: '📋' },
    { key: 'accepted', label: 'Agent Assigned', icon: '✅' },
    { key: 'picked', label: 'Picked Up', icon: '📦' },
    { key: 'in_transit', label: 'In Transit', icon: '🚴' },
    { key: 'delivered', label: 'Delivered', icon: '🎉' },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm font-medium">
        ← Back
      </button>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          {/* Status + Donation */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Delivery Tracking</h1>
              <span className={`badge ${getStatusBadgeClass(status)} text-sm`}>{status}</span>
            </div>
            <p className="font-semibold text-gray-800">{donationId?.title}</p>
            {notes && <p className="text-sm text-gray-500 mt-1 italic">{notes}</p>}
          </div>

          {/* Progress tracker */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-5">Delivery Progress</h2>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {steps.map((step, i) => {
                  const isDone = i <= currentStepIdx;
                  const isCurrent = i === currentStepIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${
                        isDone
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                        {isDone ? (i === currentStepIdx ? step.icon : '✓') : step.icon}
                      </div>
                      <div className="pt-1.5">
                        <p className={`font-medium text-sm ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                        {statusTimestamps?.[step.key] && (
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(statusTimestamps[step.key], 'MMM d, h:mm a')}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">Involved Parties</h2>
            {[
              { label: 'Donor', data: donorId, color: 'orange' },
              { label: 'NGO', data: ngoId, color: 'green' },
              { label: 'Delivery Agent', data: deliveryAgentId, color: 'blue' },
            ].map(({ label, data, color }) => (
              data ? (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-700 font-bold text-sm flex-shrink-0`}>
                    {data.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
                    <p className="font-medium text-gray-900 text-sm">{data.name}</p>
                    {data.phone && <p className="text-xs text-gray-400">{data.phone}</p>}
                  </div>
                </div>
              ) : (
                <div key={label} className="flex items-center gap-3 opacity-40">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">?</div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
                    <p className="text-sm text-gray-400">Not assigned</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Live Map</h2>
            <MapView
              deliveryRoute={route}
              agentLocation={agentLocation}
              height="350px"
              showControls={false}
            />
          </div>

          <div className="card space-y-3 text-sm">
            <h3 className="font-semibold text-gray-800">Locations</h3>
            <div className="flex gap-3 items-start">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Pickup</p>
                <p className="text-gray-400 text-xs">{pickupLocation?.address || 'Donor location'}</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Drop-off</p>
                <p className="text-gray-400 text-xs">{dropLocation?.address || 'NGO location'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
