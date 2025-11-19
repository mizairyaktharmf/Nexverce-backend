import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["published", "draft", "scheduled", "update", "delete", "info"],
      default: "info",
    },
    read: { type: Boolean, default: false },

    // Store actual user performing action
    user: {
      type: String, // e.g. "Faizar (admin)"
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
