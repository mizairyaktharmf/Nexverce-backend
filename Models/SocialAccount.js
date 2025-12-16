import mongoose from "mongoose";

/**
 * SocialAccount Model
 * Stores OAuth tokens and account info for social media platforms
 * Currently supports: LinkedIn (expandable to Twitter, Facebook, etc.)
 */
const socialAccountSchema = new mongoose.Schema(
  {
    // Link to Nexverce user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Platform info
    platform: {
      type: String,
      enum: ["linkedin", "twitter", "facebook", "instagram"],
      required: true,
      index: true,
    },

    accountType: {
      type: String,
      enum: ["personal", "company"],
      default: "personal",
    },

    // OAuth Tokens (encrypted in production)
    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true, // For checking expiry
    },

    // LinkedIn specific fields
    linkedinUserId: {
      type: String, // URN format: urn:li:person:XXXX
      index: true,
    },

    linkedinOrgId: {
      type: String, // URN format for company pages
    },

    // Account details
    accountName: {
      type: String,
    },

    accountEmail: {
      type: String,
    },

    profileImageUrl: {
      type: String,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    // Permissions/scopes granted
    scopes: {
      type: [String],
      default: [],
    },

    // Error tracking
    lastError: {
      type: String,
    },

    errorCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
socialAccountSchema.index({ userId: 1, platform: 1, isActive: 1 });
socialAccountSchema.index({ platform: 1, expiresAt: 1 }); // For token refresh

// Virtual for checking if token is expired
socialAccountSchema.virtual("isTokenExpired").get(function () {
  return new Date(this.expiresAt) <= new Date();
});

// Method to check if token needs refresh (expires in < 24 hours)
socialAccountSchema.methods.needsRefresh = function () {
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Date(this.expiresAt) <= oneDayFromNow;
};

export default mongoose.model("SocialAccount", socialAccountSchema);
