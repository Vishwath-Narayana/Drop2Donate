const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    raterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true, // claimId or deliveryId
    },
    referenceType: {
      type: String,
      enum: ['claim', 'delivery'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      maxlength: [500, 'Feedback cannot exceed 500 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

ratingSchema.index({ ratedUserId: 1 });
ratingSchema.index({ referenceId: 1, referenceType: 1 });
ratingSchema.index({ raterId: 1, referenceId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
