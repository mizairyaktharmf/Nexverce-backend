import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: [true, "Post ID is required"],
      index: true
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"]
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"]
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved" // Auto-approve comments (can be changed to "pending" for manual moderation)
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
commentSchema.index({ postId: 1, status: 1, createdAt: -1 });
commentSchema.index({ email: 1 });
commentSchema.index({ status: 1 });

export default mongoose.model("Comment", commentSchema);
