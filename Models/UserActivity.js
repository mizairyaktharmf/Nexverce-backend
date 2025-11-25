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
    country: {
      type: String,
      default: "Unknown",
    },

    ipAddress: {
      type: String,
      default: "",
    },

    timezoneOffset: {
      type: Number, // e.g. Dubai = +240, SL = +330
      default: 0,
    },

    // 💻 DEVICE DETAILS
    deviceInfo: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserActivity", activitySchema);
