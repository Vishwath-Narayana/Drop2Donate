const express = require('express');
const router = express.Router();
const {
  createClaim,
  getMyClaims,
  getReceivedClaims,
  getClaim,
  updateClaimStatus,
  rateClaim,
} = require('../controllers/claimController');
const { protect, authorize, requireVerifiedNGO } = require('../middleware/auth');

router.post('/', protect, authorize('ngo'), requireVerifiedNGO, createClaim);
router.get('/my', protect, authorize('ngo'), getMyClaims);
router.get('/received', protect, authorize('donor'), getReceivedClaims);
router.get('/:id', protect, getClaim);
router.put('/:id/status', protect, authorize('donor', 'ngo', 'admin'), updateClaimStatus);
router.post('/:id/rate', protect, authorize('donor'), rateClaim);

module.exports = router;
