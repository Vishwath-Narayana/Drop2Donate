const Donation = require('../models/Donation');
const User = require('../models/User');

// Helper: emit socket event safely
const emit = (req, event, data) => {
  const io = req.app.get('io');
  if (io) io.emit(event, data);
};
const emitTo = (req, room, event, data) => {
  const io = req.app.get('io');
  if (io) io.to(room).emit(event, data);
};

// ── Create donation ───────────────────────────────────────────────────────────
// POST /api/donations
const createDonation = async (req, res, next) => {
  try {
    const {
      title, type, description, quantity, location,
      cookedAt, expiryTime, deliveryAllowed,
      servings, allergens, isVegetarian, isVegan, clothingDetails,
    } = req.body;

    // Clothes have no expiry — validate server-side
    if (type === 'food' && !expiryTime) {
      return res.status(400).json({ success: false, message: 'Expiry time is required for food donations' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const images = req.files
      ? req.files.map((f) => ({ url: `${baseUrl}/uploads/${f.filename}`, publicId: f.filename }))
      : [];

    const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

    const donation = await Donation.create({
      title,
      type,
      description,
      quantity: parse(quantity),
      donorId: req.user._id,
      location: parse(location),
      cookedAt: type === 'food' ? (cookedAt || null) : null,
      expiryTime: type === 'food' ? expiryTime : null,
      deliveryAllowed: deliveryAllowed !== undefined
        ? (deliveryAllowed === 'true' || deliveryAllowed === true)
        : true,
      servings: type === 'food' ? (servings || null) : null,
      allergens: type === 'food' ? (allergens ? parse(allergens) : []) : [],
      isVegetarian: type === 'food' ? (isVegetarian === 'true' || isVegetarian === true) : false,
      isVegan: type === 'food' ? (isVegan === 'true' || isVegan === true) : false,
      clothingDetails: type === 'clothes' ? (clothingDetails ? parse(clothingDetails) : {}) : {},
      images,
    });

    await donation.populate('donorId', 'name email phone avatar location');

    // Broadcast to NGOs
    emit(req, 'new_donation', { donation, message: `New ${type} donation: ${title}` });

    res.status(201).json({ success: true, message: 'Donation created', donation });
  } catch (err) {
    next(err);
  }
};

// ── Nearby donations (NGO view) ───────────────────────────────────────────────
// GET /api/donations/nearby
const getNearbyDonations = async (req, res, next) => {
  try {
    const { lng, lat, radius = 10000, type, page = 1, limit = 20 } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({ success: false, message: 'lng and lat are required' });
    }

    const now = new Date();
    const query = {
      status: 'available',
      $or: [
        { type: 'clothes' },                  // clothes never expire
        { type: 'food', expiryTime: { $gt: now } }, // food must not be expired
      ],
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    };
    if (type && ['food', 'clothes'].includes(type)) {
      delete query.$or;
      query.type = type;
      if (type === 'food') query.expiryTime = { $gt: now };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const donations = await Donation.find(query)
      .populate('donorId', 'name email phone avatar rating')
      .sort({ expiryTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, count: donations.length, donations });
  } catch (err) {
    next(err);
  }
};

// ── Map donations ─────────────────────────────────────────────────────────────
// GET /api/donations/map
const getMapDonations = async (req, res, next) => {
  try {
    const { lng, lat, radius = 25000 } = req.query;
    const now = new Date();

    const query = {
      status: 'available',
      $or: [{ type: 'clothes' }, { type: 'food', expiryTime: { $gt: now } }],
    };

    if (lng && lat) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const donations = await Donation.find(query)
      .populate('donorId', 'name avatar')
      .select('title type location expiryTime status quantity donorId deliveryAllowed')
      .limit(200);

    res.json({ success: true, donations });
  } catch (err) {
    next(err);
  }
};

// ── Single donation ───────────────────────────────────────────────────────────
// GET /api/donations/:id
const getDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id).populate(
      'donorId', 'name email phone avatar location rating'
    );
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    await Donation.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, donation });
  } catch (err) {
    next(err);
  }
};

// ── Donor's own donations ─────────────────────────────────────────────────────
// GET /api/donations/my
const getMyDonations = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const query = { donorId: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [donations, total] = await Promise.all([
      Donation.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Donation.countDocuments(query),
    ]);

    res.json({ success: true, count: donations.length, total, donations });
  } catch (err) {
    next(err);
  }
};

// ── Update donation ───────────────────────────────────────────────────────────
// PUT /api/donations/:id
const updateDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    const isOwner = donation.donorId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (donation.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Cannot update a non-available donation' });
    }

    const allowed = ['title', 'description', 'quantity', 'expiryTime', 'deliveryAllowed',
      'servings', 'allergens', 'isVegetarian', 'isVegan', 'clothingDetails'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) donation[f] = req.body[f]; });

    // Clothes cannot have expiryTime
    if (donation.type === 'clothes') donation.expiryTime = null;

    await donation.save();
    res.json({ success: true, message: 'Donation updated', donation });
  } catch (err) {
    next(err);
  }
};

// ── Cancel donation ───────────────────────────────────────────────────────────
// DELETE /api/donations/:id
const cancelDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });

    const isOwner = donation.donorId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    donation.status = 'cancelled';
    await donation.save();

    emit(req, 'donation_cancelled', { donationId: donation._id });
    res.json({ success: true, message: 'Donation cancelled' });
  } catch (err) {
    next(err);
  }
};

// ── Stats (admin) ─────────────────────────────────────────────────────────────
const getDonationStats = async (req, res, next) => {
  try {
    const [byStatus, byType, last7Days] = await Promise.all([
      Donation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Donation.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Donation.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 864e5) } }),
    ]);
    res.json({ success: true, byStatus, byType, last7Days });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDonation, getNearbyDonations, getMapDonations, getDonation,
  getMyDonations, updateDonation, cancelDonation, getDonationStats,
};
