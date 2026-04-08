const Delivery = require('../models/Delivery');
const Claim = require('../models/Claim');
const Donation = require('../models/Donation');
const User = require('../models/User');

// @desc    Request delivery for a claim
// @route   POST /api/deliveries/request
// @access  Private (ngo)
const requestDelivery = async (req, res, next) => {
  try {
    const { claimId, notes } = req.body;

    const claim = await Claim.findById(claimId).populate('donationId');
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    if (claim.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const donation = claim.donationId;

    const existing = await Delivery.findOne({ claimId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Delivery already requested for this claim' });
    }

    const ngo = await User.findById(req.user._id);

    const delivery = await Delivery.create({
      donationId: donation._id,
      claimId,
      donorId: donation.donorId,
      ngoId: req.user._id,
      pickupLocation: donation.location,
      dropLocation: ngo.location,
      notes: notes || '',
    });

    // Update claim delivery status
    await Claim.findByIdAndUpdate(claimId, { deliveryStatus: 'requested', deliveryRequired: true });

    await delivery.populate([
      { path: 'donationId', select: 'title type' },
      { path: 'donorId', select: 'name phone' },
      { path: 'ngoId', select: 'name phone' },
    ]);

    // Broadcast to nearby delivery agents
    const io = req.app.get('io');
    if (io) {
      io.emit('new_delivery_request', {
        delivery,
        pickupLocation: donation.location,
        message: 'New delivery request available',
      });
    }

    res.status(201).json({ success: true, message: 'Delivery requested successfully', delivery });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby delivery requests
// @route   GET /api/deliveries/nearby
// @access  Private (delivery agent)
const getNearbyDeliveries = async (req, res, next) => {
  try {
    const { lng, lat, radius = 15000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ success: false, message: 'Longitude and latitude are required' });
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
      .populate('donorId', 'name phone')
      .populate('ngoId', 'name phone')
      .limit(30);

    res.json({ success: true, count: deliveries.length, deliveries });
  } catch (err) {
    next(err);
  }
};

// @desc    Accept a delivery
// @route   POST /api/deliveries/accept/:id
// @access  Private (delivery agent)
const acceptDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Delivery is no longer available' });
    }

    if (delivery.deliveryAgentId) {
      return res.status(409).json({ success: false, message: 'Delivery already accepted by another agent' });
    }

    delivery.deliveryAgentId = req.user._id;
    delivery.status = 'accepted';
    delivery.statusTimestamps.accepted = new Date();
    await delivery.save();

    await Claim.findByIdAndUpdate(delivery.claimId, { deliveryStatus: 'assigned' });
    await User.findByIdAndUpdate(req.user._id, { isAvailable: false });

    await delivery.populate([
      { path: 'donationId', select: 'title type quantity' },
      { path: 'donorId', select: 'name phone location' },
      { path: 'ngoId', select: 'name phone location' },
      { path: 'deliveryAgentId', select: 'name phone' },
    ]);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${delivery.donorId}`).emit('delivery_accepted', {
        delivery,
        message: `Delivery agent ${req.user.name} has accepted the delivery`,
      });
      io.to(`user_${delivery.ngoId}`).emit('delivery_accepted', {
        delivery,
        message: `Delivery agent ${req.user.name} is on the way`,
      });
    }

    // Notify donor and NGO
    await Promise.all([
      User.findByIdAndUpdate(delivery.donorId, {
        $push: { notifications: { message: `Delivery agent ${req.user.name} will pick up your donation`, type: 'info' } },
      }),
      User.findByIdAndUpdate(delivery.ngoId, {
        $push: { notifications: { message: `Delivery agent ${req.user.name} is assigned to your delivery`, type: 'info' } },
      }),
    ]);

    res.json({ success: true, message: 'Delivery accepted', delivery });
  } catch (err) {
    next(err);
  }
};

// @desc    Update delivery status
// @route   PUT /api/deliveries/status/:id
// @access  Private (delivery agent)
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, agentLocation } = req.body;

    const validTransitions = {
      accepted: ['picked'],
      picked: ['in_transit'],
      in_transit: ['delivered'],
    };

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.deliveryAgentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!validTransitions[delivery.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${delivery.status} to ${status}`,
      });
    }

    delivery.status = status;
    delivery.statusTimestamps[status] = new Date();

    if (agentLocation) {
      delivery.agentLocation = {
        type: 'Point',
        coordinates: agentLocation,
      };
    }

    await delivery.save();

    // Map delivery status to claim delivery status
    const claimDeliveryStatusMap = {
      picked: 'picked',
      in_transit: 'in_transit',
      delivered: 'delivered',
    };

    if (claimDeliveryStatusMap[status]) {
      await Claim.findByIdAndUpdate(delivery.claimId, {
        deliveryStatus: claimDeliveryStatusMap[status],
      });
    }

    // Mark agent available after delivery
    if (status === 'delivered') {
      await User.findByIdAndUpdate(delivery.deliveryAgentId, { isAvailable: true });
      // Mark claim as completed
      await Claim.findByIdAndUpdate(delivery.claimId, {
        deliveryStatus: 'delivered',
        status: 'completed',
      });
    }

    // Broadcast live location updates
    const io = req.app.get('io');
    if (io) {
      const eventData = {
        deliveryId: delivery._id,
        status,
        agentLocation: delivery.agentLocation,
        message: `Delivery status updated to ${status}`,
      };

      io.to(`user_${delivery.donorId}`).emit('delivery_status_update', eventData);
      io.to(`user_${delivery.ngoId}`).emit('delivery_status_update', eventData);
      io.to(`delivery_${delivery._id}`).emit('delivery_location_update', eventData);
    }

    // Notify both parties
    const statusMessages = {
      picked: 'has been picked up',
      in_transit: 'is now in transit',
      delivered: 'has been delivered successfully',
    };

    await Promise.all([
      User.findByIdAndUpdate(delivery.donorId, {
        $push: { notifications: { message: `Your donation ${statusMessages[status] || status}`, type: 'info' } },
      }),
      User.findByIdAndUpdate(delivery.ngoId, {
        $push: { notifications: { message: `Your delivery ${statusMessages[status] || status}`, type: status === 'delivered' ? 'success' : 'info' } },
      }),
    ]);

    res.json({ success: true, message: `Status updated to ${status}`, delivery });
  } catch (err) {
    next(err);
  }
};

