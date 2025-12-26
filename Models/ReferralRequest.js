import mongoose from "mongoose";

const referralRequestSchema = new mongoose.Schema(
  {
    // Who requested the referral link
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Request details
    postTitle: {
      type: String,
      required: true,
      trim: true,
    },

    postDescription: {
      type: String,
      default: "",
      trim: true,
    },

    // Category/Type of post
    category: {
      type: String,
      default: "",
    },

    // Status of request
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Admin who responded
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Referral link provided by admin
    referralLink: {
      type: String,
      default: "",
    },

    // Admin's response notes
    responseNotes: {
      type: String,
      default: "",
    },

    // Response date
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
referralRequestSchema.index({ requestedBy: 1, status: 1 });
referralRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ReferralRequest", referralRequestSchema);
