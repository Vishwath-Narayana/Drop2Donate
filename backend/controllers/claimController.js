const Claim    = require('../models/Claim');
const Donation = require('../models/Donation');
const Delivery = require('../models/Delivery');
const User     = require('../models/User');

const emitTo = (req, room, event, data) => req.app.get('io')?.to(room).emit(event, data);
const emit   = (req, event, data)       => req.app.get('io')?.emit(event, data);

const addNotification = (userId, message, type = 'info') =>
  User.findByIdAndUpdate(userId, {
    $push: { notifications: { message, type, createdAt: new Date() } },
  });

// ── 1. NGO sends claim request ────────────────────────────────────────────────
// POST /api/claims
// Donation stays "available"; claim is "pending" until donor approves
const createClaim = async (req, res, next) => {
  try {
    const { donationId, message } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Donation is no longer available' });
    }
    // Food expiry check
    if (donation.type === 'food' && donation.expiryTime && new Date(donation.expiryTime) < new Date()) {
      return res.status(400).json({ success: false, message: 'This food donation has expired' });
    }

    const existing = await Claim.findOne({ donationId, ngoId: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a claim on this donation' });
    }

    const claim = await Claim.create({
      donationId,
      ngoId:   req.user._id,
      donorId: donation.donorId,
      message: message || '',
      statusHistory: [{ status: 'pending', changedBy: req.user._id }],
    });

    await claim.populate([
      { path: 'donationId', populate: { path: 'donorId', select: 'name email phone' } },
      { path: 'ngoId',   select: 'name email phone avatar' },
    ]);

    // Notify donor in real time
    const msg = `${req.user.name} requested your donation "${donation.title}"`;
    emitTo(req, `user_${donation.donorId}`, 'claim_requested', { claim, message: msg });
    await addNotification(donation.donorId, msg, 'info');

    res.status(201).json({ success: true, message: 'Claim request sent — awaiting donor approval', claim });
  } catch (err) {
    next(err);
  }
};

// ── 2. Donor approves or rejects ──────────────────────────────────────────────
// PUT /api/claims/:id/respond   body: { action: 'approve'|'reject' }
const respondToClaim = async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }

    const claim = await Claim.findById(req.params.id).populate('donationId');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    if (claim.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (claim.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Claim is not pending' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    claim.status = newStatus;
    claim.statusHistory.push({ status: newStatus, changedBy: req.user._id });
    await claim.save();

    if (action === 'approve') {
      // Mark donation as claimed so no other NGO can request it
      await Donation.findByIdAndUpdate(claim.donationId._id, { status: 'claimed' });
      // Cancel any other pending claims on this donation
      await Claim.updateMany(
        { donationId: claim.donationId._id, _id: { $ne: claim._id }, status: 'pending' },
        { status: 'cancelled' }
      );
    }

    const ngoMsg   = action === 'approve'
      ? `Your claim for "${claim.donationId.title}" was approved! Choose pickup or delivery.`
      : `Your claim for "${claim.donationId.title}" was rejected.`;
    const donorMsg = action === 'approve'
      ? `You approved ${claim.ngoId}'s claim.`
      : `You rejected the claim.`;

    emitTo(req, `user_${claim.ngoId}`, 'claim_response', {
      claim, action, message: ngoMsg,
    });
    await addNotification(claim.ngoId, ngoMsg, action === 'approve' ? 'success' : 'warning');

    res.json({ success: true, message: `Claim ${newStatus}`, claim });
  } catch (err) {
    next(err);
  }
};

