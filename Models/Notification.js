import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Notification message shown in UI
    message: {
      type: String,
      required: true,
    },

    // Action type
    type: {
      type: String,
      enum: [
        "published",
        "draft",
        "scheduled",
        "update",
        "delete",
        "profile-update", // only for sender
        "info",
      ],
      default: "info",
    },

    // Who should receive the notification?
    recipientType: {
      type: String,
      enum: ["all", "specific"],
      default: "all",
    },

    // If recipientType = "specific", only this user sees it
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // If notification is deleted only for specific users (NOT global)
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Users who have already opened/seen this notification
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Who performed the action?
    performedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String },
      role: { type: String }, // admin or staff
      required: true,
    },

    // Which post/blog is affected
    target: {
      id: { type: String },
      title: { type: String },
      model: { type: String }, // "Product" or "Blog"
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);