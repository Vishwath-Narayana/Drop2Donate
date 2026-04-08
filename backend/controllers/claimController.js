const Claim = require('../models/Claim');
const Donation = require('../models/Donation');
const Delivery = require('../models/Delivery');
const User = require('../models/User');

// @desc    Claim a donation
// @route   POST /api/claims
// @access  Private (ngo)
const createClaim = async (req, res, next) => {
  try {
    const { donationId, deliveryRequired, message, scheduledPickupTime } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Donation is no longer available' });
    }

    if (new Date(donation.expiryTime) < new Date()) {
      return res.status(400).json({ success: false, message: 'Donation has expired' });
    }

    // Check if NGO already claimed this
    const existingClaim = await Claim.findOne({ donationId, ngoId: req.user._id });
    if (existingClaim) {
      return res.status(409).json({ success: false, message: 'You have already claimed this donation' });
    }

    const claim = await Claim.create({
      donationId,
      ngoId: req.user._id,
      deliveryRequired: deliveryRequired || false,
      deliveryStatus: deliveryRequired ? 'requested' : 'not_required',
      message: message || '',
      scheduledPickupTime: scheduledPickupTime || null,
    });

    // Mark donation as claimed
    await Donation.findByIdAndUpdate(donationId, { status: 'claimed' });

    await claim.populate([
      { path: 'donationId', populate: { path: 'donorId', select: 'name email phone' } },
      { path: 'ngoId', select: 'name email phone' },
    ]);

    // Notify donor via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${donation.donorId}`).emit('donation_claimed', {
        claim,
        message: `Your donation "${donation.title}" has been claimed by ${req.user.name}`,
      });

      // Notify available delivery agents if delivery is required
      if (deliveryRequired) {
        io.emit('delivery_requested', {
          claim,
          donationLocation: donation.location,
          message: 'New delivery request available nearby',
        });
      }
    }

    // Add notification to donor
    await User.findByIdAndUpdate(donation.donorId, {
      $push: {
        notifications: {
          message: `Your donation "${donation.title}" has been claimed by ${req.user.name}`,
          type: 'success',
        },
      },
    });

    res.status(201).json({ success: true, message: 'Donation claimed successfully', claim });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all claims by NGO
// @route   GET /api/claims/my
// @access  Private (ngo)
const getMyClaims = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { ngoId: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate({
          path: 'donationId',
          populate: { path: 'donorId', select: 'name email phone avatar' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Claim.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: claims.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      claims,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get claims on donor's donations
// @route   GET /api/claims/received
// @access  Private (donor)
const getReceivedClaims = async (req, res, next) => {
  try {
    const myDonations = await Donation.find({ donorId: req.user._id }).select('_id');
    const donationIds = myDonations.map((d) => d._id);

    const claims = await Claim.find({ donationId: { $in: donationIds } })
      .populate('donationId', 'title type expiryTime')
      .populate('ngoId', 'name email phone avatar verified')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: claims.length, claims });
  } catch (err) {
    next(err);
  }
};

// @desc    Get claim by ID
// @route   GET /api/claims/:id
// @access  Private
const getClaim = async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate({
        path: 'donationId',
        populate: { path: 'donorId', select: 'name email phone avatar location' },
      })
      .populate('ngoId', 'name email phone avatar location');

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    res.json({ success: true, claim });
  } catch (err) {
    next(err);
  }
};

// @desc    Update claim status (donor approves/rejects)
// @route   PUT /api/claims/:id/status
// @access  Private (donor)
const updateClaimStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const claim = await Claim.findById(req.params.id).populate('donationId');
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    const donation = claim.donationId;

    // Only donor can approve/reject their own donation claims
    if (req.user.role === 'donor') {
      if (donation.donorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    // NGO can cancel their own claim
    if (req.user.role === 'ngo') {
      if (claim.ngoId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ success: false, message: 'NGOs can only cancel claims' });
      }
    }

    claim.status = status;
    await claim.save();

    // If rejected or cancelled, make donation available again
    if (['rejected', 'cancelled'].includes(status)) {
      await Donation.findByIdAndUpdate(donation._id, { status: 'available' });
    }

    // Notify the NGO
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${claim.ngoId}`).emit('claim_status_updated', {
        claim,
        message: `Your claim has been ${status}`,
      });
    }

    await User.findByIdAndUpdate(claim.ngoId, {
      $push: {
        notifications: {
          message: `Your claim for "${donation.title}" has been ${status}`,
          type: status === 'approved' ? 'success' : 'warning',
        },
      },
    });

    res.json({ success: true, message: `Claim ${status}`, claim });
  } catch (err) {
    next(err);
  }
};

// @desc    Rate after claim completion
// @route   POST /api/claims/:id/rate
// @access  Private
const rateClaim = async (req, res, next) => {
  try {
    const { score, feedback } = req.body;
    const claim = await Claim.findById(req.params.id).populate('donationId');

    if (!claim || claim.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only rate completed claims' });
    }

    claim.rating = { score, feedback };
    await claim.save();

    // Update NGO rating
    const ngo = await User.findById(claim.ngoId);
    const newCount = ngo.rating.count + 1;
    const newAvg = (ngo.rating.average * ngo.rating.count + score) / newCount;
    await User.findByIdAndUpdate(claim.ngoId, {
      'rating.average': Math.round(newAvg * 10) / 10,
      'rating.count': newCount,
    });

    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClaim,
  getMyClaims,
  getReceivedClaims,
  getClaim,
  updateClaimStatus,
  rateClaim,
};
