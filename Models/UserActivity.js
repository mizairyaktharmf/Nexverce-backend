import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 📌 LOGIN / LOGOUT
    loginTime: {
      type: Date,
      default: Date.now,
    },
    logoutTime: {
      type: Date,
      default: null,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    online: {
      type: Boolean,
      default: true,
    },

    // 🌍 LOCATION DETAILS
    city: {
      type: String,
      default: "Unknown",
    },

    country: {
      type: String,
      default: "Unknown",
    },

    countryCode: {
      type: String,
      default: "XX",
    },

    region: {
      type: String,
      default: "Unknown",
    },

    ip: {
      type: String,
      default: "Unknown",
    },

    timezone: {
      type: String,
      default: "Unknown",
    },

    // 💻 DEVICE DETAILS
    browser: {
      type: String,
      default: "Unknown",
    },

    deviceType: {
      type: String,
      default: "Unknown",
    },

    os: {
      type: String,
      default: "Unknown",
    },

    // ⏰ LOGIN TIME VALIDATION
    isEarlyLogin: {
      type: Boolean,
      default: false,
    },

    isLateLogin: {
      type: Boolean,
      default: false,
    },

    loginStatus: {
      type: String,
      enum: ["early", "late", "normal"],
      default: "normal",
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserActivity", activitySchema);
