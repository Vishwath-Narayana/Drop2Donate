const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    deliveryRequired: {
      type: Boolean,
      default: false,
    },
    deliveryStatus: {
      type: String,
      enum: ['not_required', 'requested', 'assigned', 'picked', 'in_transit', 'delivered'],
      default: 'not_required',
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: '',
    },
    scheduledPickupTime: {
      type: Date,
      default: null,
    },
    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      feedback: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

claimSchema.index({ donationId: 1, ngoId: 1 }, { unique: true });
claimSchema.index({ ngoId: 1, status: 1 });
claimSchema.index({ donationId: 1, status: 1 });

module.exports = mongoose.model('Claim', claimSchema);
