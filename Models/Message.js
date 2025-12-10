import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // text / image / task / file
    type: {
      type: String,
      enum: ["text", "image", "task", "file"],
      default: "text",
    },

    // Text message
    text: {
      type: String,
      default: "",
    },

    // Image message
    imageUrl: {
      type: String,
      default: "",
    },

    // File message
    fileUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },

    // Task-specific fields
    taskTitle: {
      type: String,
      default: "",
    },
    taskDescription: {
      type: String,
      default: "",
    },
    taskPriority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    taskStatus: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    taskDueDate: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Read status
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // Reactions (for future enhancement)
    reactions: {
      type: Map,
      of: [mongoose.Schema.Types.ObjectId],
      default: {},
    },
  },
  { timestamps: true }
);

// Index for faster chat message loading
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ assignedTo: 1, taskStatus: 1 });

export default mongoose.model("Message", messageSchema);
