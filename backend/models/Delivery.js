const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deliveryAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pickupLocation: {
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
    dropLocation: {
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
    status: {
      type: String,
      enum: ['requested', 'accepted', 'picked', 'in_transit', 'delivered', 'cancelled'],
      default: 'requested',
    },
    agentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    estimatedDistance: {
      type: Number, // in km
      default: 0,
    },
    estimatedTime: {
      type: Number, // in minutes
      default: 0,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    statusTimestamps: {
      accepted: Date,
      picked: Date,
      in_transit: Date,
      delivered: Date,
      cancelled: Date,
    },
    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      feedback: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Geospatial indexes for finding nearby deliveries
deliverySchema.index({ pickupLocation: '2dsphere' });
deliverySchema.index({ dropLocation: '2dsphere' });
deliverySchema.index({ agentLocation: '2dsphere' });
deliverySchema.index({ status: 1, deliveryAgentId: 1 });
deliverySchema.index({ donorId: 1, status: 1 });
deliverySchema.index({ ngoId: 1, status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
