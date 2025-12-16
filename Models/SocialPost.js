import mongoose from "mongoose";

/**
 * SocialPost Model
 * Tracks every post made to social media platforms from Nexverce
 * Links to Nexverce content (Product, Blog, LandingPage)
 */
const socialPostSchema = new mongoose.Schema(
  {
    // Link to Nexverce content
    nexvercePostId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    nexvercePostType: {
      type: String,
      enum: ["product", "blog", "landingpage"],
      required: true,
    },

    // Social platform info
    platform: {
      type: String,
      enum: ["linkedin", "twitter", "facebook", "instagram"],
      required: true,
      index: true,
    },

    socialAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
      index: true,
    },

    // Post content
    caption: {
      type: String,
      required: true,
      maxlength: 3000, // LinkedIn max caption length
    },

    rawCaption: {
      type: String, // Caption without URL and hashtags (for editing)
    },

    imageUrl: {
      type: String,
    },

    targetUrl: {
      type: String, // Nexverce post URL with UTM tracking
      required: true,
    },

    hashtags: {
      type: [String],
      default: [],
    },

    // Scheduling
    scheduledAt: {
      type: Date,
      index: true,
    },

    postedAt: {
      type: Date,
      index: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["draft", "scheduled", "posting", "posted", "failed"],
      default: "draft",
      index: true,
    },

    errorMessage: {
      type: String,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    maxRetries: {
      type: Number,
      default: 3,
    },

    // Platform-specific response data
    linkedinPostId: {
      type: String, // URN format: urn:li:share:XXXX
      index: true,
    },

    linkedinPostUrl: {
      type: String, // Public LinkedIn post URL
    },

    // Analytics (synced periodically from LinkedIn)
    analytics: {
      impressions: {
        type: Number,
        default: 0,
      },
      likes: {
        type: Number,
        default: 0,
      },
      comments: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      engagementRate: {
        type: Number,
        default: 0,
      },
      lastSyncedAt: {
        type: Date,
      },
    },

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Metadata
    metadata: {
      captionGeneratedByAI: {
        type: Boolean,
        default: false,
      },
      postMode: {
        type: String,
        enum: ["auto", "manual"],
        default: "auto",
      },
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
socialPostSchema.index({ nexvercePostId: 1, platform: 1 });
socialPostSchema.index({ status: 1, scheduledAt: 1 }); // For cron job scheduler
socialPostSchema.index({ createdBy: 1, createdAt: -1 }); // For user's post history
socialPostSchema.index({ platform: 1, status: 1, postedAt: -1 }); // For analytics

// Virtual to check if post can be retried
socialPostSchema.virtual("canRetry").get(function () {
  return this.status === "failed" && this.retryCount < this.maxRetries;
});

// Virtual to get total engagement
socialPostSchema.virtual("totalEngagement").get(function () {
  return (
    this.analytics.likes +
    this.analytics.comments +
    this.analytics.shares
  );
});

// Method to calculate engagement rate
socialPostSchema.methods.calculateEngagementRate = function () {
  if (this.analytics.impressions === 0) {
    return 0;
  }
  const engagements = this.totalEngagement;
  return ((engagements / this.analytics.impressions) * 100).toFixed(2);
};

// Method to mark as posted
socialPostSchema.methods.markAsPosted = function (linkedinData) {
  this.status = "posted";
  this.postedAt = new Date();
  this.linkedinPostId = linkedinData.postId;
  this.linkedinPostUrl = linkedinData.postUrl;
  this.errorMessage = undefined;
  return this.save();
};

// Method to mark as failed
socialPostSchema.methods.markAsFailed = function (errorMsg) {
  this.status = "failed";
  this.errorMessage = errorMsg;
  this.retryCount += 1;
  return this.save();
};

export default mongoose.model("SocialPost", socialPostSchema);
