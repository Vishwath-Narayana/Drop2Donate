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
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // ── Claim lifecycle ───────────────────────────────────────────────────────
    // pending → approved | rejected
    // approved → pickup_scheduled | delivery_requested
    // delivery_requested → delivery_assigned → picked → in_transit → completed
    // pickup_scheduled → completed
    status: {
      type: String,
      enum: [
        'pending',       // NGO sent request; awaiting donor approval
        'approved',      // Donor approved; NGO decides pickup or delivery
        'rejected',      // Donor rejected
        'pickup_pending',// NGO chose self-pickup; awaiting actual pickup
        'delivery_requested', // NGO requested delivery agent
        'delivery_assigned',  // Agent accepted
        'picked',        // Agent picked up
        'in_transit',    // En route to NGO
        'completed',     // Delivered / picked up
        'cancelled',     // Cancelled by either party
      ],
      default: 'pending',
    },
    // NGO's pickup choice (set after approval)
    pickupMethod: {
      type: String,
      enum: ['self', 'delivery', null],
      default: null,
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: '',
    },
    scheduledPickupTime: { type: Date, default: null },
    rating: {
      score: { type: Number, min: 1, max: 5, default: null },
      feedback: { type: String, default: '' },
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

claimSchema.index({ donationId: 1, ngoId: 1 }, { unique: true });
claimSchema.index({ ngoId: 1, status: 1 });
claimSchema.index({ donorId: 1, status: 1 });
claimSchema.index({ donationId: 1, status: 1 });

module.exports = mongoose.model('Claim', claimSchema);
