const User = require('../models/User');
const Donation = require('../models/Donation');
const Claim = require('../models/Claim');
const Delivery = require('../models/Delivery');

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (admin)
const getUsers = async (req, res, next) => {
  try {
    const { role, verified, isActive, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (verified !== undefined) query.verified = verified === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      users,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (admin)
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify or reject NGO
// @route   PUT /api/admin/users/:id/verify
// @access  Private (admin)
const verifyNGO = async (req, res, next) => {
  try {
    const { verified, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'ngo') return res.status(400).json({ success: false, message: 'User is not an NGO' });

    user.verified = verified;
    await user.save();

    // Notify NGO
    await User.findByIdAndUpdate(user._id, {
      $push: {
        notifications: {
          message: verified
            ? 'Your NGO account has been verified! You can now claim donations.'
            : `Your NGO verification was rejected. ${reason || ''}`,
          type: verified ? 'success' : 'error',
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user._id}`).emit('account_verified', { verified, message: verified ? 'Your account has been verified' : 'Verification rejected' });
    }

    res.json({ success: true, message: `NGO ${verified ? 'verified' : 'rejected'}`, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle-active
// @access  Private (admin)
const toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      isActive: user.isActive,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get system-wide analytics
// @route   GET /api/admin/analytics
// @access  Private (admin)
const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDonations,
      totalClaims,
      totalDeliveries,
      usersByRole,
      donationsByStatus,
      donationsByType,
      recentDonations,
      pendingNGOs,
      deliveriesByStatus,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Donation.countDocuments(),
      Claim.countDocuments(),
      Delivery.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Donation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Donation.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Donation.find().sort({ createdAt: -1 }).limit(5).populate('donorId', 'name'),
      User.countDocuments({ role: 'ngo', verified: false, isActive: true }),
      Delivery.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    // Improved Monthly donation trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Donation.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
          food: { $sum: { $cond: [{ $eq: ['$type', 'food'] }, 1, 0] } },
          clothes: { $sum: { $cond: [{ $eq: ['$type', 'clothes'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // User signup velocity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const signupTrends = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        totals: { users: totalUsers, donations: totalDonations, claims: totalClaims, deliveries: totalDeliveries },
        usersByRole,
        donationsByStatus,
        donationsByType,
        deliveriesByStatus,
        recentDonations,
        pendingNGOs,
        monthlyTrends,
        signupTrends,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get pending NGO verifications
// @route   GET /api/admin/ngos/pending
// @access  Private (admin)
const getPendingNGOs = async (req, res, next) => {
  try {
    const ngos = await User.find({ role: 'ngo', verified: false, isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: ngos.length, ngos });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin delete donation
// @route   DELETE /api/admin/donations/:id
// @access  Private (admin)
const adminDeleteDonation = async (req, res, next) => {
  try {
    await Donation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Donation deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all donations (admin)
// @route   GET /api/admin/donations
// @access  Private (admin)
const getAllDonations = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('donorId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Donation.countDocuments(query),
    ]);

    res.json({ success: true, count: donations.length, total, donations });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUser,
  verifyNGO,
  toggleUserActive,
  getAnalytics,
  getPendingNGOs,
  adminDeleteDonation,
  getAllDonations,
};
