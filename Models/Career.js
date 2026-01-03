import mongoose from "mongoose";

const careerSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
    },

    // Job Details
    jobLocation: {
      type: String,
      required: [true, "Job location is required"],
      trim: true,
    },
    jobType: {
      type: String,
      required: [true, "Job type is required"],
      enum: ["Full-time", "Part-time", "Contract", "Freelance", "Internship"],
      default: "Full-time",
    },

    // Salary Information
    salaryAmount: {
      type: Number,
    },
    salaryCurrency: {
      type: String,
      enum: ["USD", "AED", "LKR", "EUR", "GBP", "INR", "AUD", "CAD"],
      default: "USD",
    },
    salaryType: {
      type: String,
      enum: ["yearly", "monthly", "hourly", "range", "competitive"],
      default: "yearly",
    },

    // Featured Image
    image: {
      type: String,
      default: "",
    },

    // Content Blocks (using block editor)
    contentBlocks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // Status & Publishing
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
    publishedAt: {
      type: Date,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
careerSchema.index({ slug: 1 });
careerSchema.index({ status: 1 });
careerSchema.index({ department: 1 });

export default mongoose.model("Career", careerSchema);
