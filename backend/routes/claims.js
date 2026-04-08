const express = require('express');
const router = express.Router();
const {
  createClaim, respondToClaim, choosePickupMethod, confirmPickup,
  cancelClaim, getMyClaims, getReceivedClaims, getClaim, rateClaim,
} = require('../controllers/claimController');
const { protect, authorize, requireVerifiedNGO } = require('../middleware/auth');

// NGO: send claim request
router.post('/', protect, authorize('ngo'), requireVerifiedNGO, createClaim);

// Donor: approve or reject
router.put('/:id/respond', protect, authorize('donor'), respondToClaim);

// NGO: choose pickup method (self / delivery)
router.put('/:id/pickup-method', protect, authorize('ngo'), choosePickupMethod);

// NGO: confirm self-pickup completion
router.put('/:id/confirm-pickup', protect, authorize('ngo'), confirmPickup);

// NGO or donor: cancel
router.put('/:id/cancel', protect, authorize('ngo', 'donor', 'admin'), cancelClaim);

// List views
router.get('/my',       protect, authorize('ngo'),   getMyClaims);
router.get('/received', protect, authorize('donor'),  getReceivedClaims);
router.get('/:id',      protect, getClaim);

// Rating
router.post('/:id/rate', protect, authorize('donor'), rateClaim);

module.exports = router;
