import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Global notification handlers
    socket.on('new_donation', ({ donation, message }) => {
      if (user.role === 'ngo') {
        toast.success(message || 'New donation available nearby', { duration: 5000 });
      }
    });

    socket.on('donation_claimed', ({ message }) => {
      toast.success(message, { duration: 6000 });
    });

    socket.on('claim_status_updated', ({ message }) => {
      toast(message, { duration: 5000 });
    });

    socket.on('delivery_accepted', ({ message }) => {
      toast.success(message, { duration: 6000 });
    });

    socket.on('delivery_status_update', ({ message }) => {
      toast(message, { duration: 5000 });
    });

    socket.on('account_verified', ({ verified, message }) => {
      verified ? toast.success(message) : toast.error(message);
    });

    socket.on('donation_expired', ({ title }) => {
      toast(`Donation "${title}" has expired`, { icon: '⏰', duration: 4000 });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, user]);

  const joinDeliveryRoom = (deliveryId) => {
    socketRef.current?.emit('join_delivery_room', deliveryId);
  };

  const leaveDeliveryRoom = (deliveryId) => {
    socketRef.current?.emit('leave_delivery_room', deliveryId);
  };

  const emitLocationUpdate = (deliveryId, coordinates) => {
    socketRef.current?.emit('agent_location_update', { deliveryId, coordinates });
  };

  const on = (event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  };

  const off = (event, handler) => {
    socketRef.current?.off(event, handler);
  };

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, connected, joinDeliveryRoom, leaveDeliveryRoom, emitLocationUpdate, on, off }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
