import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import { sendMail } from "../Utils/SendMail.js";

// Password rules: 8 chars, 1 uppercase, 1 number, 1 special char
const PASS_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/* -------------------------------------------------------
   📌 SIGNUP CONTROLLER
-------------------------------------------------------- */
export const signup = async (req, res) => {
  try {
    console.log("📥 Incoming signup request:", req.body);

    const { firstName, lastName, email, password, confirmPassword, role } = req.body;

    // 1. Validate fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 3. Password strength
    if (!PASS_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars with 1 uppercase, 1 number, and 1 special character",
      });
    }

    // 4. Check if email already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 5. Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 6. Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 7. Create user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashed,
      role: role || "admin",
      verified: false,
      verificationCode,
    });

    await newUser.save();

    // 8. Send verification email
    try {
      await sendMail(email, verificationCode);
      console.log("📧 Verification email sent to:", email);
    } catch (emailErr) {
      console.error("❌ Email sending failed:", emailErr);
      return res.status(500).json({
        message: "Signup successful but email could not be sent. Try again later.",
      });
    }

    // 9. Success response
    return res.status(201).json({
      message: "Signup successful! Check your email for the verification code.",
    });

  } catch (err) {
    console.error("❌ Signup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -------------------------------------------------------
   📌 VERIFY EMAIL CONTROLLER
-------------------------------------------------------- */
export const verifyEmail = async (req, res) => {
  try {
    console.log("📥 Incoming verify request:", req.body);

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.verified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark verified
    user.verified = true;
    user.verificationCode = null;
    await user.save();

    return res.json({ message: "Email verified successfully! You can now login." });

  } catch (err) {
    console.error("❌ Verify error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -------------------------------------------------------
   📌 LOGIN CONTROLLER
-------------------------------------------------------- */
export const login = async (req, res) => {
  try {
    console.log("📥 Incoming login request:", req.body.email);

    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    // Block unverified accounts
    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    // Compare password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
