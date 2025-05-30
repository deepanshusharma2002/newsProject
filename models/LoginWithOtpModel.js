const mongoose = require('mongoose');

const LWOSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  otp: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otpExpires: {
    type: Date,
  },
});


module.exports = mongoose.model('LoginWithOtp', LWOSchema);