const cron     = require('node-cron');
const Donation = require('../models/Donation');
const Claim    = require('../models/Claim');

/**
 * Runs every 5 minutes.
 * Marks overdue FOOD donations as expired (clothes never expire).
 * Cancels pending claims on expired food.
 */
const startExpiryJob = (io) => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      const expired = await Donation.find({
        type:       'food',
        status:     'available',
        expiryTime: { $lte: now },
      }).select('_id title');

      if (expired.length === 0) return;

      const ids = expired.map((d) => d._id);

      await Donation.updateMany({ _id: { $in: ids } }, { status: 'expired' });
      await Claim.updateMany(
        { donationId: { $in: ids }, status: 'pending' },
        { status: 'cancelled' }
      );

      if (io) {
        expired.forEach((d) => {
          io.emit('donation_expired', { donationId: d._id, title: d.title });
        });
      }

      console.log(`[ExpiryJob] Expired ${expired.length} food donation(s)`);
    } catch (err) {
      console.error('[ExpiryJob]', err.message);
    }
  });

  console.log('[ExpiryJob] Food expiry scheduler started (every 5 min)');
};

module.exports = { startExpiryJob };