// @desc    Update agent live location
// @route   PUT /api/deliveries/location/:id
// @access  Private (delivery agent)
const updateAgentLocation = async (req, res, next) => {
  try {
    const { coordinates } = req.body; // [lng, lat]

    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      { 'agentLocation.coordinates': coordinates },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`delivery_${delivery._id}`).emit('delivery_location_update', {
        deliveryId: delivery._id,
        agentLocation: delivery.agentLocation,
      });
    }

    // Also update user location
    await User.findByIdAndUpdate(req.user._id, {
      'location.coordinates': coordinates,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// @desc    Get agent's active and past deliveries
// @route   GET /api/deliveries/my
// @access  Private (delivery agent)
const getMyDeliveries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { deliveryAgentId: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate('donationId', 'title type quantity')
        .populate('donorId', 'name phone location')
        .populate('ngoId', 'name phone location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Delivery.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: deliveries.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      deliveries,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single delivery details
// @route   GET /api/deliveries/:id
// @access  Private
const getDelivery = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('donationId', 'title type quantity description')
      .populate('donorId', 'name phone location avatar')
      .populate('ngoId', 'name phone location avatar')
      .populate('deliveryAgentId', 'name phone isAvailable rating');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    res.json({ success: true, delivery });
  } catch (err) {
    next(err);
  }
};

// @desc    Rate delivery agent
// @route   POST /api/deliveries/:id/rate
// @access  Private (ngo)
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

    // Update agent average rating
    const agent = await User.findById(delivery.deliveryAgentId);
    const newCount = agent.rating.count + 1;
    const newAvg = (agent.rating.average * agent.rating.count + score) / newCount;
    await User.findByIdAndUpdate(delivery.deliveryAgentId, {
      'rating.average': Math.round(newAvg * 10) / 10,
      'rating.count': newCount,
    });

    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestDelivery,
  getNearbyDeliveries,
  acceptDelivery,
  updateDeliveryStatus,
  updateAgentLocation,
  getMyDeliveries,
  getDelivery,
  rateDelivery,
};
