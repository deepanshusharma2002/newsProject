const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, isVerified: true });

    if (!user) {
      return res.status(401).json({ message: 'User not Verified' });
    }

    req.body.user_id = user._id;
    req.body.role = user.role || "user";
    next();
  } catch (error) {
    res.status(401).json({ message: 'User not Verified' });
  }
};