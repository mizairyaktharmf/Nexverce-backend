import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import { sendMail } from "../Utils/SendMail.js";

// Password validation: 8 chars, 1 uppercase, 1 number, 1 special char
const PASS_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/* =========================================================
   📌 ROLE MAPPER (Your New System)
========================================================= */
const mapRole = (role) => {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  return "staff"; // all other titles become staff
};

/* =========================================================
   📌 SIGNUP CONTROLLER
========================================================= */
export const signup = async (req, res) => {
  try {
    console.log("📥 Signup Request:", req.body);

    const { firstName, lastName, email, password, confirmPassword, role } =
      req.body;

    // Validate inputs
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Validate password strength
    if (!PASS_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters with 1 uppercase, 1 number and 1 special character.",
      });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // NEW ROLE SYSTEM APPLIED HERE
    const finalRole = mapRole(role);

    // Create user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: finalRole,
      verified: false,
      verificationCode,
    });

    await newUser.save();

    // Send verification email
    try {
      await sendMail(email, verificationCode);
      console.log("📧 Verification email sent to:", email);
    } catch (emailErr) {
      console.error("❌ Failed to send verification email:", emailErr);
      return res.status(500).json({
        message: "Account created but email failed. Try again later.",
      });
    }

    return res.status(201).json({
      message:
        "Signup successful! Please check your email for the verification code.",
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================================================
   📌 VERIFY EMAIL CONTROLLER
========================================================= */
export const verifyEmail = async (req, res) => {
  try {
    console.log("📥 Verify Email Request:", req.body);

    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ message: "Email and verification code are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.verified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // verify
    user.verified = true;
    user.verificationCode = null;
    await user.save();

    return res.json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("❌ Email Verification Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================================================
   📌 LOGIN CONTROLLER
========================================================= */
export const login = async (req, res) => {
  try {
    console.log("📥 Login Request:", req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send response
    return res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,

        profileImage: user.profileImage,
        mobile: user.mobile,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
