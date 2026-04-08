import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Subscribe to one or more socket events and auto-cleanup on unmount.
 * Handlers are kept in a ref so they always see fresh state/props
 * without triggering re-subscriptions on every render.
 *
 * Usage:
 *   useRealtime({
 *     claim_requested: (data) => setItems(prev => [data.claim, ...prev]),
 *     donation_expired: (data) => removeItem(data.donationId),
 *   });
 */
export const useRealtime = (handlers = {}) => {
  const { socket } = useSocket();
  const handlersRef = useRef(handlers);

  // Keep the ref current without triggering re-subscriptions
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!socket) return;

    // Create stable wrapper functions that delegate to the latest handler ref
    const stableHandlers = {};
    Object.keys(handlers).forEach((event) => {
      stableHandlers[event] = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, stableHandlers[event]);
    });

    return () => {
      Object.keys(stableHandlers).forEach((event) => {
        socket.off(event, stableHandlers[event]);
      });
    };
    // Only re-subscribe when socket changes or the set of event keys changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, Object.keys(handlers).sort().join(',')]);
};
