require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');
const { startExpiryJob } = require('./services/expiryService');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const claimRoutes = require('./routes/claims');
const deliveryRoutes = require('./routes/deliveries');
const adminRoutes = require('./routes/admin');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Socket.IO with auth + event handlers
initSocket(io);

// Make io accessible in controllers
app.set('io', io);

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Drop2Donate API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start expiry cron job
startExpiryJob(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Drop2Donate server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
