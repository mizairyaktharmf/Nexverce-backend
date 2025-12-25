import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    // Task creator (must be admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Task assigned to (can be any user including admins)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Task details
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },

    dueDate: {
      type: Date,
      default: null,
    },

    // Optional attachments
    attachments: [
      {
        fileUrl: String,
        fileName: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Completion details
    completedAt: {
      type: Date,
      default: null,
    },

    completionNotes: {
      type: String,
      default: "",
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

export default mongoose.model("Task", taskSchema);
