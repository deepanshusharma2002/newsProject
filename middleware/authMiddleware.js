// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// exports.protect = async (req, res, next) => {
//   let token = req.headers.authorization?.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ message: 'Not authorized, no token' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findOne({ _id: decoded.id, isVerified: true });
//     if (!user) {
//       return res.status(401).json({ message: 'User not Verified' });
//     }

//     req.user = {
//       id: user._id,
//       role: user.role || 'user'
//     };
//     console.log('User verified:', req.user.id, 'Role:', req.user.role);
//     next();
//   } catch (error) {
//     res.status(401).json({ message: 'Users not Verified' });
//   }
// };
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user in DB (must be verified)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isVerified) {
      return res.status(401).json({ message: "User not Verified" });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      role: user.role || "user",
    };

    console.log("User verified:", req.user.id, "Role:", req.user.role);
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    res.status(401).json({ message: "User not Verified" });
  }
};
