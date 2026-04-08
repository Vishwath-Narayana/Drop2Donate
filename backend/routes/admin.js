const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  verifyNGO,
  toggleUserActive,
  getAnalytics,
  getPendingNGOs,
  adminDeleteDonation,
  getAllDonations,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/verify', verifyNGO);
router.put('/users/:id/toggle-active', toggleUserActive);
router.get('/analytics', getAnalytics);
router.get('/ngos/pending', getPendingNGOs);
router.get('/donations', getAllDonations);
router.delete('/donations/:id', adminDeleteDonation);

module.exports = router;
