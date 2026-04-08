const express = require('express');
const router = express.Router();
const {
  requestDelivery,
  getNearbyDeliveries,
  acceptDelivery,
  updateDeliveryStatus,
  updateAgentLocation,
  getMyDeliveries,
  getDelivery,
  rateDelivery,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');

router.post('/request', protect, authorize('ngo'), requestDelivery);
router.get('/nearby', protect, authorize('delivery'), getNearbyDeliveries);
router.get('/my', protect, authorize('delivery'), getMyDeliveries);
router.post('/accept/:id', protect, authorize('delivery'), acceptDelivery);
router.put('/status/:id', protect, authorize('delivery'), updateDeliveryStatus);
router.put('/location/:id', protect, authorize('delivery'), updateAgentLocation);
router.get('/:id', protect, getDelivery);
router.post('/:id/rate', protect, authorize('ngo'), rateDelivery);

module.exports = router;
