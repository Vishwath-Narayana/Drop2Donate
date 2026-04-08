const cron = require('node-cron');
const Donation = require('../models/Donation');
const Claim = require('../models/Claim');

/**
 * Expiry service: runs every 5 minutes to mark donations as expired
 * and cancel pending claims on expired donations.
 */
const startExpiryJob = (io) => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Find and expire overdue available donations
      const expiredDonations = await Donation.find({
        status: 'available',
        expiryTime: { $lte: now },
      });

      if (expiredDonations.length > 0) {
        const expiredIds = expiredDonations.map((d) => d._id);

        await Donation.updateMany(
          { _id: { $in: expiredIds } },
          { status: 'expired' }
        );

        // Cancel pending claims on expired donations
        await Claim.updateMany(
          { donationId: { $in: expiredIds }, status: 'pending' },
          { status: 'cancelled' }
        );

        // Broadcast expiry events
        if (io) {
          expiredDonations.forEach((donation) => {
            io.emit('donation_expired', {
              donationId: donation._id,
              title: donation.title,
              message: `Donation "${donation.title}" has expired`,
            });
          });
        }

        console.log(`[ExpiryJob] Marked ${expiredDonations.length} donation(s) as expired`);
      }
    } catch (err) {
      console.error('[ExpiryJob] Error:', err.message);
    }
  });

  console.log('[ExpiryJob] Expiry scheduler started (every 5 minutes)');
};

module.exports = { startExpiryJob };
