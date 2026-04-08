const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ['food', 'clothes'],
      required: [true, 'Donation type is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    quantity: {
      amount: { type: Number, required: true, min: 1 },
      unit: {
        type: String,
        enum: ['kg', 'g', 'liters', 'pieces', 'boxes', 'bags', 'portions'],
        default: 'pieces',
      },
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
      address: { type: String, default: '' },
    },

    // ── Food-only fields ──────────────────────────────────────────────────────
    cookedAt: { type: Date, default: null },
    // expiryTime is ONLY required for food; clothes have no expiry
    expiryTime: { type: Date, default: null },

    // ── Status lifecycle ──────────────────────────────────────────────────────
    // available → claimed → completed | cancelled | expired (food-only)
    status: {
      type: String,
      enum: ['available', 'claimed', 'completed', 'expired', 'cancelled'],
      default: 'available',
    },

    // ── Delivery settings (set by donor at post time) ─────────────────────────
    // deliveryAllowed: can an NGO request a delivery agent?
    deliveryAllowed: { type: Boolean, default: true },

    images: [{ url: String, publicId: String }],

    // ── Food metadata ─────────────────────────────────────────────────────────
    servings: { type: Number, default: null },
    allergens: [
      {
        type: String,
        enum: ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish'],
      },
    ],
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },

    // ── Clothes metadata ──────────────────────────────────────────────────────
    clothingDetails: {
      size: String,
      gender: { type: String, enum: ['men', 'women', 'kids', 'unisex', ''], default: '' },
      season: { type: String, enum: ['summer', 'winter', 'all-season', ''], default: '' },
      condition: { type: String, enum: ['new', 'like-new', 'good', 'fair', ''], default: '' },
    },

    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1, type: 1 });
donationSchema.index({ status: 1, expiryTime: 1 }); // food expiry queries
donationSchema.index({ donorId: 1, status: 1 });

// Virtual: expired for food donations only
donationSchema.virtual('isExpired').get(function () {
  if (this.type !== 'food' || !this.expiryTime) return false;
  return new Date(this.expiryTime) < new Date();
});

module.exports = mongoose.model('Donation', donationSchema);
