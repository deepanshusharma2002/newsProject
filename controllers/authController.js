const User = require("../models/User");
const jwt = require("jsonwebtoken");
const LoginWithOtpModel = require("../models/LoginWithOtpModel");
const { transporter } = require("..");

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    user = new User({
      email,
      password,
      otp,
      otpExpires,
    });

    await user.save();

    // Send OTP email
    const mailOptions = {
      from: "auth@example.com",
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "OTP sent to email. Please verify." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp, type } = req.body;

  try {
    if (type?.toLowerCase() === "login") {
      const user = await User.findOne({ email });
      const Lwo = await LoginWithOtpModel.findOne({ email });
      if (!Lwo && !user) {
        return res.status(400).json({ message: "User or otp request not found" });
      }

      if (Lwo.isVerified) {
        return res.status(400).json({ message: "User already verified" });
      }

      if (Lwo.otp !== otp || Lwo.otpExpires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      await LoginWithOtpModel.deleteMany({ email });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(200).json({ message: "Login successful", token });
    } else {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "User already verified" });
      }

      if (user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(200).json({ message: "User verified successfully", token });
    }

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password, type } = req.body;

  try {
    if (type?.toLowerCase() === "otp") {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      if (!user?.isVerified) {
        return res.status(400).json({ message: "User Not Verified" });
      }

      if (!user.isVerified && !otp) {
        return res
          .status(400)
          .json({ message: "Please fill email and otp" });
      }

      const otp = generateOTP();
      const otpExpires = Date.now() + 10 * 60 * 1000;

      const checkRequest = await LoginWithOtpModel.findOne({ email });

      if (checkRequest) {
        const otp = generateOTP();
        const otpExpires = Date.now() + 10 * 60 * 1000;


        checkRequest.otp = otp;
        checkRequest.otpExpires = undeotpExpiresfined;

        await checkRequest.save();

        // Send OTP email
        const mailOptions = {
          from: "auth@example.com",
          to: email,
          subject: "Your OTP Code",
          text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: "OTP sent to email. Please verify." });
      } else {

        const Lwo = new LoginWithOtpModel({
          email,
          otp,
          otpExpires,
          isVerified: false
        });

        await Lwo.save();

        // Send OTP email
        const mailOptions = {
          from: "auth@example.com",
          to: email,
          subject: "Your OTP Code",
          text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: "OTP sent to email. Please verify." });
      }
    } else {
      const user = await User.findOne({ email, isVerified: true });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      if (!user.isVerified) {
        return res
          .status(400)
          .json({ message: "Please verify your email first" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(200).json({ message: "Login successful", token });
    }

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }

    const resetOTP = generateOTP();
    const resetPasswordExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    user.resetPasswordOTP = resetOTP;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Send reset OTP email
    const mailOptions = {
      from: "auth@example.com",
      to: email,
      subject: "Your Password Reset OTP",
      text: `Your password reset OTP is ${resetOTP}. It is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (
      user.resetPasswordOTP !== otp ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
