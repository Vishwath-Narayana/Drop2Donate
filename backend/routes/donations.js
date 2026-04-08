const express = require('express');
const router = express.Router();
const {
  createDonation,
  getNearbyDonations,
  getMapDonations,
  getDonation,
  getMyDonations,
  updateDonation,
  cancelDonation,
  getDonationStats,
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.get('/nearby', protect, getNearbyDonations);
router.get('/map', protect, getMapDonations);
router.get('/my', protect, authorize('donor'), getMyDonations);
router.get('/stats', protect, authorize('admin'), getDonationStats);
router.post('/', protect, authorize('donor'), upload.array('images', 5), createDonation);
router.get('/:id', protect, getDonation);
router.put('/:id', protect, authorize('donor', 'admin'), updateDonation);
router.delete('/:id', protect, authorize('donor', 'admin'), cancelDonation);

module.exports = router;
