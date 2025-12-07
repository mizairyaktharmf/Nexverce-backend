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

    // text / image / task
    type: {
      type: String,
      enum: ["text", "image", "task"],
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
    }
  },
  { timestamps: true }
);

// Index for faster chat message loading
messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);
