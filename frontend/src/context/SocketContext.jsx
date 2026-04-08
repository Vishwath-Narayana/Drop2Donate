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

    // io() with no URL uses the current origin.
    // Vite proxies /socket.io → http://localhost:5001 so this works in dev.
    // polling first is more reliable through proxies; socket.io auto-upgrades to ws.
    const socket = io({
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,   // never give up — backend may restart
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      // 'io server disconnect' means server actively disconnected us (e.g. bad auth)
      // In that case don't reconnect automatically
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      // Only log — don't spam toasts on every retry
      console.warn('[Socket] connect error:', err.message);
    });

    // ── Global notification handlers ─────────────────────────────────────────
    socket.on('new_donation', ({ message }) => {
      if (user.role === 'ngo') {
        toast(message || 'New donation available nearby', { icon: '🍱', duration: 5000 });
      }
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
  }, [token, user?._id]); // use user._id not user object to avoid re-running on every user update

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
      value={{
        socket: socketRef.current,
        connected,
        joinDeliveryRoom,
        leaveDeliveryRoom,
        emitLocationUpdate,
        on,
        off,
      }}
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
