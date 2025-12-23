// Models/NewsletterModel.js
import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    status: {
      type: String,
      enum: ["active", "unsubscribed"],
      default: "active",
    },
    source: {
      type: String,
      enum: ["website", "landing-page", "blog", "manual"],
      default: "website",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ createdAt: -1 });

// Static method to get active subscribers count
newsletterSchema.statics.getActiveCount = function () {
  return this.countDocuments({ status: "active" });
};

// Static method to get recent subscribers
newsletterSchema.statics.getRecentSubscribers = function (limit = 10) {
  return this.find({ status: "active" })
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;
