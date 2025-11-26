// Controllers/AuthController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import UserActivity from "../Models/UserActivity.js";

import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";

import { sendMail } from "../Utils/SendMail.js";

const PASS_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

// Optional: map ISO country codes → full names
const COUNTRY_NAMES = {
  AE: "United Arab Emirates",
  LK: "Sri Lanka",
  IN: "India",
  UK: "United Kingdom",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  // add more codes here later if you want
};

/* =========================================================
   SIGNUP  (same as before)
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

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!PASS_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters, include 1 uppercase, 1 number, 1 special character.",
      });
    }

    if (!email.endsWith("@nexverce.com")) {
      return res.status(403).json({
        message: "Only @nexverce.com emails can register to the admin panel.",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const finalRole = role === "admin" ? "admin" : "staff";

    await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: finalRole,
      verified: false,
      verificationCode,
    });

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
   VERIFY EMAIL  (same as before)
========================================================= */
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

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
   LOGIN  ⭐ with IP + country + device + timezone + session close
========================================================= */
export const login = async (req, res) => {
  try {
    // ⬅️ also accept timezone from frontend
    const { email, password, timezone } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* -----------------------------------------------------
       1) CLOSE ANY PREVIOUS "ONLINE" SESSIONS
    ----------------------------------------------------- */
    await UserActivity.updateMany(
      { userId: user._id, online: true },
      {
        online: false,
        logoutTime: new Date(),
        lastSeen: new Date(),
      }
    );

    /* -----------------------------------------------------
       2) COLLECT IP, LOCATION, DEVICE, TIMEZONE
    ----------------------------------------------------- */

    // IP (behind proxies etc.)
    const ip =
      (req.headers["x-forwarded-for"] &&
        req.headers["x-forwarded-for"].split(",")[0]) ||
      req.socket?.remoteAddress ||
      "Unknown";

    // Geo by IP
    const geo = ip ? geoip.lookup(ip) : null;
    const rawCountryCode = geo?.country || "Unknown";
    const country =
      COUNTRY_NAMES[rawCountryCode] || rawCountryCode || "Unknown";
    const city = geo?.city || "Unknown";

    // Device info from User-Agent
    const parser = new UAParser(req.headers["user-agent"]);
    const deviceInfo = parser.getResult();

    const deviceType = deviceInfo.device.type || "Desktop";
    const os = deviceInfo.os.name || "Unknown OS";
    const browser = deviceInfo.browser.name || "Unknown Browser";

    // Timezone – prefer client-sent, otherwise fallback to server tz
    let clientTimezone = "Unknown";
    if (timezone) {
      clientTimezone = timezone;
    } else {
      try {
        clientTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
      } catch {
        clientTimezone = "Unknown";
      }
    }

    /* -----------------------------------------------------
       3) CREATE NEW LOGIN ACTIVITY
    ----------------------------------------------------- */
    await UserActivity.create({
      userId: user._id,
      loginTime: new Date(),
      logoutTime: null,
      lastSeen: new Date(),
      online: true,
      ip,
      country,
      city,
      deviceType,
      os,
      browser,
      timezone: clientTimezone,
    });

    /* -----------------------------------------------------
       4) NORMAL LOGIN RESPONSE
    ----------------------------------------------------- */
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        verified: user.verified,
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

/* =========================================================
   LOGOUT  ⭐ marks current session as offline
========================================================= */
export const logoutUser = async (req, res) => {
  try {
    // req.user is set in AuthMiddleware.verifyToken
    await UserActivity.findOneAndUpdate(
      { userId: req.user.id, online: true },
      {
        online: false,
        logoutTime: new Date(),
        lastSeen: new Date(),
      }
    );

    return res.json({ message: "Logout successful" });
  } catch (error) {
    console.log("Logout Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
