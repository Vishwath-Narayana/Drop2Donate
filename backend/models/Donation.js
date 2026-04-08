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
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        default: '',
      },
    },
    cookedAt: {
      type: Date,
      default: null, // relevant for food donations
    },
    expiryTime: {
      type: Date,
      required: [true, 'Expiry time is required'],
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'expired', 'cancelled'],
      default: 'available',
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    deliveryRequired: {
      type: Boolean,
      default: false,
    },
    servings: {
      type: Number,
      default: null, // number of people the food can serve
    },
    allergens: [
      {
        type: String,
        enum: ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish', 'none'],
      },
    ],
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    isVegan: {
      type: Boolean,
      default: false,
    },
    clothingDetails: {
      size: String,
      gender: { type: String, enum: ['men', 'women', 'kids', 'unisex', ''] },
      season: { type: String, enum: ['summer', 'winter', 'all-season', ''] },
      condition: { type: String, enum: ['new', 'like-new', 'good', 'fair', ''] },
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Geospatial index + status index for nearby available donations queries
donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1, expiryTime: 1 });
donationSchema.index({ donorId: 1, status: 1 });
donationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Donation', donationSchema);
