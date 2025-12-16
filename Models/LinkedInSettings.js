import mongoose from "mongoose";

/**
 * LinkedInSettings Model
 * User preferences for LinkedIn auto-posting
 */
const linkedinSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Auto-posting preferences
    autoPostEnabled: {
      type: Boolean,
      default: false,
    },

    defaultAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
    },

    // Caption settings
    captionTemplate: {
      type: String,
      default: "Check out our latest post! 🚀",
    },

    useAIGeneration: {
      type: Boolean,
      default: true,
    },

    includeHashtags: {
      type: Boolean,
      default: true,
    },

    maxHashtags: {
      type: Number,
      default: 5,
      min: 0,
      max: 10,
    },

    includeEmojis: {
      type: Boolean,
      default: true,
    },

    // Scheduling defaults
    defaultScheduleDelay: {
      type: Number, // Minutes
      default: 0, // Post immediately
      min: 0,
    },

    autoSchedule: {
      type: Boolean,
      default: false, // If true, auto-schedule instead of posting immediately
    },

    preferredPostTime: {
      hour: {
        type: Number,
        default: 10, // 10 AM
        min: 0,
        max: 23,
      },
      minute: {
        type: Number,
        default: 0,
        min: 0,
        max: 59,
      },
    },

    // Analytics preferences
    syncAnalytics: {
      type: Boolean,
      default: true,
    },

    analyticsSyncFrequency: {
      type: String,
      enum: ["hourly", "every6hours", "daily"],
      default: "every6hours",
    },

    // Notification preferences
    notifyOnPost: {
      type: Boolean,
      default: true,
    },

    notifyOnFail: {
      type: Boolean,
      default: true,
    },

    notifyOnAnalytics: {
      type: Boolean,
      default: false, // Don't spam with analytics updates
    },

    // Content preferences
    autoPostProducts: {
      type: Boolean,
      default: true,
    },

    autoPostBlogs: {
      type: Boolean,
      default: true,
    },

    autoPostLandingPages: {
      type: Boolean,
      default: false, // Usually landing pages shouldn't auto-post
    },

    // UTM tracking template
    utmCampaign: {
      type: String,
      default: "linkedin_autopost",
    },

    utmSource: {
      type: String,
      default: "linkedin",
    },

    utmMedium: {
      type: String,
      default: "social",
    },
  },
  { timestamps: true }
);

// Method to get complete UTM parameters
linkedinSettingsSchema.methods.getUTMParams = function () {
  return {
    utm_source: this.utmSource,
    utm_medium: this.utmMedium,
    utm_campaign: this.utmCampaign,
  };
};

// Method to build tracking URL
linkedinSettingsSchema.methods.buildTrackingUrl = function (baseUrl) {
  const utmParams = this.getUTMParams();
  const params = new URLSearchParams(utmParams);
  return `${baseUrl}?${params.toString()}`;
};

export default mongoose.model("LinkedInSettings", linkedinSettingsSchema);
