const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, isVerified: true });
    if (!user) {
      return res.status(401).json({ message: 'User not Verified' });
    }

    req.user = {
      id: user._id,
      role: user.role || 'user'
    };
    console.log('User verified:', req.user.id, 'Role:', req.user.role);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Users not Verified' });
  }
};