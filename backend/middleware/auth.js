const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    // Update last active
    req.user.lastActive = Date.now();
    await User.findByIdAndUpdate(decoded.id, { lastActive: Date.now() });

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Ensure NGO is verified before performing actions
const requireVerifiedNGO = (req, res, next) => {
  if (req.user.role === 'ngo' && !req.user.verified) {
    return res.status(403).json({
      success: false,
      message: 'Your NGO account must be verified by admin before you can perform this action',
    });
  }
  next();
};

module.exports = { protect, authorize, requireVerifiedNGO };
