import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not get location');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        ...options,
      }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Watch position for live tracking
  const watchPosition = useCallback((onUpdate) => {
    if (!navigator.geolocation) return null;
    return navigator.geolocation.watchPosition(
      (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error('[Geolocation]', err.message),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const clearWatch = useCallback((watchId) => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error, loading, refetch: getLocation, watchPosition, clearWatch };
};
