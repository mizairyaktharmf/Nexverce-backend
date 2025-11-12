import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import { sendMail } from "../Utils/SendMail.js"; // ⬅️ new utility we'll add below

// password: min 8, at least 1 uppercase, 1 number, 1 special
const PASS_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
// const COMPANY_EMAIL = /@nexverce\.com$/i;

export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role } =
      req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    if (!PASS_REGEX.test(password))
      return res.status(400).json({
        message:
          "Password must be 8+ chars with 1 uppercase, 1 number, 1 special char",
      });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);

    // 🔹 Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashed,
      role: role || "admin",
      verified: false,
      verificationCode,
    });
    await user.save();

    // 🔹 Send the verification email
    await sendMail(email, verificationCode);

    return res
      .status(201)
      .json({ message: "Signup successful! Check your email for the verification code." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ message: "Email and code are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.verified)
      return res.status(400).json({ message: "Account already verified" });

    if (user.verificationCode !== code)
      return res.status(400).json({ message: "Invalid verification code" });

    user.verified = true;
    user.verificationCode = null;
    await user.save();

    return res.json({ message: "Email verified successfully! You can now login." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // 🔹 Block unverified users
    if (!user.verified)
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

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
    return res.status(500).json({ message: err.message });
  }
};