// ── 3. NGO chooses pickup method (after approval) ─────────────────────────────
// PUT /api/claims/:id/pickup-method   body: { method: 'self'|'delivery' }
const choosePickupMethod = async (req, res, next) => {
  try {
    const { method } = req.body;
    if (!['self', 'delivery'].includes(method)) {
      return res.status(400).json({ success: false, message: 'method must be self or delivery' });
    }

    const claim = await Claim.findById(req.params.id).populate('donationId');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    if (claim.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (claim.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Claim must be approved before choosing pickup method' });
    }

    const donation = claim.donationId;

    // Validate delivery is allowed
    if (method === 'delivery' && !donation.deliveryAllowed) {
      return res.status(400).json({ success: false, message: 'Donor has not enabled delivery for this donation' });
    }

    if (method === 'self') {
      claim.status = 'pickup_pending';
      claim.pickupMethod = 'self';
      claim.statusHistory.push({ status: 'pickup_pending', changedBy: req.user._id });
      await claim.save();

      const msg = `NGO "${req.user.name}" will self-pickup your donation "${donation.title}"`;
      emitTo(req, `user_${claim.donorId}`, 'pickup_method_chosen', { claim, method, message: msg });
      await addNotification(claim.donorId, msg, 'info');

      return res.json({ success: true, message: 'Self-pickup confirmed. Visit the donor to collect.', claim });
    }

    // method === 'delivery': create delivery record
    const ngo = await User.findById(req.user._id);
    const delivery = await Delivery.create({
      donationId:      donation._id,
      claimId:         claim._id,
      donorId:         donation.donorId,
      ngoId:           req.user._id,
      pickupLocation:  donation.location,
      dropLocation:    ngo.location,
    });

    claim.status = 'delivery_requested';
    claim.pickupMethod = 'delivery';
    claim.statusHistory.push({ status: 'delivery_requested', changedBy: req.user._id });
    await claim.save();

    await delivery.populate([
      { path: 'donationId', select: 'title type quantity expiryTime' },
      { path: 'donorId',    select: 'name phone location' },
      { path: 'ngoId',      select: 'name phone location' },
    ]);

    // Broadcast to all delivery agents
    emit(req, 'new_delivery_request', {
      delivery,
      pickupLocation: donation.location,
      message: 'New delivery request available near you',
    });

    const donorMsg = `A delivery agent has been requested for your donation "${donation.title}"`;
    emitTo(req, `user_${claim.donorId}`, 'delivery_requested', { delivery, message: donorMsg });
    await addNotification(claim.donorId, donorMsg, 'info');

    res.json({ success: true, message: 'Delivery agent requested', claim, delivery });
  } catch (err) {
    next(err);
  }
};

// ── NGO confirms self-pickup completion ───────────────────────────────────────
// PUT /api/claims/:id/confirm-pickup
const confirmPickup = async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('donationId');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    if (claim.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (claim.status !== 'pickup_pending') {
      return res.status(400).json({ success: false, message: 'Claim is not in pickup_pending state' });
    }

    claim.status = 'completed';
    claim.statusHistory.push({ status: 'completed', changedBy: req.user._id });
    await claim.save();

    await Donation.findByIdAndUpdate(claim.donationId._id, { status: 'completed' });

    const msg = `"${claim.donationId.title}" has been picked up and completed!`;
    emitTo(req, `user_${claim.donorId}`, 'donation_completed', { claim, message: msg });
    await addNotification(claim.donorId, msg, 'success');
    emitTo(req, `user_${claim.ngoId}`, 'donation_completed', { claim, message: 'Pickup confirmed!' });

    res.json({ success: true, message: 'Pickup confirmed. Donation marked complete.', claim });
  } catch (err) {
    next(err);
  }
};

// ── Cancel claim ──────────────────────────────────────────────────────────────
// PUT /api/claims/:id/cancel
const cancelClaim = async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('donationId');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    const isNGO   = claim.ngoId.toString()   === req.user._id.toString();
    const isDonor = claim.donorId.toString()  === req.user._id.toString();
    if (!isNGO && !isDonor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const cancellableStatuses = ['pending', 'approved', 'pickup_pending'];
    if (!cancellableStatuses.includes(claim.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${claim.status} claim` });
    }

    // Capture original status BEFORE modifying
    const previousStatus = claim.status;

    claim.status = 'cancelled';
    claim.statusHistory.push({ status: 'cancelled', changedBy: req.user._id });
    await claim.save();

    // Free up donation if it had been approved/pickup_pending (was locked)
    if (['approved', 'pickup_pending'].includes(previousStatus)) {
      await Donation.findByIdAndUpdate(claim.donationId._id, { status: 'available' });
    }

    const notifyId = isNGO ? claim.donorId : claim.ngoId;
    const msg = `A claim on "${claim.donationId.title}" was cancelled`;
    emitTo(req, `user_${notifyId}`, 'claim_cancelled', { claimId: claim._id, message: msg });
    await addNotification(notifyId, msg, 'warning');

    res.json({ success: true, message: 'Claim cancelled', claim });
  } catch (err) {
    next(err);
  }
};

// ── Get NGO's own claims ──────────────────────────────────────────────────────
const getMyClaims = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { ngoId: req.user._id };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate({ path: 'donationId', populate: { path: 'donorId', select: 'name email phone avatar' } })
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Claim.countDocuments(query),
    ]);
    res.json({ success: true, count: claims.length, total, claims });
  } catch (err) { next(err); }
};

// ── Get claims on donor's donations ──────────────────────────────────────────
const getReceivedClaims = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { donorId: req.user._id };
    if (status) query.status = status;

    const claims = await Claim.find(query)
      .populate('donationId', 'title type expiryTime status deliveryAllowed')
      .populate('ngoId', 'name email phone avatar verified rating')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: claims.length, claims });
  } catch (err) { next(err); }
};

// ── Get single claim ──────────────────────────────────────────────────────────
const getClaim = async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate({ path: 'donationId', populate: { path: 'donorId', select: 'name email phone avatar location' } })
      .populate('ngoId', 'name email phone avatar location');
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, claim });
  } catch (err) { next(err); }
};

// ── Rate (donor rates NGO after completion) ───────────────────────────────────
const rateClaim = async (req, res, next) => {
  try {
    const { score, feedback } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim || claim.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only rate completed claims' });
    }
    claim.rating = { score, feedback };
    await claim.save();

    const ngo = await User.findById(claim.ngoId);
    const newCount = ngo.rating.count + 1;
    const newAvg   = (ngo.rating.average * ngo.rating.count + score) / newCount;
    await User.findByIdAndUpdate(claim.ngoId, {
      'rating.average': Math.round(newAvg * 10) / 10,
      'rating.count':   newCount,
    });
    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) { next(err); }
};

module.exports = {
  createClaim, respondToClaim, choosePickupMethod, confirmPickup,
  cancelClaim, getMyClaims, getReceivedClaims, getClaim, rateClaim,
};
