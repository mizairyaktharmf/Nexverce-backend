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
  // add more codes later if needed
};

/* =========================================================
   SIGNUP
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
   VERIFY EMAIL
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
   LOGIN  ⭐ WITH COUNTRY + TIMEZONE + IP + DEVICE
========================================================= */
export const login = async (req, res) => {
  try {
    // accept geolocation and device data from frontend
    const {
      email,
      password,
      timezone,
      city,
      country,
      countryCode,
      region,
      ip,
      browser,
      deviceType,
      loginTimeValidation,
    } = req.body;

    // DEBUG: Log incoming data
    console.log("🔍 Login Request Data:", {
      timezone,
      city,
      country,
      countryCode,
      region,
      ip,
      browser,
      deviceType,
    });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    // Check if user is suspended
    if (user.suspended) {
      return res
        .status(403)
        .json({
          message: "Your account has been suspended. Please contact admin.",
          suspended: true,
          suspendedReason: user.suspendedReason,
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    /* -----------------------------------------------------
       CHECK DAILY LOGIN LIMIT (1 login per day) - STAFF ONLY
       ⚠️ Admins are exempt from this restriction
    ----------------------------------------------------- */
    if (user.role === "staff") {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

      const todayLoginCount = await UserActivity.countDocuments({
        userId: user._id,
        loginTime: {
          $gte: today,
          $lt: tomorrow,
        },
      });

      if (todayLoginCount >= 1) {
        return res.status(403).json({
          message: "Daily login limit reached. You can only login once per day.",
          loginLimitReached: true,
        });
      }
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* -----------------------------------------------------
       1) CLOSE ANY PREVIOUS ACTIVE SESSION
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
       - Prioritize frontend data (more accurate)
       - Fallback to server-side detection
    ----------------------------------------------------- */

    // Get IP from frontend or server
    const finalIp =
      ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      "Unknown";

    // Use frontend geolocation data if available, otherwise fallback to geoip
    let finalCity = city || "Unknown";
    let finalCountry = country || "Unknown";
    let finalCountryCode = countryCode || "XX";
    let finalRegion = region || "Unknown";

    if (!city || !country) {
      const geo = finalIp ? geoip.lookup(finalIp) : null;
      if (geo) {
        finalCity = finalCity === "Unknown" ? geo.city || "Unknown" : finalCity;
        const rawCountryCode = geo.country || "XX";
        finalCountry =
          finalCountry === "Unknown"
            ? COUNTRY_NAMES[rawCountryCode] || rawCountryCode || "Unknown"
            : finalCountry;
        finalCountryCode =
          finalCountryCode === "XX" ? rawCountryCode : finalCountryCode;
      }
    }

    // Use frontend device data if available, otherwise parse user-agent
    let finalBrowser = browser || "Unknown";
    let finalDeviceType = deviceType || "Desktop";
    let finalOs = "Unknown";

    if (!browser || !deviceType) {
      const parser = new UAParser(req.headers["user-agent"]);
      const deviceInfo = parser.getResult();
      finalDeviceType =
        finalDeviceType === "Desktop"
          ? deviceInfo.device.type || "Desktop"
          : finalDeviceType;
      finalBrowser =
        finalBrowser === "Unknown"
          ? deviceInfo.browser.name || "Unknown"
          : finalBrowser;
      finalOs = deviceInfo.os.name || "Unknown";
    }

    // Use frontend timezone if available
    const finalTimezone = timezone || "Unknown";

    /* -----------------------------------------------------
       3) CREATE NEW LOGIN ACTIVITY RECORD
    ----------------------------------------------------- */
    // Only track early/late login for staff, not admins
    const isStaff = user.role === "staff";

    const activityData = {
      userId: user._id,
      loginTime: new Date(),
      logoutTime: null,
      lastSeen: new Date(),
      online: true,
      ip: finalIp,
      city: finalCity,
      country: finalCountry,
      countryCode: finalCountryCode,
      region: finalRegion,
      timezone: finalTimezone,
      browser: finalBrowser,
      deviceType: finalDeviceType,
      os: finalOs,
      // Login time validation (STAFF ONLY - admins exempt)
      isEarlyLogin: isStaff ? (loginTimeValidation?.isEarly || false) : false,
      isLateLogin: isStaff ? (loginTimeValidation?.isLate || false) : false,
      loginStatus: isStaff
        ? (loginTimeValidation?.isEarly
            ? "early"
            : loginTimeValidation?.isLate
            ? "late"
            : "normal")
        : "normal",
    };

    console.log("💾 Saving Activity Data:", activityData);

    await UserActivity.create(activityData);

    /* -----------------------------------------------------
       4) SEND RESPONSE
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
   LOGOUT
========================================================= */
export const logoutUser = async (req, res) => {
  try {
    // Accept userId from request body or use authenticated user
    const userId = req.body.userId || req.user.id;

    // Update User model lastSeen to mark as offline (set to 10 mins ago)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await User.findByIdAndUpdate(userId, {
      lastSeen: tenMinutesAgo
    });

    const result = await UserActivity.findOneAndUpdate(
      { userId: userId, online: true },
      {
        online: false,
        logoutTime: new Date(),
        lastSeen: new Date(),
      },
      { sort: { loginTime: -1 } } // Get most recent active session
    );

    if (result) {
      return res.json({
        success: true,
        message: "Logout tracked successfully",
      });
    }

    return res.json({
      success: false,
      message: "No active session found",
    });
  } catch (error) {
    console.log("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
