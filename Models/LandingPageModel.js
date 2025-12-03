// Models/LandingPageModel.js
import mongoose from "mongoose";

const landingPageSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Landing page title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Marketing", "Education", "Finance", "Technology", "Health", "Lifestyle", "Other"],
    },

    // SEO & Meta Data
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    metaImage: {
      type: String,
      default: "/images/default-og-image.png",
    },
    metaKeywords: {
      type: [String],
      default: [],
    },

    // Campaign Information
    campaign: {
      name: {
        type: String,
        trim: true,
      },
      source: {
        type: String,
        enum: ["Meta Ads", "Google Ads", "LinkedIn Ads", "Twitter Ads", "Email", "Direct", "Other"],
        default: "Direct",
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      budget: {
        type: Number,
        default: 0,
      },
      targetUrl: {
        type: String,
        trim: true,
      },
    },

    // Design Settings
    design: {
      hideHeader: {
        type: Boolean,
        default: true,
      },
      hideFooter: {
        type: Boolean,
        default: true,
      },
      backgroundColor: {
        type: String,
        default: "#ffffff",
      },
      primaryColor: {
        type: String,
        default: "#4f46e5",
      },
      secondaryColor: {
        type: String,
        default: "#10b981",
      },
      textColor: {
        type: String,
        default: "#111827",
      },
      fontFamily: {
        type: String,
        enum: ["Inter", "Poppins", "Roboto", "Open Sans", "Lato"],
        default: "Inter",
      },
    },

    // Tracking & Analytics
    tracking: {
      metaPixelId: {
        type: String,
        trim: true,
      },
      googleAnalyticsId: {
        type: String,
        trim: true,
      },
      googleTagManagerId: {
        type: String,
        trim: true,
      },
      customTrackingCode: {
        type: String,
      },
      conversionGoal: {
        type: String,
        enum: ["Lead Capture", "Product Purchase", "Sign Up", "Download", "Other"],
        default: "Lead Capture",
      },
    },

    // Content Blocks (reusing your existing block editor)
    contentBlocks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // Lead Capture Settings
    leadCapture: {
      enabled: {
        type: Boolean,
        default: true,
      },
      formTitle: {
        type: String,
        default: "Get Started Today!",
      },
      formDescription: {
        type: String,
        default: "Fill out the form below to learn more.",
      },
      fields: {
        type: [String],
        enum: ["name", "email", "phone", "company", "message"],
        default: ["name", "email"],
      },
      buttonText: {
        type: String,
        default: "Submit",
      },
      successMessage: {
        type: String,
        default: "Thank you! We'll be in touch soon.",
      },
      redirectUrl: {
        type: String,
        trim: true,
      },
      emailNotification: {
        type: String,
        trim: true,
      },
    },

    // Analytics Data
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      uniqueVisitors: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      conversions: {
        type: Number,
        default: 0,
      },
      conversionRate: {
        type: Number,
        default: 0,
      },
      bounceRate: {
        type: Number,
        default: 0,
      },
      avgTimeOnPage: {
        type: Number,
        default: 0,
      },
      revenue: {
        type: Number,
        default: 0,
      },
    },

    // Status & Publishing
    status: {
      type: String,
      enum: ["draft", "active", "paused", "ended"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
    },
    pausedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },

    // Template Information
    templateUsed: {
      type: String,
      enum: ["blank", "lead-gen", "product-launch", "webinar", "free-trial", "special-offer"],
      default: "blank",
    },

    // A/B Testing
    abTest: {
      enabled: {
        type: Boolean,
        default: false,
      },
      variantId: {
        type: String,
      },
      trafficSplit: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
      },
    },

    // User & Team
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    team: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    // Additional Settings
    settings: {
      showSocialShare: {
        type: Boolean,
        default: false,
      },
      enableComments: {
        type: Boolean,
        default: false,
      },
      passwordProtected: {
        type: Boolean,
        default: false,
      },
      password: {
        type: String,
      },
      expiryDate: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
landingPageSchema.index({ slug: 1 });
landingPageSchema.index({ category: 1 });
landingPageSchema.index({ status: 1 });
landingPageSchema.index({ createdBy: 1 });
landingPageSchema.index({ "campaign.source": 1 });
landingPageSchema.index({ createdAt: -1 });

// Virtual for full URL
landingPageSchema.virtual("url").get(function () {
  return `/lp/${this.slug}`;
});

// Method to increment views
landingPageSchema.methods.incrementView = async function () {
  this.analytics.views += 1;
  await this.save();
};

// Method to track conversion
landingPageSchema.methods.trackConversion = async function () {
  this.analytics.conversions += 1;
  this.analytics.conversionRate = (this.analytics.conversions / this.analytics.views) * 100;
  await this.save();
};

// Pre-save middleware to calculate conversion rate
landingPageSchema.pre("save", function (next) {
  if (this.analytics.views > 0) {
    this.analytics.conversionRate = (this.analytics.conversions / this.analytics.views) * 100;
  }
  next();
});

// Static method to get active landing pages
landingPageSchema.statics.getActiveLandingPages = function () {
  return this.find({ status: "active" }).sort({ createdAt: -1 });
};

// Static method to get landing pages by category
landingPageSchema.statics.getByCategory = function (category) {
  return this.find({ category, status: "active" }).sort({ createdAt: -1 });
};

const LandingPage = mongoose.model("LandingPage", landingPageSchema);

export default LandingPage;