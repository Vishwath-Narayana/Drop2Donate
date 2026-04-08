const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    claimId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Claim',    required: true },
    donorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    ngoId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    deliveryAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
      address: { type: String, default: '' },
    },
    dropLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, default: '' },
    },

    // Live agent location (updated via socket)
    agentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // ── Status lifecycle ──────────────────────────────────────────────────────
    // requested → accepted → picked → in_transit → delivered | cancelled
    status: {
      type: String,
      enum: ['requested', 'accepted', 'picked', 'in_transit', 'delivered', 'cancelled'],
      default: 'requested',
    },

    statusTimestamps: {
      accepted:   { type: Date, default: null },
      picked:     { type: Date, default: null },
      in_transit: { type: Date, default: null },
      delivered:  { type: Date, default: null },
      cancelled:  { type: Date, default: null },
    },

    notes:             { type: String, maxlength: 500, default: '' },
    estimatedDistance: { type: Number, default: 0 }, // km
    estimatedTime:     { type: Number, default: 0 }, // minutes

    rating: {
      score:    { type: Number, min: 1, max: 5, default: null },
      feedback: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

deliverySchema.index({ pickupLocation: '2dsphere' });
deliverySchema.index({ dropLocation:   '2dsphere' });
deliverySchema.index({ agentLocation:  '2dsphere' });
deliverySchema.index({ status: 1, deliveryAgentId: 1 });
deliverySchema.index({ claimId: 1 }, { unique: true });

module.exports = mongoose.model('Delivery', deliverySchema);
