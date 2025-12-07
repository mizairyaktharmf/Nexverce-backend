import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    // Two members: admin + staff (or staff + staff)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Unread count for each user inside conversation
    unread: {
      type: Map,
      of: Number,
      default: {},
    },

    // Last message preview (text or icon if image/task)
    lastMessage: {
      type: String,
      default: "",
    },

    // Who sent the last message
    lastSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// ⚡ Super important index for faster conversation lookup
conversationSchema.index({ members: 1 });

export default mongoose.model("Conversation", conversationSchema);
