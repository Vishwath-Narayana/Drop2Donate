const Delivery = require('../models/Delivery');
const Claim    = require('../models/Claim');
const Donation = require('../models/Donation');
const User     = require('../models/User');

const emitTo = (req, room, event, data) => req.app.get('io')?.to(room).emit(event, data);
const emit   = (req, event, data)       => req.app.get('io')?.emit(event, data);

const addNotification = (userId, message, type = 'info') =>
  User.findByIdAndUpdate(userId, {
    $push: { notifications: { message, type, createdAt: new Date() } },
  });

// ── Nearby available deliveries ───────────────────────────────────────────────
// GET /api/deliveries/nearby
const getNearbyDeliveries = async (req, res, next) => {
  try {
    const { lng, lat, radius = 15000 } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({ success: false, message: 'lng and lat required' });
    }
    const deliveries = await Delivery.find({
      status: 'requested',
      deliveryAgentId: null,
      pickupLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    })
      .populate('donationId', 'title type quantity expiryTime')
      .populate('donorId',    'name phone')
      .populate('ngoId',      'name phone')
      .limit(30);

    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (err) { next(err); }
};

// ── Accept delivery ───────────────────────────────────────────────────────────
// POST /api/deliveries/accept/:id
const acceptDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Delivery is no longer available' });
    }
    if (delivery.deliveryAgentId) {
      return res.status(409).json({ success: false, message: 'Already accepted by another agent' });
    }

    delivery.deliveryAgentId = req.user._id;
    delivery.status = 'accepted';
    delivery.statusTimestamps.accepted = new Date();
    await delivery.save();

    await Claim.findByIdAndUpdate(delivery.claimId, {
      status: 'delivery_assigned',
      $push: { statusHistory: { status: 'delivery_assigned', changedBy: req.user._id } },
    });
    await User.findByIdAndUpdate(req.user._id, { isAvailable: false });

    await delivery.populate([
      { path: 'donationId', select: 'title type quantity' },
      { path: 'donorId',    select: 'name phone location' },
      { path: 'ngoId',      select: 'name phone location' },
      { path: 'deliveryAgentId', select: 'name phone' },
    ]);

    const agentName = req.user.name;
    const notifyBoth = [
      { id: delivery.donorId._id || delivery.donorId, msg: `Delivery agent ${agentName} will pick up your donation` },
      { id: delivery.ngoId._id   || delivery.ngoId,   msg: `Delivery agent ${agentName} accepted and is on the way` },
    ];
    for (const n of notifyBoth) {
      emitTo(req, `user_${n.id}`, 'delivery_accepted', { delivery, message: n.msg });
      await addNotification(n.id, n.msg, 'info');
    }

    // Kick off delivery room
    emit(req, `delivery_${delivery._id}`, 'delivery_accepted', { delivery });

    res.json({ success: true, message: 'Delivery accepted', delivery });
  } catch (err) { next(err); }
};

// ── Update delivery status ────────────────────────────────────────────────────
// PUT /api/deliveries/status/:id
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, agentLocation } = req.body;

    const valid = { accepted: 'picked', picked: 'in_transit', in_transit: 'delivered' };

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.deliveryAgentId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (valid[delivery.status] !== status) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${delivery.status}" to "${status}"`,
      });
    }

    delivery.status = status;
    delivery.statusTimestamps[status] = new Date();
    if (agentLocation) delivery.agentLocation = { type: 'Point', coordinates: agentLocation };
    await delivery.save();

    // Map delivery status → claim status
    const claimStatusMap = { picked: 'picked', in_transit: 'in_transit', delivered: 'completed' };
    if (claimStatusMap[status]) {
      await Claim.findByIdAndUpdate(delivery.claimId, {
        status: claimStatusMap[status],
        $push: { statusHistory: { status: claimStatusMap[status], changedBy: req.user._id } },
      });
    }

    if (status === 'delivered') {
      await Donation.findByIdAndUpdate(delivery.donationId, { status: 'completed' });
      await User.findByIdAndUpdate(delivery.deliveryAgentId, { isAvailable: true });
    }

    const statusMessages = {
      picked:     'has been picked up by the delivery agent',
      in_transit: 'is now in transit',
      delivered:  'has been delivered! 🎉',
    };

    const eventData = {
      deliveryId: delivery._id,
      status,
      agentLocation: delivery.agentLocation,
      message: `Delivery ${statusMessages[status] || status}`,
    };

    // Broadcast to donor, NGO, and delivery room
    emitTo(req, `user_${delivery.donorId}`, 'delivery_status_update', eventData);
    emitTo(req, `user_${delivery.ngoId}`,   'delivery_status_update', eventData);
    emit(req, `delivery_${delivery._id}`,   'delivery_location_update', eventData);

    await Promise.all([
      addNotification(delivery.donorId, `Your donation ${statusMessages[status]}`, status === 'delivered' ? 'success' : 'info'),
      addNotification(delivery.ngoId,   `Your delivery ${statusMessages[status]}`, status === 'delivered' ? 'success' : 'info'),
    ]);

    res.json({ success: true, message: `Status → ${status}`, delivery });
  } catch (err) { next(err); }
};

// ── Live agent location update ────────────────────────────────────────────────
// PUT /api/deliveries/location/:id
const updateAgentLocation = async (req, res, next) => {
  try {
    const { coordinates } = req.body; // [lng, lat]

    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      { 'agentLocation.coordinates': coordinates },
      { new: true }
    );
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    emit(req, `delivery_${delivery._id}`, 'delivery_location_update', {
      deliveryId: delivery._id,
      agentLocation: delivery.agentLocation,
    });

    await User.findByIdAndUpdate(req.user._id, { 'location.coordinates': coordinates });

    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Agent's deliveries ────────────────────────────────────────────────────────
const getMyDeliveries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { deliveryAgentId: req.user._id };
    if (status) query.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate('donationId', 'title type quantity')
        .populate('donorId',    'name phone location')
        .populate('ngoId',      'name phone location')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Delivery.countDocuments(query),
    ]);
    res.json({ success: true, count: deliveries.length, total, deliveries });
  } catch (err) { next(err); }
};

// ── Single delivery ───────────────────────────────────────────────────────────
const getDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('donationId', 'title type quantity description')
      .populate('donorId',    'name phone location avatar')
      .populate('ngoId',      'name phone location avatar')
      .populate('deliveryAgentId', 'name phone isAvailable rating');
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    res.json({ success: true, delivery });
  } catch (err) { next(err); }
};

// ── Rate agent ────────────────────────────────────────────────────────────────
const rateDelivery = async (req, res, next) => {
  try {
    const { score, feedback } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery || delivery.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Can only rate completed deliveries' });
    }
    if (delivery.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    delivery.rating = { score, feedback };
    await delivery.save();

    const agent = await User.findById(delivery.deliveryAgentId);
    const newCount = agent.rating.count + 1;
    const newAvg   = (agent.rating.average * agent.rating.count + score) / newCount;
    await User.findByIdAndUpdate(delivery.deliveryAgentId, {
      'rating.average': Math.round(newAvg * 10) / 10,
      'rating.count':   newCount,
    });
    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) { next(err); }
};

module.exports = {
  getNearbyDeliveries, acceptDelivery, updateDeliveryStatus,
  updateAgentLocation, getMyDeliveries, getDelivery, rateDelivery,
};
