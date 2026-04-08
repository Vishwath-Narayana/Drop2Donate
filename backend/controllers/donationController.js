const Donation = require('../models/Donation');
const User = require('../models/User');

// @desc    Create donation
// @route   POST /api/donations
// @access  Private (donor)
const createDonation = async (req, res, next) => {
  try {
    const {
      title,
      type,
      description,
      quantity,
      location,
      cookedAt,
      expiryTime,
      deliveryRequired,
      servings,
      allergens,
      isVegetarian,
      isVegan,
      clothingDetails,
    } = req.body;

    // Handle uploaded images
    const images = req.files
      ? req.files.map((f) => ({ url: f.path, publicId: f.filename }))
      : [];

    const donation = await Donation.create({
      title,
      type,
      description,
      quantity: typeof quantity === 'string' ? JSON.parse(quantity) : quantity,
      donorId: req.user._id,
      location: typeof location === 'string' ? JSON.parse(location) : location,
      cookedAt: cookedAt || null,
      expiryTime,
      deliveryRequired: deliveryRequired === 'true' || deliveryRequired === true,
      servings: servings || null,
      allergens: allergens
        ? typeof allergens === 'string'
          ? JSON.parse(allergens)
          : allergens
        : [],
      isVegetarian: isVegetarian === 'true' || isVegetarian === true,
      isVegan: isVegan === 'true' || isVegan === true,
      clothingDetails: clothingDetails
        ? typeof clothingDetails === 'string'
          ? JSON.parse(clothingDetails)
          : clothingDetails
        : {},
      images,
    });

    await donation.populate('donorId', 'name email phone avatar');

    // Emit socket event to notify nearby NGOs
    const io = req.app.get('io');
    if (io) {
      io.emit('new_donation', {
        donation,
        message: `New ${type} donation available: ${title}`,
      });
    }

    res.status(201).json({ success: true, message: 'Donation created successfully', donation });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby donations (geo query)
// @route   GET /api/donations/nearby
// @access  Private
const getNearbyDonations = async (req, res, next) => {
  try {
    const {
      lng,
      lat,
      radius = 10000, // default 10km in meters
      type,
      page = 1,
      limit = 20,
    } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ success: false, message: 'Longitude and latitude are required' });
    }

    const query = {
      status: 'available',
      expiryTime: { $gt: new Date() },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    };

    if (type && ['food', 'clothes'].includes(type)) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate('donorId', 'name email phone avatar rating')
        .sort({ expiryTime: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Donation.countDocuments({ ...query, location: undefined, $and: [{ status: 'available' }, { expiryTime: { $gt: new Date() } }] }),
    ]);

    res.json({
      success: true,
      count: donations.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      donations,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all donations for map view
// @route   GET /api/donations/map
// @access  Private
const getMapDonations = async (req, res, next) => {
  try {
    const { lng, lat, radius = 25000 } = req.query;

    const query = {
      status: 'available',
      expiryTime: { $gt: new Date() },
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
      .select('title type location expiryTime status quantity donorId')
      .limit(100);

    res.json({ success: true, donations });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single donation
// @route   GET /api/donations/:id
// @access  Private
const getDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id).populate(
      'donorId',
      'name email phone avatar location rating'
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Increment view count
    await Donation.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ success: true, donation });
  } catch (err) {
    next(err);
  }
};

// @desc    Get donor's own donations
// @route   GET /api/donations/my
// @access  Private (donor)
const getMyDonations = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { donorId: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Donation.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: donations.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      donations,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update donation
// @route   PUT /api/donations/:id
// @access  Private (donor - own donations)
const updateDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.donorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this donation' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Cannot update a claimed or expired donation' });
    }

    const allowed = ['title', 'description', 'quantity', 'expiryTime', 'deliveryRequired', 'servings', 'allergens', 'isVegetarian', 'isVegan', 'clothingDetails'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) donation[field] = req.body[field];
    });

    await donation.save();
    res.json({ success: true, message: 'Donation updated', donation });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel donation
// @route   DELETE /api/donations/:id
// @access  Private (donor - own donations)
const cancelDonation = async (req, res, next) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.donorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    donation.status = 'cancelled';
    await donation.save();

    res.json({ success: true, message: 'Donation cancelled' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get donation statistics
// @route   GET /api/donations/stats
// @access  Private (admin)
const getDonationStats = async (req, res, next) => {
  try {
    const stats = await Donation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await Donation.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const last7Days = await Donation.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({ success: true, stats, byType, last7Days });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDonation,
  getNearbyDonations,
  getMapDonations,
  getDonation,
  getMyDonations,
  updateDonation,
  cancelDonation,
  getDonationStats,
};
