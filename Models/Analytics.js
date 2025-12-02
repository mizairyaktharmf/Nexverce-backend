import mongoose from "mongoose";

/* ===================================================================
   📊 ANALYTICS MODEL - Track Views & Clicks for Dashboard
   - Tracks every post view and affiliate click
   - Stores geolocation and device data
   - Used for real-time dashboard statistics
=================================================================== */

const analyticsSchema = new mongoose.Schema(
  {
    // 📝 POST REFERENCE
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true, // Index for faster queries
    },

    // 📊 EVENT TYPE
    type: {
      type: String,
      enum: ["view", "click"],
      required: true,
      index: true,
    },

    // 🌍 LOCATION DATA
    country: {
      type: String,
      default: "Unknown",
      index: true, // Index for country-based queries
    },

    countryCode: {
      type: String,
      default: "XX",
    },

    city: {
      type: String,
      default: "Unknown",
    },

    region: {
      type: String,
      default: "Unknown",
    },

    // 🌐 IP ADDRESS
    ip: {
      type: String,
      default: "Unknown",
    },

    // ⏰ TIMEZONE
    timezone: {
      type: String,
      default: "Unknown",
    },

    // 💻 DEVICE DATA
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop", "unknown"],
      default: "unknown",
      index: true, // Index for device-based queries
    },

    browser: {
      type: String,
      default: "Unknown",
    },

    os: {
      type: String,
      default: "Unknown",
    },

    // 📅 TIMESTAMP
    timestamp: {
      type: Date,
      default: Date.now,
      index: true, // Index for time-based queries
    },

    // 🔗 REFERRER (where the user came from)
    referrer: {
      type: String,
      default: "Direct",
    },

    // 👤 USER SESSION ID (optional - for tracking unique users)
    sessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// 🔍 COMPOUND INDEXES FOR COMPLEX QUERIES
analyticsSchema.index({ postId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ country: 1, timestamp: -1 });
analyticsSchema.index({ deviceType: 1, timestamp: -1 });
analyticsSchema.index({ timestamp: -1 }); // For recent analytics

// 📝 MODEL EXPORT
const Analytics = mongoose.model("Analytics", analyticsSchema);

export default Analytics;
