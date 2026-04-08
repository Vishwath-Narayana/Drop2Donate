const express = require('express');
const router = express.Router();
const {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  updateProfile,
  updatePassword,
  markNotificationsRead,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.put('/notifications/read', protect, markNotificationsRead);

module.exports = router;
