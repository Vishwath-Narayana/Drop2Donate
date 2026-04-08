const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const validate = require('../middleware/validate');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['donor', 'ngo', 'delivery'])
    .withMessage('Role must be donor, ngo, or delivery'),
];

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, location } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      location: location || { type: 'Point', coordinates: [0, 0] },
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        location: user.location,
        avatar: user.avatar,
        isAvailable: user.isAvailable,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        location: user.location,
        avatar: user.avatar,
        isAvailable: user.isAvailable,
        rating: user.rating,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, location, isAvailable, avatar } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (location) updates.location = location;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, message: 'Password updated successfully', token });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/auth/notifications/read
// @access  Private
const markNotificationsRead = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'notifications.$[].read': true },
    });
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  updateProfile,
  updatePassword,
  markNotificationsRead,
};
