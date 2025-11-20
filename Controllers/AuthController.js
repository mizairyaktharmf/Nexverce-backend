import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import { sendMail } from "../Utils/SendMail.js";

const PASS_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/* =========================================================
   SIGNUP (Only @nexverce.com emails allowed)
========================================================= */
export const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role,
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Password strength
    if (!PASS_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters, include 1 uppercase, 1 number, 1 special character.",
      });
    }

    // 🛑 ALLOW ONLY COMPANY EMAILS
    if (!email.endsWith("@nexverce.com")) {
      return res.status(403).json({
        message: "Only @nexverce.com emails can register to the admin panel.",
      });
    }

    // Check existing user
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Assign role: only admin or staff
    const finalRole = role === "admin" ? "admin" : "staff";

    // Create user
    await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: finalRole,
      verified: false,
      verificationCode,
    });

    // Send email
    await sendMail(email, verificationCode);

    return res.status(201).json({
      message: "Account created. Verification code sent to your inbox.",
    });
  } catch (error) {
    console.log("Signup Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================================================
   VERIFY EMAIL
========================================================= */
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.verified)
      return res.status(400).json({ message: "Already verified" });

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    return res.json({ message: "Verification successful. You can login now." });
  } catch (error) {
    console.log("Verify Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================================================
   LOGIN
========================================================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
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
    console.log("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};