const jwt = require('jsonwebtoken');
const User = require('../models/User');

const initSocket = (io) => {
  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] Connected: ${user.name} (${user.role}) — ${socket.id}`);

    // Join personal room for targeted notifications
    socket.join(`user_${user._id}`);

    // Join role-based rooms
    socket.join(`role_${user.role}`);

    // Delivery agents join their specific delivery room when tracking
    socket.on('join_delivery_room', (deliveryId) => {
      socket.join(`delivery_${deliveryId}`);
      console.log(`[Socket] ${user.name} joined delivery room: ${deliveryId}`);
    });

    socket.on('leave_delivery_room', (deliveryId) => {
      socket.leave(`delivery_${deliveryId}`);
    });

    // Live location update from delivery agent
    socket.on('agent_location_update', async (data) => {
      const { deliveryId, coordinates } = data;
      io.to(`delivery_${deliveryId}`).emit('delivery_location_update', {
        deliveryId,
        agentLocation: { type: 'Point', coordinates },
        timestamp: new Date(),
      });

      // Persist location to DB
      try {
        const Delivery = require('../models/Delivery');
        await Delivery.findByIdAndUpdate(deliveryId, {
          'agentLocation.coordinates': coordinates,
        });
        await User.findByIdAndUpdate(user._id, {
          'location.coordinates': coordinates,
        });
      } catch (err) {
        console.error('[Socket] Location update error:', err.message);
      }
    });

    // Mark user as offline when disconnected
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${user.name} — ${socket.id}`);
      if (user.role === 'delivery') {
        // Keep availability state as-is (it's managed by delivery acceptance)
      }
      await User.findByIdAndUpdate(user._id, { lastActive: new Date() });
    });
  });

  return io;
};

module.exports = { initSocket };
